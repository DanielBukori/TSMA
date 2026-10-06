from decimal import Decimal

from django.db import IntegrityError, transaction as db_transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsBoardAdmin
from payments.gateways.base import GatewayError
from payments.models import PaymentPurpose
from payments.services import build_payment_response, initiate_payment

from .models import (
    Conference,
    ConferenceDay,
    ConferenceRegistration,
    ConferenceRegistrationBatch,
    ConferenceSession,
    ConferenceTicketType,
    RegistrationBatchStatus,
)
from .serializers import (
    AdminConferenceDaySerializer,
    AdminConferenceSerializer,
    AdminConferenceSessionSerializer,
    AdminConferenceTicketTypeSerializer,
    BulkRegistrationSerializer,
    CheckInSerializer,
    ConferenceAnalyticsSerializer,
    ConferenceDetailSerializer,
    ConferenceListSerializer,
    ConferenceRegistrationBatchSerializer,
    ConferenceRegistrationSerializer,
    SelfRegistrationSerializer,
)


# ----------------------------------------------------------------------
# Public
# ----------------------------------------------------------------------

class ConferenceListView(generics.ListAPIView):
    """
    GET /api/conferences/
    Query param hiari: status=upcoming|past (default: zote, zilizochapishwa tu)
    """

    serializer_class = ConferenceListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = Conference.objects.filter(is_published=True)
        status_filter = self.request.query_params.get("status")
        today = timezone.now().date()
        if status_filter == "upcoming":
            queryset = queryset.filter(end_date__gte=today)
        elif status_filter == "past":
            queryset = queryset.filter(end_date__lt=today)
        return queryset


class ConferenceDetailView(generics.RetrieveAPIView):
    """GET /api/conferences/<slug>/ - Mkutano kamili + ajenda + tiketi."""

    serializer_class = ConferenceDetailSerializer
    permission_classes = [AllowAny]
    lookup_field = "slug"
    queryset = Conference.objects.filter(is_published=True).prefetch_related(
        "days__sessions", "ticket_types"
    )


def _build_receipt_amount(ticket_type_prices):
    return sum(ticket_type_prices, start=Decimal("0"))


