from rest_framework import generics
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsBoardAdmin

from .models import AboutContent, CoreValue, Milestone, SiteBackgroundImage, SiteSettings
from .serializers import SiteBackgroundImageSerializer


class SiteBackgroundImagesView(generics.ListAPIView):
    """
    GET /api/content/backgrounds/ - picha zote za background (public).
    Kutumika na HeroSlideshow.jsx (Home) na PageBanner.jsx (kurasa
    zingine) - bwawa MOJA la picha kwa tovuti nzima.
    """

    serializer_class = SiteBackgroundImageSerializer
    permission_classes = [AllowAny]
    queryset = SiteBackgroundImage.objects.filter(is_active=True)

from .serializers import (
    AboutContentSerializer,
    AdminAboutContentSerializer,
    AdminCoreValueSerializer,
    AdminMilestoneSerializer,
    AdminSiteSettingsSerializer,
    SiteSettingsSerializer,
)


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
    permission_classes = [IsBoardAdmin]
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
    permission_classes = [IsBoardAdmin]

    def get_object(self):
        return AboutContent.load()


class AdminCoreValueListCreateView(generics.ListCreateAPIView):
    serializer_class = AdminCoreValueSerializer
    permission_classes = [IsBoardAdmin]
    queryset = CoreValue.objects.all()


class AdminCoreValueDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AdminCoreValueSerializer
    permission_classes = [IsBoardAdmin]
    queryset = CoreValue.objects.all()


class AdminMilestoneListCreateView(generics.ListCreateAPIView):
    serializer_class = AdminMilestoneSerializer
    permission_classes = [IsBoardAdmin]
    queryset = Milestone.objects.all()


class AdminMilestoneDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AdminMilestoneSerializer
    permission_classes = [IsBoardAdmin]
    queryset = Milestone.objects.all()
