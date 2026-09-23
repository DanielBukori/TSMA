from django.urls import path

from .views import (
    AdminContactInfoView,
    AdminContactMessageDetailView,
    AdminContactMessageListView,
    ContactInfoView,
    ContactMessageCreateView,
)

app_name = "contact"

urlpatterns = [
    # Public
    path("info/", ContactInfoView.as_view(), name="info"),
    path("message/", ContactMessageCreateView.as_view(), name="message_create"),
    # Admin (Board/Super Admin)
    path("admin/info/", AdminContactInfoView.as_view(), name="admin_info"),
    path(
        "admin/messages/",
        AdminContactMessageListView.as_view(),
        name="admin_messages_list",
    ),
    path(
        "admin/messages/<int:pk>/",
        AdminContactMessageDetailView.as_view(),
        name="admin_message_detail",
    ),
]
