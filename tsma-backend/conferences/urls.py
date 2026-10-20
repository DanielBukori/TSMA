from django.urls import path

from .views import (
    AdminConferenceDayDetailView,
    AdminConferenceMemoryDetailView,
    AdminConferenceMemoryListCreateView,
    AdminConferenceDayListCreateView,
    AdminConferenceDetailView,
    AdminConferenceListCreateView,
    AdminConferenceSessionDetailView,
    AdminConferenceSessionListCreateView,
    AdminConferenceTicketTypeDetailView,
    AdminConferenceTicketTypeListCreateView,
    BulkRegistrationView,
    CheckInView,
    ConferenceAnalyticsView,
    ConferenceDetailView,
    ConferenceListView,
    ConferenceMemoryListView,
    MyConferenceRegistrationsView,
    SelfRegistrationView,
)

app_name = "conferences"

urlpatterns = [
    # Public
    path("", ConferenceListView.as_view(), name="list"),
    path("memories/", ConferenceMemoryListView.as_view(), name="memories"),
    path("my-registrations/", MyConferenceRegistrationsView.as_view(), name="my_registrations"),
    path("check-in/", CheckInView.as_view(), name="check_in"),
    # Admin — mkutano/siku/vikao/tiketi
    path("admin/", AdminConferenceListCreateView.as_view(), name="admin_list_create"),
    path("admin/memories/", AdminConferenceMemoryListCreateView.as_view(), name="admin_memories_list_create"),
    path("admin/memories/<int:pk>/", AdminConferenceMemoryDetailView.as_view(), name="admin_memories_detail"),
    path("admin/<int:pk>/", AdminConferenceDetailView.as_view(), name="admin_detail"),
    path("admin/days/", AdminConferenceDayListCreateView.as_view(), name="admin_days_list_create"),
    path(
        "admin/days/<int:pk>/",
        AdminConferenceDayDetailView.as_view(),
        name="admin_days_detail",
    ),
    path(
        "admin/sessions/",
        AdminConferenceSessionListCreateView.as_view(),
        name="admin_sessions_list_create",
    ),
    path(
        "admin/sessions/<int:pk>/",
        AdminConferenceSessionDetailView.as_view(),
        name="admin_sessions_detail",
    ),
    path(
        "admin/ticket-types/",
        AdminConferenceTicketTypeListCreateView.as_view(),
        name="admin_ticket_types_list_create",
    ),
    path(
        "admin/ticket-types/<int:pk>/",
        AdminConferenceTicketTypeDetailView.as_view(),
        name="admin_ticket_types_detail",
    ),
    # Public detail/registration/analytics (zenye <slug>) - mwishoni
    path("<slug:slug>/", ConferenceDetailView.as_view(), name="detail"),
    path("<slug:slug>/register/", SelfRegistrationView.as_view(), name="register_self"),
    path(
        "<slug:slug>/register-bulk/", BulkRegistrationView.as_view(), name="register_bulk"
    ),
    path(
        "<slug:slug>/analytics/", ConferenceAnalyticsView.as_view(), name="analytics"
    ),
]
