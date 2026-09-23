from rest_framework import generics
from rest_framework.permissions import AllowAny

from accounts.permissions import IsBoardAdmin

from .models import Partner
from .serializers import AdminPartnerSerializer, PartnerSerializer


class PartnerListView(generics.ListAPIView):
    """GET /api/partners/ - public, inatumiwa na Home page NA About page zote mbili."""

    serializer_class = PartnerSerializer
    permission_classes = [AllowAny]
    queryset = Partner.objects.filter(is_active=True)


class AdminPartnerListCreateView(generics.ListCreateAPIView):
    serializer_class = AdminPartnerSerializer
    permission_classes = [IsBoardAdmin]
    queryset = Partner.objects.all()


class AdminPartnerDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AdminPartnerSerializer
    permission_classes = [IsBoardAdmin]
    queryset = Partner.objects.all()
