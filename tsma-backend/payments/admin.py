from django.contrib import admin

from .models import PaymentTransaction


@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(admin.ModelAdmin):
    list_display = (
        "internal_reference",
        "user",
        "purpose",
        "gateway",
        "amount",
        "currency",
        "status",
        "created_at",
        "paid_at",
    )
    list_filter = ("purpose", "gateway", "status", "payment_method")
    search_fields = (
        "internal_reference",
        "gateway_order_id",
        "gateway_transaction_id",
        "user__email",
        "phone_number",
    )
    readonly_fields = (
        "id",
        "internal_reference",
        "gateway_order_id",
        "gateway_transaction_id",
        "gateway_response",
        "created_at",
        "updated_at",
        "paid_at",
    )
    ordering = ("-created_at",)
