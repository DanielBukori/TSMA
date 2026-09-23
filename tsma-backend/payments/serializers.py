from rest_framework import serializers

from .gateways.registry import available_gateways
from .models import PaymentTransaction


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
            "created_at",
            "paid_at",
        )
        read_only_fields = fields


class InitiateMembershipPaymentSerializer(serializers.Serializer):
    """Input ya kuanzisha malipo ya ada ya uanachama."""

    tier_id = serializers.IntegerField(required=True)
    gateway = serializers.ChoiceField(choices=available_gateways(), default="selcom")
    payment_method = serializers.ChoiceField(
        choices=["mobile_money", "card"], default="mobile_money"
    )
    phone_number = serializers.CharField(required=False, allow_blank=True)


class PaymentStatusQuerySerializer(serializers.Serializer):
    internal_reference = serializers.CharField(required=True)
