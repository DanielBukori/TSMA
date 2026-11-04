from rest_framework import generics
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsContentEditor

from .models import (
    AboutContent,
    CoreValue,
    HomeStat,
    Milestone,
    PageBannerContent,
    SiteBackgroundImage,
    SiteSettings,
)
from .serializers import (
    AboutContentSerializer,
    AdminAboutContentSerializer,
    AdminCoreValueSerializer,
    AdminHomeStatSerializer,
    AdminMilestoneSerializer,
    AdminPageBannerContentSerializer,
    AdminSiteBackgroundImageSerializer,
    AdminSiteSettingsSerializer,
    HomeStatSerializer,
    PageBannerContentSerializer,
    SiteSettingsSerializer,
    SiteBackgroundImageSerializer,
)


class SiteBackgroundImagesView(generics.ListAPIView):
    """
    GET /api/content/backgrounds/ - picha zote za background (public).
    Kutumika na HeroSlideshow.jsx (Home) na PageBanner.jsx (kurasa
    zingine) - bwawa MOJA la picha kwa tovuti nzima.
    """

    serializer_class = SiteBackgroundImageSerializer
    permission_classes = [AllowAny]
    queryset = SiteBackgroundImage.objects.filter(is_active=True)


class AdminSiteBackgroundImageListCreateView(generics.ListCreateAPIView):
    """
    GET/POST /api/content/admin/backgrounds/ - Editor/Board: orodha kamili
    (pia picha zilizofichwa) na kupakia picha mpya (multipart).
    """

    serializer_class = AdminSiteBackgroundImageSerializer
    permission_classes = [IsContentEditor]
    parser_classes = [MultiPartParser, FormParser]
    queryset = SiteBackgroundImage.objects.all()
    pagination_class = None


class AdminSiteBackgroundImageDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/content/admin/backgrounds/<id>/ - hariri au ondoa picha."""

    serializer_class = AdminSiteBackgroundImageSerializer
    permission_classes = [IsContentEditor]
    parser_classes = [MultiPartParser, FormParser]
    queryset = SiteBackgroundImage.objects.all()


class SiteSettingsView(APIView):
    """
    GET /api/content/settings/ - Logo/favicon URLs (public).
    Navbar na Footer zinaita hii mara moja zikianza (angalia
    SiteSettingsContext upande wa frontend).
    """

    permission_classes = [AllowAny]

    def get(self, request):
        settings_obj = SiteSettings.load()
        data = SiteSettingsSerializer(settings_obj, context={"request": request}).data
        return Response(data)


class AdminSiteSettingsView(generics.RetrieveUpdateAPIView):
    """
    GET/PATCH /api/content/admin/settings/ - Board/Super Admin: pakia logo
    na favicon (multipart/form-data kwa sababu ni file upload).
    """

    serializer_class = AdminSiteSettingsSerializer
    permission_classes = [IsContentEditor]
    parser_classes = [MultiPartParser, FormParser]

    def get_object(self):
        return SiteSettings.load()


class AboutContentView(APIView):
    """GET /api/content/about/ - Maudhui yote ya ukurasa wa About (public)."""

    permission_classes = [AllowAny]

    def get(self, request):
        content = AboutContent.load()
        return Response(AboutContentSerializer(content).data)


class AdminAboutContentView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/content/admin/about/ - Board/Super Admin: hariri About."""

    serializer_class = AdminAboutContentSerializer
    permission_classes = [IsContentEditor]

    def get_object(self):
        return AboutContent.load()


class AdminCoreValueListCreateView(generics.ListCreateAPIView):
    serializer_class = AdminCoreValueSerializer
    permission_classes = [IsContentEditor]
    queryset = CoreValue.objects.all()


class AdminCoreValueDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AdminCoreValueSerializer
    permission_classes = [IsContentEditor]
    queryset = CoreValue.objects.all()


class AdminMilestoneListCreateView(generics.ListCreateAPIView):
    serializer_class = AdminMilestoneSerializer
    permission_classes = [IsContentEditor]
    queryset = Milestone.objects.all()


class AdminMilestoneDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AdminMilestoneSerializer
    permission_classes = [IsContentEditor]
    queryset = Milestone.objects.all()


class PageBannerContentListView(generics.ListAPIView):
    """
    GET /api/content/banners/ - maandishi ya banner ya KURASA ZOTE kwa
    wakati mmoja (public). Frontend inaita hii MARA MOJA (kwenye
    BannerContentContext) badala ya kuita kwa kila ukurasa mmoja mmoja.
    """

    serializer_class = PageBannerContentSerializer
    permission_classes = [AllowAny]
    queryset = PageBannerContent.objects.all()
    pagination_class = None


class AdminPageBannerContentListView(generics.ListAPIView):
    """GET /api/content/admin/banners/ - Board/Super Admin: orodha ya kurasa zote."""

    serializer_class = AdminPageBannerContentSerializer
    permission_classes = [IsContentEditor]
    queryset = PageBannerContent.objects.all()
    pagination_class = None


class AdminPageBannerContentDetailView(generics.RetrieveUpdateAPIView):
    """
    GET/PATCH /api/content/admin/banners/<page_key>/ - Board/Super Admin:
    hariri banner ya ukurasa mmoja. Haiwezi kuongeza/kufuta ukurasa mpya
    (orodha ya page_key ni fasta kwenye code ya frontend) - ikiwa rekodi
    haipo bado kwa page_key husika, inatengenezwa papo hapo (get_or_create)
    ili isilete 404 isiyo ya lazima.
    """

    serializer_class = AdminPageBannerContentSerializer
    permission_classes = [IsContentEditor]
    lookup_field = "page_key"

    def get_object(self):
        obj, _created = PageBannerContent.objects.get_or_create(
            page_key=self.kwargs["page_key"],
            defaults={"title_sw": "", "title_en": ""},
        )
        return obj


class HomeStatsListView(generics.ListAPIView):
    """GET /api/content/home-stats/ - takwimu za InfoBox (Home), public."""

    serializer_class = HomeStatSerializer
    permission_classes = [AllowAny]
    queryset = HomeStat.objects.all()
    pagination_class = None


class AdminHomeStatListCreateView(generics.ListCreateAPIView):
    serializer_class = AdminHomeStatSerializer
    permission_classes = [IsContentEditor]
    queryset = HomeStat.objects.all()


class AdminHomeStatDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AdminHomeStatSerializer
    permission_classes = [IsContentEditor]
    queryset = HomeStat.objects.all()
