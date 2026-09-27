from django.urls import path

from .views import (
    AvailableGatewaysView,
    AzamPayWebhookView,
    MyTransactionsView,
    PayPalWebhookView,
    SelcomWebhookView,
    SnippeWebhookView,
    TransactionStatusView,
)

app_name = "payments"

urlpatterns = [
    path("gateways/", AvailableGatewaysView.as_view(), name="available_gateways"),
    path("webhook/selcom/", SelcomWebhookView.as_view(), name="webhook_selcom"),
    path("webhook/azampay/", AzamPayWebhookView.as_view(), name="webhook_azampay"),
    path("webhook/paypal/", PayPalWebhookView.as_view(), name="webhook_paypal"),
    path("webhook/snippe/", SnippeWebhookView.as_view(), name="webhook_snippe"),
    path("my-transactions/", MyTransactionsView.as_view(), name="my_transactions"),
    path(
        "status/<str:internal_reference>/",
        TransactionStatusView.as_view(),
        name="transaction_status",
    ),
]
