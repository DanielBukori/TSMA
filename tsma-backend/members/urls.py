from django.urls import path

from .views import (
    AdminMembershipTierDetailView,
    AdminMembershipTierListCreateView,
    JoinMembershipView,
    MemberListView,
    MembershipTierListView,
    MyMembershipView,
    MyProfileView,
    ProfessionalDirectoryCVView,
    ProfessionalDirectoryDetailView,
    ProfessionalDirectoryListView,
    VerifyMembershipCardView,
)

app_name = "members"

urlpatterns = [
    # Public
    path("tiers/", MembershipTierListView.as_view(), name="tiers_list"),
    path(
        "verify/<uuid:verification_code>/",
        VerifyMembershipCardView.as_view(),
        name="verify_card",
    ),
    path("directory/", ProfessionalDirectoryListView.as_view(), name="directory_list"),
    path(
        "directory/<uuid:member_id>/cv/",
        ProfessionalDirectoryCVView.as_view(),
        name="directory_cv_preview",
    ),
    path(
        "directory/<uuid:member_id>/",
        ProfessionalDirectoryDetailView.as_view(),
        name="directory_detail",
    ),
    # Mwanachama (authenticated)
    path("join/", JoinMembershipView.as_view(), name="join"),
    path("me/", MyMembershipView.as_view(), name="me"),
    path("me/profile/", MyProfileView.as_view(), name="my_profile"),
    # Admin (Board/Super Admin)
    path("", MemberListView.as_view(), name="member_list"),
    path(
        "admin/tiers/",
        AdminMembershipTierListCreateView.as_view(),
        name="admin_tiers_list_create",
    ),
    path(
        "admin/tiers/<int:pk>/",
        AdminMembershipTierDetailView.as_view(),
        name="admin_tiers_detail",
    ),
]
