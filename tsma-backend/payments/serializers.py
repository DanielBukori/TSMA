from rest_framework import serializers

from .fields import SelectableGatewayField
from .gateways.registry import default_gateway
from .models import ManualPaymentSettings, PaymentTransaction


class PaymentTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentTransaction
        fields = (
            "id",
            "purpose",
            "gateway",
            "payment_method",
            "amount",
            "currency",
            "internal_reference",
            "gateway_order_id",
            "status",
            "phone_number",
            "expires_at",
            "created_at",
            "paid_at",
        )
        read_only_fields = fields


class InitiateMembershipPaymentSerializer(serializers.Serializer):
    """Input ya kuanzisha malipo ya ada ya uanachama."""

    tier_id = serializers.IntegerField(required=True)
    gateway = SelectableGatewayField(max_length=20, default=default_gateway)
    payment_method = serializers.ChoiceField(
        choices=["mobile_money", "card", "bank_transfer"], default="mobile_money"
    )
    phone_number = serializers.CharField(required=False, allow_blank=True)


class PaymentStatusQuerySerializer(serializers.Serializer):
    internal_reference = serializers.CharField(required=True)


class FinanceTransactionSerializer(serializers.ModelSerializer):
    """Ledger row for the accountant dashboard (payer identified, not hidden)."""

    payer_name = serializers.CharField(source="user.get_full_name", read_only=True)
    payer_email = serializers.EmailField(source="user.email", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    purpose_display = serializers.CharField(source="get_purpose_display", read_only=True)
    can_confirm = serializers.SerializerMethodField()

    class Meta:
        model = PaymentTransaction
        fields = (
            "id",
            "internal_reference",
            "gateway_order_id",
            "gateway_transaction_id",
            "payer_name",
            "payer_email",
            "purpose",
            "purpose_display",
            "gateway",
            "payment_method",
            "phone_number",
            "amount",
            "currency",
            "status",
            "status_display",
            "can_confirm",
            "failure_reason",
            "post_processing_error",
            "expires_at",
            "created_at",
            "paid_at",
        )
        read_only_fields = fields

    def get_can_confirm(self, obj):
        return obj.gateway == "manual" and obj.status in (
            "pending",
            "processing",
            "expired",
        )


class ManualPaymentSettingsSerializer(serializers.ModelSerializer):
    """Taarifa za benki zinazopakiwa na Treasurer."""

    is_ready = serializers.BooleanField(read_only=True)

    class Meta:
        model = ManualPaymentSettings
        fields = (
            "bank_name",
            "account_name",
            "account_number",
            "swift_code",
            "confirm_phone",
            "confirm_deadline_hours",
            "extra_instructions_sw",
            "extra_instructions_en",
            "is_ready",
            "updated_at",
        )
