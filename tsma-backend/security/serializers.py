from rest_framework import serializers

from .models import BlockedIP, PendingApprovalAction, SecurityEvent


class LoginStep1Serializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()


class LoginStep2Serializer(serializers.Serializer):
    pre_2fa_token = serializers.CharField()
    totp_code = serializers.CharField(min_length=6, max_length=6)


class ConfirmTotpSetupSerializer(serializers.Serializer):
    pre_2fa_token = serializers.CharField()
    totp_code = serializers.CharField(min_length=6, max_length=6)


class SecurityEventSerializer(serializers.ModelSerializer):
    event_type_display = serializers.CharField(source="get_event_type_display", read_only=True)

    class Meta:
        model = SecurityEvent
        fields = (
            "id", "event_type", "event_type_display", "severity", "ip_address", "path", "description",
            "metadata", "auto_action_taken", "is_reviewed", "created_at",
        )
        read_only_fields = fields


class BlockedIPSerializer(serializers.ModelSerializer):
    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = BlockedIP
        fields = (
            "id", "ip_address", "reason", "is_permanent", "blocked_until",
            "blocked_by_system", "is_active", "created_at",
        )
        read_only_fields = ("id", "created_at")


class PendingApprovalActionSerializer(serializers.ModelSerializer):
    related_event = SecurityEventSerializer(read_only=True)
    action_type_display = serializers.CharField(source="get_action_type_display", read_only=True)

    class Meta:
        model = PendingApprovalAction
        fields = (
            "id", "action_type", "action_type_display", "related_event", "target_description",
            "reason", "status", "decided_at", "created_at",
        )
        read_only_fields = fields


class ManualBlockSerializer(serializers.Serializer):
    """Operator anazuia IP kwa mkono (kutoka dashibodi)."""

    ip_address = serializers.IPAddressField()
    reason = serializers.CharField(max_length=200)
    duration_hours = serializers.IntegerField(min_value=1, max_value=720, default=24)
    permanent = serializers.BooleanField(default=False)


class ApprovalDecisionSerializer(serializers.Serializer):
    approve = serializers.BooleanField()
    notes = serializers.CharField(required=False, allow_blank=True)
