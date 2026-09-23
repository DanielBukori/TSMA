from rest_framework import generics
from rest_framework.permissions import AllowAny

from accounts.permissions import IsBoardAdmin

from .models import BoardMember
from .serializers import (
    AdminBoardMemberSerializer,
    BoardMemberListSerializer,
    BoardMemberSerializer,
)


class BoardMemberListView(generics.ListAPIView):
    """GET /api/board/ - Orodha ya wanabodi wote wanaotumika sasa (public)."""

    serializer_class = BoardMemberListSerializer
    permission_classes = [AllowAny]
    queryset = BoardMember.objects.filter(is_active=True)


class FoundersListView(generics.ListAPIView):
    """GET /api/board/founders/ - Sehemu maalum ya waanzilishi (public)."""

    serializer_class = BoardMemberListSerializer
    permission_classes = [AllowAny]
    queryset = BoardMember.objects.filter(is_founder=True, is_active=True)


class BoardMemberDetailView(generics.RetrieveAPIView):
    """GET /api/board/<id>/ - Wasifu kamili wa mjumbe mmoja (kwa modal/expand)."""

    serializer_class = BoardMemberSerializer
    permission_classes = [AllowAny]
    queryset = BoardMember.objects.filter(is_active=True)


class AdminBoardMemberListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/board/admin/ - Board/Super Admin: ona wote (hata wasio-active), ongeza mpya."""

    serializer_class = AdminBoardMemberSerializer
    permission_classes = [IsBoardAdmin]
    queryset = BoardMember.objects.all()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class AdminBoardMemberDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/board/admin/<id>/ - Hariri/futa mjumbe."""

    serializer_class = AdminBoardMemberSerializer
    permission_classes = [IsBoardAdmin]
    queryset = BoardMember.objects.all()
