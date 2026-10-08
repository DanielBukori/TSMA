from django.urls import path

from .views import (
    BlockedIPListView,
    ConfirmTotpSetupView,
    DecideApprovalView,
    LoginStep1View,
    LoginStep2View,
    LogoutView,
    MarkEventReviewedView,
    PendingApprovalListView,
    SecurityDashboardSummaryView,
    SecurityEventListView,
    UnblockIPView,
)

app_name = "security"

urlpatterns = [
    # Auth (tofauti kabisa na /api/auth/)
    path("auth/login/step1/", LoginStep1View.as_view(), name="login_step1"),
    path("auth/login/step2/", LoginStep2View.as_view(), name="login_step2"),
    path("auth/setup-totp/confirm/", ConfirmTotpSetupView.as_view(), name="setup_totp_confirm"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),

    # Dashboard
    path("summary/", SecurityDashboardSummaryView.as_view(), name="summary"),
    path("events/", SecurityEventListView.as_view(), name="events"),
    path("events/<uuid:pk>/review/", MarkEventReviewedView.as_view(), name="event_review"),
    path("blocked-ips/", BlockedIPListView.as_view(), name="blocked_ips"),
    path("blocked-ips/<int:pk>/unblock/", UnblockIPView.as_view(), name="unblock_ip"),
    path("pending-actions/", PendingApprovalListView.as_view(), name="pending_actions"),
    path("pending-actions/<uuid:pk>/decide/", DecideApprovalView.as_view(), name="decide_action"),
]
