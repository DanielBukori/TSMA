import logging

from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


from accounts.permissions import IsBoardAdmin, IsContentEditor
from payments.gateways.base import GatewayError
from payments.services import build_payment_response

from .models import (
    AbstractSubmission,
    Publication,
    PublicationAccessType,
    PublicationCategory,
    PublicationCommissionSettings,
    PublicationPurchase,
)
from .serializers import (
    AbstractSubmissionCreateSerializer,
    AbstractSubmissionSerializer,
    AdminAbstractSubmissionSerializer,
    AdminPublicationCommissionSettingsSerializer,
    AdminPublicationPurchaseSerializer,
    AdminPublicationSerializer,
    PublicationCategorySerializer,
    PublicationDetailSerializer,
    PublicationListSerializer,
    PublicationPurchaseInitiateSerializer,
    PublicationPurchaseSerializer,
)
from .services.purchase import initiate_publication_purchase

logger = logging.getLogger(__name__)


class PublicationCategoryListView(generics.ListAPIView):
    """GET /api/publications/categories/ - Orodha ya kategoria (public)."""

    serializer_class = PublicationCategorySerializer
    permission_classes = [AllowAny]
    queryset = PublicationCategory.objects.all()


class PublicationListView(generics.ListAPIView):
    """
    GET /api/publications/
    Query params (zote hiari):
      - q=<neno>, category=<slug>, author=<jina>, year=<YYYY>
      - access_type=free|member_only|paid
    """

    serializer_class = PublicationListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = Publication.objects.filter(is_published=True).select_related("category")

        q = self.request.query_params.get("q")
        if q:
            queryset = queryset.filter(
                Q(title__icontains=q) | Q(authors__icontains=q) | Q(abstract__icontains=q)
            )

        category_slug = self.request.query_params.get("category")
        if category_slug:
            queryset = queryset.filter(category__slug=category_slug)

        author = self.request.query_params.get("author")
        if author:
            queryset = queryset.filter(authors__icontains=author)

        year = self.request.query_params.get("year")
        if year and year.isdigit():
            queryset = queryset.filter(publication_year=int(year))

        access_type = self.request.query_params.get("access_type")
        if access_type in dict(PublicationAccessType.choices):
            queryset = queryset.filter(access_type=access_type)

        return queryset


class PublicationDetailView(generics.RetrieveAPIView):
    serializer_class = PublicationDetailSerializer
    permission_classes = [AllowAny]
    lookup_field = "slug"
    queryset = Publication.objects.filter(is_published=True)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.increment_views()
        serializer = self.get_serializer(instance, context={"request": request})
        return Response(serializer.data)


