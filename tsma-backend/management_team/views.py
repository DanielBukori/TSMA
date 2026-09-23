from rest_framework import generics
from rest_framework.permissions import AllowAny

from accounts.permissions import IsBoardAdmin

from .models import ManagementMember
from .serializers import (
    AdminManagementMemberSerializer,
    ManagementMemberListSerializer,
    ManagementMemberSerializer,
)


class ManagementMemberListView(generics.ListAPIView):
    """GET /api/management/ - Orodha ya wajumbe wa Management wanaotumika sasa (public)."""

    serializer_class = ManagementMemberListSerializer
    permission_classes = [AllowAny]
    queryset = ManagementMember.objects.filter(is_active=True)


class ManagementMemberDetailView(generics.RetrieveAPIView):
    """GET /api/management/<id>/ - Wasifu kamili wa mjumbe mmoja (kwa modal/expand)."""

    serializer_class = ManagementMemberSerializer
    permission_classes = [AllowAny]
    queryset = ManagementMember.objects.filter(is_active=True)


class AdminManagementMemberListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/management/admin/ - Board/Super Admin: ona wote, ongeza mpya."""

    serializer_class = AdminManagementMemberSerializer
    permission_classes = [IsBoardAdmin]
    queryset = ManagementMember.objects.all()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class AdminManagementMemberDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/management/admin/<id>/ - Hariri/futa mjumbe."""

    serializer_class = AdminManagementMemberSerializer
    permission_classes = [IsBoardAdmin]
    queryset = ManagementMember.objects.all()
