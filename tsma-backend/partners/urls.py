from django.urls import path

from .views import AdminPartnerDetailView, AdminPartnerListCreateView, PartnerListView

app_name = "partners"

urlpatterns = [
    path("", PartnerListView.as_view(), name="list"),
    path("admin/", AdminPartnerListCreateView.as_view(), name="admin_list_create"),
    path("admin/<int:pk>/", AdminPartnerDetailView.as_view(), name="admin_detail"),
]
