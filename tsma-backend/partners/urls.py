from django.urls import path

from .views import (
    AdminPartnerDetailView,
    AdminPartnerListCreateView,
    AdminPartnerVoiceDetailView,
    AdminPartnerVoiceListCreateView,
    PartnerListView,
    PartnerVoiceListView,
)

app_name = "partners"

urlpatterns = [
    path("", PartnerListView.as_view(), name="list"),
    path("voices/", PartnerVoiceListView.as_view(), name="voices"),
    path("admin/", AdminPartnerListCreateView.as_view(), name="admin_list_create"),
    path("admin/voices/", AdminPartnerVoiceListCreateView.as_view(), name="admin_voices"),
    path("admin/voices/<int:pk>/", AdminPartnerVoiceDetailView.as_view(), name="admin_voice_detail"),
    path("admin/<int:pk>/", AdminPartnerDetailView.as_view(), name="admin_detail"),
]
