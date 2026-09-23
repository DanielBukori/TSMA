from django.urls import path

from .views import (
    AboutContentView,
    AdminAboutContentView,
    AdminCoreValueDetailView,
    AdminCoreValueListCreateView,
    AdminMilestoneDetailView,
    AdminMilestoneListCreateView,
    AdminSiteSettingsView,
    SiteBackgroundImagesView,
    SiteSettingsView,
)

app_name = "sitecontent"

urlpatterns = [
    path("settings/", SiteSettingsView.as_view(), name="settings"),
    path("admin/settings/", AdminSiteSettingsView.as_view(), name="admin_settings"),
    path("backgrounds/", SiteBackgroundImagesView.as_view(), name="backgrounds"),
    path("about/", AboutContentView.as_view(), name="about"),
    path("admin/about/", AdminAboutContentView.as_view(), name="admin_about"),
    path("admin/values/", AdminCoreValueListCreateView.as_view(), name="admin_values"),
    path(
        "admin/values/<int:pk>/",
        AdminCoreValueDetailView.as_view(),
        name="admin_values_detail",
    ),
    path("admin/milestones/", AdminMilestoneListCreateView.as_view(), name="admin_milestones"),
    path(
        "admin/milestones/<int:pk>/",
        AdminMilestoneDetailView.as_view(),
        name="admin_milestones_detail",
    ),
]
