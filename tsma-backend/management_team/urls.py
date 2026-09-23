from django.urls import path

from .views import (
    AdminManagementMemberDetailView,
    AdminManagementMemberListCreateView,
    ManagementMemberDetailView,
    ManagementMemberListView,
)

app_name = "management_team"

urlpatterns = [
    # Public
    path("", ManagementMemberListView.as_view(), name="list"),
    path("<int:pk>/", ManagementMemberDetailView.as_view(), name="detail"),
    # Admin (Board/Super Admin)
    path("admin/", AdminManagementMemberListCreateView.as_view(), name="admin_list_create"),
    path("admin/<int:pk>/", AdminManagementMemberDetailView.as_view(), name="admin_detail"),
]