class SelfRegistrationView(APIView):
    """
    POST /api/conferences/<slug>/register/
    Mtumiaji anajisajili mwenyewe — mara moja tu kwa mkutano huu.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, slug):
        conference = get_object_or_404(Conference, slug=slug, is_published=True)

        if not conference.is_registration_still_open:
            return Response(
                {"detail": "Registration of this conference is closed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = SelfRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        ticket_type = get_object_or_404(
            ConferenceTicketType, pk=data["ticket_type_id"], conference=conference
        )

        try:
            with db_transaction.atomic():
                # USALAMA: funga (lock) row ya ticket_type kabla ya
                # kuhesabu sold_count/is_available — bila hii, maombi
                # mawili ya wakati mmoja yanaweza yote kuona "tiketi 1
                # imebaki" na zote mbili zikafanikiwa (overselling).
                ticket_type = ConferenceTicketType.objects.select_for_update().get(
                    pk=ticket_type.pk
                )
                if not ticket_type.is_available:
                    return Response(
                        {"detail": "This type of ticket is no longer available/ Aina hii ya tiketi haipatikani tena."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                batch = ConferenceRegistrationBatch.objects.create(
                    conference=conference,
                    registered_by=request.user,
                    is_self_registration=True,
                    total_amount=ticket_type.price,
                    currency=ticket_type.currency,
                )
                ConferenceRegistration.objects.create(
                    batch=batch,
                    ticket_type=ticket_type,
                    full_name=request.user.get_full_name(),
                    email=request.user.email,
                    phone_number=data.get("phone_number", ""),
                )
        except IntegrityError:
            return Response(
                {"detail": "Already Registered for the conference/Tayari umeshajisajili kwenye mkutano huu."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return self._initiate_batch_payment(batch, data, request)

    @staticmethod
    def _initiate_batch_payment(batch, data, request):
        if batch.total_amount == 0:
            batch.confirm()
            return Response(
                ConferenceRegistrationBatchSerializer(batch).data,
                status=status.HTTP_201_CREATED,
            )

        try:
            txn, checkout_info = initiate_payment(
                user=request.user,
                purpose=PaymentPurpose.CONFERENCE,
                amount=batch.total_amount,
                currency=batch.currency,
                gateway_code=data["gateway"],
                payment_method=data["payment_method"],
                phone_number=data.get("phone_number"),
                content_object=batch,
                buyer_name=request.user.get_full_name(),
                buyer_email=request.user.email,
            )
        except GatewayError as exc:
            batch.delete()
            return Response(
                {"detail": f"Failed to start payments: {exc}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(
            {
                "batch": ConferenceRegistrationBatchSerializer(batch).data,
                "payment": build_payment_response(txn, checkout_info),
            },
            status=status.HTTP_201_CREATED,
        )


class BulkRegistrationView(APIView):
    """
    POST /api/conferences/<slug>/register-bulk/
    Taasisi/shirika linasajili washiriki wengi mara moja — malipo moja.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, slug):
        conference = get_object_or_404(Conference, slug=slug, is_published=True)

        if not conference.is_registration_still_open:
            return Response(
                {"detail": "Registration of this conference is closed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = BulkRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        ticket_type_ids = {a["ticket_type_id"] for a in data["attendees"]}
        ticket_types_qs = ConferenceTicketType.objects.filter(
            pk__in=ticket_type_ids, conference=conference
        )
        found_ids = set(ticket_types_qs.values_list("id", flat=True))
        missing = ticket_type_ids - found_ids
        if missing:
            raise ValidationError({"attendees": f"Invalid ticket type: {missing}"})

        # Hesabu ni tiketi ngapi za kila aina zinahitajika katika ombi hili
        # (mfano watu 3 wanataka 'Member' tiketi) ili kuzuia overselling
        # hata ndani ya ombi moja la bulk.
        requested_counts = {}
        for a in data["attendees"]:
            requested_counts[a["ticket_type_id"]] = requested_counts.get(a["ticket_type_id"], 0) + 1

        with db_transaction.atomic():
            # USALAMA: funga (lock) ticket types ZOTE zinazohusika kabla ya
            # kuhesabu nafasi zilizobaki — kuzuia race condition/overselling
            # endapo maombi mengine yanajaribu tiketi hizi hizi wakati mmoja.
            ticket_types = {
                t.id: t
                for t in ConferenceTicketType.objects.select_for_update().filter(
                    pk__in=ticket_type_ids
                )
            }

            for ticket_id, needed in requested_counts.items():
                ticket_type = ticket_types[ticket_id]
                if not ticket_type.is_active:
                    return Response(
                        {"detail": f"Ticket '{ticket_type.name}' is no longer available."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                if ticket_type.max_quantity is not None:
                    remaining = ticket_type.max_quantity - ticket_type.sold_count
                    if remaining < needed:
                        return Response(
                            {
                                "detail": (
                                    f"Ticket '{ticket_type.name}' remained {max(remaining, 0)} "
                                    f"only, but you requested {needed}."
                                )
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )

            batch = ConferenceRegistrationBatch.objects.create(
                conference=conference,
                registered_by=request.user,
                is_self_registration=False,
                organization_name=data["organization_name"],
                currency=list(ticket_types.values())[0].currency,
            )
            total = Decimal("0")
            for attendee_data in data["attendees"]:
                ticket_type = ticket_types[attendee_data["ticket_type_id"]]
                ConferenceRegistration.objects.create(
                    batch=batch,
                    ticket_type=ticket_type,
                    full_name=attendee_data["full_name"],
                    email=attendee_data["email"],
                    phone_number=attendee_data.get("phone_number", ""),
                    organization_name=data["organization_name"],
                )
                total += ticket_type.price
            batch.total_amount = total
            batch.save(update_fields=["total_amount"])

        return SelfRegistrationView._initiate_batch_payment(batch, data, request)


class MyConferenceRegistrationsView(generics.ListAPIView):
    """GET /api/conferences/my-registrations/ - Usajili wangu (batches) zote."""

    serializer_class = ConferenceRegistrationBatchSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ConferenceRegistrationBatch.objects.filter(
            registered_by=self.request.user
        ).prefetch_related("attendees")


class CheckInView(APIView):
    """
    POST /api/conferences/check-in/
    Scan ya QR mlangoni — inathibitisha malipo, inazuia kuingia mara mbili.
    Kwa staff walio na ruhusa (Board/Super Admin) tu.
    """

    permission_classes = [IsBoardAdmin]

    def post(self, request):
        serializer = CheckInSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        registration = get_object_or_404(
            ConferenceRegistration,
            verification_code=serializer.validated_data["verification_code"],
        )

        if registration.batch.status != RegistrationBatchStatus.CONFIRMED:
            return Response(
                {
                    "allowed": False,
                    "reason": "Malipo ya usajili huu hayajakamilika. Kuingia kumekataliwa.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if registration.checked_in:
            return Response(
                {
                    "allowed": False,
                    "reason": f"Tayari ameshaingia (check-in) saa {registration.checked_in_at}.",
                    "attendee": ConferenceRegistrationSerializer(registration, context={"request": request}).data,
                },
                status=status.HTTP_409_CONFLICT,
            )

        registration.perform_check_in(performed_by=request.user)
        return Response(
            {
                "allowed": True,
                "reason": "Karibu! Uingiaji umethibitishwa.",
                "attendee": ConferenceRegistrationSerializer(registration, context={"request": request}).data,
            }
        )


# ----------------------------------------------------------------------
# Admin
# ----------------------------------------------------------------------

class AdminConferenceListCreateView(generics.ListCreateAPIView):
    serializer_class = AdminConferenceSerializer
    permission_classes = [IsBoardAdmin]
    queryset = Conference.objects.all().order_by("-start_date")

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class AdminConferenceDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AdminConferenceSerializer
    permission_classes = [IsBoardAdmin]
    queryset = Conference.objects.all()


class AdminConferenceDayListCreateView(generics.ListCreateAPIView):
    serializer_class = AdminConferenceDaySerializer
    permission_classes = [IsBoardAdmin]
    queryset = ConferenceDay.objects.all()


class AdminConferenceDayDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AdminConferenceDaySerializer
    permission_classes = [IsBoardAdmin]
    queryset = ConferenceDay.objects.all()


class AdminConferenceSessionListCreateView(generics.ListCreateAPIView):
    serializer_class = AdminConferenceSessionSerializer
    permission_classes = [IsBoardAdmin]
    queryset = ConferenceSession.objects.all()


class AdminConferenceSessionDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AdminConferenceSessionSerializer
    permission_classes = [IsBoardAdmin]
    queryset = ConferenceSession.objects.all()


class AdminConferenceTicketTypeListCreateView(generics.ListCreateAPIView):
    serializer_class = AdminConferenceTicketTypeSerializer
    permission_classes = [IsBoardAdmin]
    queryset = ConferenceTicketType.objects.all()


class AdminConferenceTicketTypeDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AdminConferenceTicketTypeSerializer
    permission_classes = [IsBoardAdmin]
    queryset = ConferenceTicketType.objects.all()


class ConferenceAnalyticsView(APIView):
    """
    GET /api/conferences/<slug>/analytics/
    Dashboard ya waandaaji — idadi ya waliojisajili, waliolipa, waliofika.
    """

    permission_classes = [IsBoardAdmin]

    def get(self, request, slug):
        conference = get_object_or_404(Conference, slug=slug)

        attendees = ConferenceRegistration.objects.filter(batch__conference=conference)
        total_registered = attendees.count()
        total_paid = attendees.filter(
            batch__status=RegistrationBatchStatus.CONFIRMED
        ).count()
        total_checked_in = attendees.filter(checked_in=True).count()

        by_ticket_type = list(
            attendees.filter(batch__status=RegistrationBatchStatus.CONFIRMED)
            .values("ticket_type__name")
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        data = {
            "total_registered": total_registered,
            "total_paid": total_paid,
            "total_checked_in": total_checked_in,
            "by_ticket_type": by_ticket_type,
        }
        return Response(ConferenceAnalyticsSerializer(data).data)
