from rest_framework import generics
from rest_framework.permissions import AllowAny

from accounts.permissions import IsContentEditor

from .models import Partner, PartnerVoice
from .serializers import (
    AdminPartnerSerializer,
    AdminPartnerVoiceSerializer,
    PartnerSerializer,
    PartnerVoiceSerializer,
)


class PartnerListView(generics.ListAPIView):
    """GET /api/partners/ — Home and About both read this one list."""

    serializer_class = PartnerSerializer
    permission_classes = [AllowAny]
    queryset = Partner.objects.filter(is_active=True)


class AdminPartnerListCreateView(generics.ListCreateAPIView):
    serializer_class = AdminPartnerSerializer
    permission_classes = [IsContentEditor]
    queryset = Partner.objects.all()


class AdminPartnerDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AdminPartnerSerializer
    permission_classes = [IsContentEditor]
    queryset = Partner.objects.all()


class PartnerVoiceListView(generics.ListAPIView):
    """GET /api/partners/voices/ — published partner quotes only."""

    serializer_class = PartnerVoiceSerializer
    permission_classes = [AllowAny]
    queryset = PartnerVoice.objects.filter(is_published=True).select_related("partner")


class AdminPartnerVoiceListCreateView(generics.ListCreateAPIView):
    serializer_class = AdminPartnerVoiceSerializer
    permission_classes = [IsContentEditor]
    queryset = PartnerVoice.objects.select_related("partner").all()


class AdminPartnerVoiceDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AdminPartnerVoiceSerializer
    permission_classes = [IsContentEditor]
    queryset = PartnerVoice.objects.select_related("partner").all()
