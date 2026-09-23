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
    class Meta:
        model = SecurityEvent
        fields = (
            "id", "event_type", "severity", "ip_address", "path", "description",
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

    class Meta:
        model = PendingApprovalAction
        fields = (
            "id", "action_type", "related_event", "target_description",
            "reason", "status", "decided_at", "created_at",
        )
        read_only_fields = fields


class ApprovalDecisionSerializer(serializers.Serializer):
    approve = serializers.BooleanField()
    notes = serializers.CharField(required=False, allow_blank=True)
