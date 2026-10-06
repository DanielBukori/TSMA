import mimetypes

from django.db import transaction as db_transaction
from django.db.models import Q
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsBoardAdmin, IsSuperAdmin
from payments.gateways.base import GatewayError
from payments.models import PaymentPurpose
from payments.services import initiate_payment

from .models import Member, MemberProfile, MembershipStatus, MembershipTier
from .serializers import (
    AdminMembershipTierSerializer,
    JoinMembershipSerializer,
    MemberSerializer,
    MembershipTierSerializer,
    MyProfileSerializer,
    ProfessionalDirectoryDetailSerializer,
    ProfessionalDirectoryListSerializer,
)


class MembershipTierListView(generics.ListAPIView):
    """GET /api/members/tiers/ - Orodha ya madaraja yanayopatikana (public)."""

    serializer_class = MembershipTierSerializer
    permission_classes = [AllowAny]
    queryset = MembershipTier.objects.filter(is_active=True)


class AdminMembershipTierListCreateView(generics.ListCreateAPIView):
    """
    GET/POST /api/members/admin/tiers/
    Board/Super Admin pekee wanaweza kuona orodha kamili na kuongeza daraja
    jipya la uanachama (jina, ada, maelezo) — BILA kugusa code.
    """

    serializer_class = AdminMembershipTierSerializer
    permission_classes = [IsBoardAdmin]
    queryset = MembershipTier.objects.all().order_by("display_order")


class AdminMembershipTierDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET/PATCH/DELETE /api/members/admin/tiers/<id>/
    Kuhariri ada/jina/maelezo ya daraja, au kulizima/kulifuta.
    """

    serializer_class = AdminMembershipTierSerializer
    permission_classes = [IsBoardAdmin]
    queryset = MembershipTier.objects.all()


class JoinMembershipView(APIView):
    """
    POST /api/members/join/
    Mtumiaji anachagua daraja, tunatengeneza Member (pending_payment) na
    kuanzisha malipo kupitia gateway aliyochagua (default: Selcom).
    """

    permission_classes = [IsAuthenticated]
    # multipart inahitajika kwa picha ya ID ya chuo (Student); JSON inabaki kufanya kazi.
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        serializer = JoinMembershipSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        tier = serializer.context["tier"]
        data = serializer.validated_data

        if hasattr(request.user, "membership"):
            return Response(
                {"detail": "Tayari una akaunti ya uanachama. Angalia /api/members/me/."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # USALAMA/UADILIFU: funga (lock) rows za mwaka huu kabla ya
        # kuunda Member mpya, ili maombi mawili ya wakati mmoja
        # yasipate namba ya uanachama inayofanana (race condition).
        from django.utils import timezone

        with db_transaction.atomic():
            year = timezone.now().year
            prefix = f"TSMA-{year}-"
            list(
                Member.objects.select_for_update().filter(
                    membership_number__startswith=prefix
                )
            )
            member = Member.objects.create(
                user=request.user,
                tier=tier,
                organization_name=data.get("organization_name", ""),
                student_id_image=(
                    data.get("student_id_image") if tier.slug == "student-member" else None
                ),
                status=MembershipStatus.PENDING_PAYMENT,
            )

        # Guest/tier zisizohitaji malipo (requires_payment=False) - activate moja kwa moja
        if not tier.requires_payment or tier.annual_fee == 0:
            member.activate()
            return Response(
                {
                    "member": MemberSerializer(member).data,
                    "detail": "Umejiunga na TSMA kwa mafanikio (hakuna malipo yanayohitajika).",
                },
                status=status.HTTP_201_CREATED,
            )

        try:
            txn, checkout_info = initiate_payment(
                user=request.user,
                purpose=PaymentPurpose.MEMBERSHIP,
                amount=tier.annual_fee,
                currency=tier.currency,
                gateway_code=data["gateway"],
                payment_method=data["payment_method"],
                phone_number=data["phone_number"],
                content_object=member,
                buyer_name=request.user.get_full_name(),
                buyer_email=request.user.email,
            )
        except GatewayError as exc:
            member.delete()
            return Response(
                {"detail": f"Imeshindikana kuanzisha malipo: {exc}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(
            {
                "member": MemberSerializer(member).data,
                "payment": {
                    "internal_reference": txn.internal_reference,
                    "gateway": txn.gateway,
                    "instructions": checkout_info.get("instructions"),
                    "checkout_url": checkout_info.get("checkout_url"),
                    "ussd_push_sent": checkout_info.get("ussd_push_sent"),
                    # `bank_details`/`expires_at` zinatolewa na gateway 'manual'
                    # pekee (angalia payments/gateways/manual.py) — gateway
                    # zingine zinaziacha null, frontend inatumia hilo kutambua
                    # kuonyesha kadi ya taarifa za benki badala ya spinner ya
                    # kawaida.
                    "bank_details": checkout_info.get("bank_details"),
                    "expires_at": checkout_info.get("expires_at"),
                    "confirm_deadline_hours": checkout_info.get("confirm_deadline_hours"),
                },
                "detail": "Member imeundwa. Kamilisha malipo kuwezesha uanachama.",
            },
            status=status.HTTP_201_CREATED,
        )


class MyMembershipView(generics.RetrieveAPIView):
    """GET /api/members/me/ - Wasifu wa uanachama wa mtumiaji aliye-login."""

    serializer_class = MemberSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return get_object_or_404(Member, user=self.request.user)


class MemberListView(generics.ListAPIView):
    """GET /api/members/ - Orodha ya wanachama wote (Board/Super Admin pekee)."""

    serializer_class = MemberSerializer
    permission_classes = [IsBoardAdmin]
    queryset = Member.objects.select_related("user", "tier").all()
    filterset_fields = ["status", "tier"]


class VerifyMembershipCardView(APIView):
    """
    GET /api/members/verify/<verification_code>/
    Public — inatumika pale QR ya kadi inaposcanwa, kuthibitisha uhalali.
    """

    permission_classes = [AllowAny]

    def get(self, request, verification_code):
        member = get_object_or_404(Member, card_verification_code=verification_code)
        return Response(
            {
                "valid": member.is_active_member,
                "membership_number": member.membership_number,
                "full_name": member.user.get_full_name(),
                "tier": member.tier.name,
                "status": member.status,
                "expiry_date": member.expiry_date,
            }
        )


class MyProfileView(generics.RetrieveUpdateAPIView):
    """
    GET/PATCH /api/members/me/profile/ - mwanachama anahariri profaili
    yake ya kitaaluma (CV, bio, elimu, n.k.) na anachagua kama aitoe kwa
    jamii (`is_public`, default False = siri). MemberProfile inatengenezwa
    kiotomatiki (get_or_create) mara ya kwanza mwanachama anapoifikia.
    """

    serializer_class = MyProfileSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_object(self):
        member = get_object_or_404(Member, user=self.request.user)
        profile, _created = MemberProfile.objects.get_or_create(member=member)
        return profile


class ProfessionalDirectoryListView(generics.ListAPIView):
    """
    GET /api/members/directory/ - "Professionals Directory" ya umma.
    Inaonyesha TU profaili ambazo wamiliki wamezitoa kwa jamii
    (is_public=True; default ni False/siri) - hii ni queryset-level
    filter, si hiari ya serializer, kwa hiyo profaili za faragha
    HAZIWEZI kuvuja kupitia endpoint hii kwa namna yoyote.
    """

    serializer_class = ProfessionalDirectoryListSerializer
    permission_classes = [AllowAny]
    queryset = MemberProfile.objects.filter(is_public=True).select_related(
        "member", "member__user"
    )
    filterset_fields = ["specialization"]
    search_fields = ["professional_title", "specialization", "current_organization"]


class ProfessionalDirectoryDetailView(generics.RetrieveAPIView):
    """
    GET /api/members/directory/<uuid:member_id>/ - wasifu kamili.

    Nani anaona nini:
    - Mtu yeyote (hata asiyeingia akaunti): profaili zilizotolewa kwa jamii tu.
    - Mmiliki: profaili yake mwenyewe hata kama ni siri.
    - Board Admin / Super Admin: profaili zote.
    Mtu asiyeruhusiwa akijaribu URL ya profaili ya siri anapata 404 (si 403),
    kuepuka "kuthibitisha" uwepo wake.
    """

    serializer_class = ProfessionalDirectoryDetailSerializer
    permission_classes = [AllowAny]
    lookup_field = "member_id"
    lookup_url_kwarg = "member_id"

    def get_queryset(self):
        queryset = MemberProfile.objects.select_related(
            "member", "member__user", "member__tier"
        )
        user = self.request.user
        if user.is_authenticated:
            if user.is_super_admin or user.is_board_admin:
                return queryset
            return queryset.filter(Q(is_public=True) | Q(member__user=user))
        return queryset.filter(is_public=True)


class ProfessionalDirectoryCVView(APIView):
    """Serve CV file for a member profile when access is allowed."""

    permission_classes = [AllowAny]

    def get(self, request, member_id):
        profile = get_object_or_404(
            MemberProfile.objects.select_related("member", "member__user"),
            member_id=member_id,
        )

        user = request.user
        allowed = (
            profile.cv_public
            or (user.is_authenticated and (user == profile.member.user or user.is_super_admin or user.is_board_admin))
        )
        if not allowed or not profile.cv_file:
            raise Http404

        file_handle = profile.cv_file.open("rb")
        response = FileResponse(
            file_handle,
            as_attachment=True,
            filename=profile.cv_file.name.split("/")[-1],
        )
        response["Content-Type"] = mimetypes.guess_type(profile.cv_file.name)[0] or "application/octet-stream"
        return response
