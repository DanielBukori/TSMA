from rest_framework import serializers

from .models import BoardMember


class BoardMemberSerializer(serializers.ModelSerializer):
    """Public: taarifa kamili za mjumbe (kwa modal/expand kwenye frontend)."""

    class Meta:
        model = BoardMember
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
            "is_founder",
            "joined_board_date",
            "display_order",
        )


class BoardMemberListSerializer(serializers.ModelSerializer):
    """Public: fields chache kwa orodha ya kadi (profile cards) - haraka zaidi."""

    class Meta:
        model = BoardMember
        fields = ("id", "full_name", "position", "photo", "is_founder", "display_order")


class AdminBoardMemberSerializer(serializers.ModelSerializer):
    """Kwa Board/Super Admin kuongeza/kuhariri wajumbe."""

    class Meta:
        model = BoardMember
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
            "is_founder",
            "is_active",
            "display_order",
            "joined_board_date",
        )
        read_only_fields = ("id",)