class PublicationDownloadView(APIView):
    """
    GET /api/publications/<slug>/download/
    Inathibitisha ruhusa (free, member active, au amelipia) KISHA
    inatuma faili LENYEWE moja kwa moja kupitia Django (siyo URL ya
    moja kwa moja ya /media/) — ili ukaguzi wa ruhusa ufanyike KILA
    wakati mtu anapopakua, hata kama storage ya media itakuwa imewekwa
    vibaya kuwa 'public' upande wa nginx/web server.

    MUHIMU kwa production: kwa PDF za PAID hasa, storage bora zaidi ni
    private object storage (S3 na signed URLs zenye muda mfupi, au
    X-Accel-Redirect/X-Sendfile) badala ya MEDIA_ROOT ya kawaida —
    endpoint hii pekee haiwezi kuzuia mtu anayejua path halisi ya faili
    kama nginx yenyewe inahudumia /media/ moja kwa moja bila kupitia
    Django. Angalia SETUP_PUBLICATIONS_PAID.md.
    """

    permission_classes = [AllowAny]

    def get(self, request, slug):
        publication = get_object_or_404(Publication, slug=slug, is_published=True)

        if not publication.is_accessible_by(request.user):
            if publication.access_type == PublicationAccessType.PAID:
                detail = (
                    "Chapisho hili linahitaji kununuliwa kwanza. Tumia "
                    "/api/publications/<slug>/purchase/."
                )
            else:
                detail = (
                    "Chapisho hili ni kwa wanachama pekee. Tafadhali jiunge au "
                    "ingia kwenye akaunti yako ya uanachama."
                )
            return Response({"detail": detail}, status=status.HTTP_403_FORBIDDEN)

        if not publication.file:
            return Response(
                {"detail": "Faili la chapisho hili halipatikani."},
                status=status.HTTP_404_NOT_FOUND,
            )

        from django.http import FileResponse

        try:
            file_handle = publication.file.open("rb")
        except FileNotFoundError:
            # Sababu ya kawaida: faili lilipakiwa kwenye disk ya Render (ya muda) na
            # likafutwa Render ilipoanza upya. Suluhisho: Cloudinary (au disk ya VPS)
            # kisha pakia PDF tena kupitia Django Admin.
            logger.error("PDF ya chapisho '%s' haipo kwenye storage: %s", slug, publication.file.name)
            return Response(
                {
                    "detail": "Faili la chapisho hili halikupatikana kwenye seva. "
                    "Tafadhali wasiliana na TSMA ili lipakiwe tena.",
                    "code": "file_missing",
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception:
            # Storage ya nje (mfano Cloudinary) ikikataa/kushindwa - usirudishe 500 tupu.
            logger.exception("Imeshindwa kufungua PDF ya chapisho '%s'", slug)
            return Response(
                {
                    "detail": "Imeshindikana kupata faili kutoka kwenye hifadhi. "
                    "Jaribu tena baadaye au wasiliana na TSMA.",
                    "code": "storage_error",
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        # Hesabu upakuaji BAADA ya faili kufunguka (si kabla - zamani ulihesabiwa hata ukishindwa)
        publication.increment_downloads()

        return FileResponse(
            file_handle,
            as_attachment=True,
            filename=publication.file.name.split("/")[-1],
            content_type="application/pdf",
        )


class PublicationPurchaseInitiateView(APIView):
    """
    POST /api/publications/<slug>/purchase/
    Anzisha ununuzi wa chapisho la PAID — mtu YEYOTE aliye-login (hata
    asiye mwanachama) anaweza kununua.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, slug):
        publication = get_object_or_404(
            Publication, slug=slug, is_published=True, access_type=PublicationAccessType.PAID
        )

        if publication.purchases.filter(buyer=request.user, status="completed").exists():
            return Response(
                {"detail": "Tayari umeshanunua chapisho hili."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = PublicationPurchaseInitiateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            purchase, txn, checkout_info = initiate_publication_purchase(
                user=request.user,
                publication=publication,
                phone_number=data.get("phone_number", ""),
                gateway=data["gateway"],
                payment_method=data["payment_method"],
            )
        except GatewayError as exc:
            return Response(
                {"detail": f"Imeshindikana kuanzisha malipo: {exc}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(
            {
                "purchase": PublicationPurchaseSerializer(purchase).data,
                "payment": build_payment_response(txn, checkout_info),
            },
            status=status.HTTP_201_CREATED,
        )


class MyPurchasesView(generics.ListAPIView):
    """GET /api/publications/my-purchases/ - Machapisho niliyoyanunua."""

    serializer_class = PublicationPurchaseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return PublicationPurchase.objects.filter(buyer=self.request.user, status="completed")


class AdminPublicationListCreateView(generics.ListCreateAPIView):
    serializer_class = AdminPublicationSerializer
    permission_classes = [IsContentEditor]
    queryset = Publication.objects.all().order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)


class AdminPublicationDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AdminPublicationSerializer
    permission_classes = [IsContentEditor]
    queryset = Publication.objects.all()


class AdminCommissionSettingsView(generics.RetrieveUpdateAPIView):
    """
    GET/PATCH /api/publications/admin/commission-settings/
    Board/Super Admin: weka asilimia ya TSMA (commission) inayotumika kwa
    machapisho YOTE ya PAID.
    """

    serializer_class = AdminPublicationCommissionSettingsSerializer
    permission_classes = [IsBoardAdmin]

    def get_object(self):
        return PublicationCommissionSettings.load()


class AdminPublicationPurchaseListView(generics.ListAPIView):
    """
    GET /api/publications/admin/purchases/
    Board/Super Admin: orodha ya mauzo yote (support: ?payout_status=failed
    kuona payouts zilizoshindwa zinazohitaji kushughulikiwa kwa mkono).
    """

    serializer_class = AdminPublicationPurchaseSerializer
    permission_classes = [IsBoardAdmin]

    def get_queryset(self):
        queryset = PublicationPurchase.objects.all().select_related("publication", "buyer")
        payout_status = self.request.query_params.get("payout_status")
        if payout_status:
            queryset = queryset.filter(payout_status=payout_status)
        return queryset


class AbstractSubmissionCreateView(generics.CreateAPIView):
    serializer_class = AbstractSubmissionCreateSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(submitted_by=self.request.user)


class MyAbstractSubmissionsView(generics.ListAPIView):
    serializer_class = AbstractSubmissionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return AbstractSubmission.objects.filter(submitted_by=self.request.user)


class AdminAbstractSubmissionListView(generics.ListAPIView):
    serializer_class = AdminAbstractSubmissionSerializer
    permission_classes = [IsBoardAdmin]

    def get_queryset(self):
        queryset = AbstractSubmission.objects.all()
        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset


class AdminAbstractSubmissionDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = AdminAbstractSubmissionSerializer
    permission_classes = [IsBoardAdmin]
    queryset = AbstractSubmission.objects.all()

    def perform_update(self, serializer):
        serializer.save(reviewed_by=self.request.user)
