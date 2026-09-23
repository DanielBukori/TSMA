from rest_framework import serializers

from .models import ManagementMember


class ManagementMemberSerializer(serializers.ModelSerializer):
    """Public: taarifa kamili za mjumbe (kwa modal/expand kwenye frontend)."""

    class Meta:
        model = ManagementMember
        fields = (
            "id",
            "full_name",
            "position",
            "photo",
            "bio",
            "education",
            "experience",
            "contribution",
            "email",
            "linkedin_url",
            "joined_date",
            "display_order",
        )


class ManagementMemberListSerializer(serializers.ModelSerializer):
    """Public: fields chache kwa orodha ya kadi (profile cards) - haraka zaidi."""

    class Meta:
        model = ManagementMember
        fields = ("id", "full_name", "position", "photo", "display_order")


class AdminManagementMemberSerializer(serializers.ModelSerializer):
    """Kwa Board/Super Admin kuongeza/kuhariri wajumbe wa Management."""

    class Meta:
        model = ManagementMember
        fields = (
            "id",
            "full_name",
            "position",
            "photo",
            "bio",
            "education",
            "experience",
            "contribution",
            "email",
            "linkedin_url",
            "is_active",
            "display_order",
            "joined_date",
        )
        read_only_fields = ("id",)
