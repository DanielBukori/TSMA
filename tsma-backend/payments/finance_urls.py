from django.urls import path

from .finance_views import (
    FinanceManualSettingsView,
    FinanceSummaryView,
    FinanceTransactionConfirmView,
    FinanceTransactionListView,
    FinanceTransactionRejectView,
    FinanceTransactionReprocessView,
)

app_name = "finance"

urlpatterns = [
    path("summary/", FinanceSummaryView.as_view(), name="summary"),
    path("transactions/", FinanceTransactionListView.as_view(), name="transactions"),
    path(
        "transactions/<str:internal_reference>/confirm/",
        FinanceTransactionConfirmView.as_view(),
        name="confirm",
    ),
    path(
        "transactions/<str:internal_reference>/reject/",
        FinanceTransactionRejectView.as_view(),
        name="reject",
    ),
    path(
        "transactions/<str:internal_reference>/reprocess/",
        FinanceTransactionReprocessView.as_view(),
        name="reprocess",
    ),
    path("manual-settings/", FinanceManualSettingsView.as_view(), name="manual_settings"),
]
