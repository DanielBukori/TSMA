from django.urls import path

from .views import (
    AdminBoardMemberDetailView,
    AdminBoardMemberListCreateView,
    BoardMemberDetailView,
    BoardMemberListView,
    FoundersListView,
)

app_name = "board"

urlpatterns = [
    # Public
    path("", BoardMemberListView.as_view(), name="list"),
    path("founders/", FoundersListView.as_view(), name="founders"),
    path("<int:pk>/", BoardMemberDetailView.as_view(), name="detail"),
    # Admin (Board/Super Admin)
    path("admin/", AdminBoardMemberListCreateView.as_view(), name="admin_list_create"),
    path("admin/<int:pk>/", AdminBoardMemberDetailView.as_view(), name="admin_detail"),
]
