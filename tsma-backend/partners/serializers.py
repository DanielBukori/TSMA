from rest_framework import serializers

from .models import Partner, PartnerVoice


class PartnerSerializer(serializers.ModelSerializer):
    """Public - kwa Home page na About page (zote mbili zinatumia hii)."""

    class Meta:
        model = Partner
        fields = ("id", "name", "logo", "website_url", "description", "display_order")


class AdminPartnerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Partner
        fields = (
            "id",
            "name",
            "logo",
            "website_url",
            "description",
            "is_active",
            "display_order",
        )


class PartnerVoiceSerializer(serializers.ModelSerializer):
    """Public — kauli zilizotangulizwa tu (sehemu hii haitajui mauzo ya maneno)."""

    partner_name = serializers.CharField(source="partner.name", read_only=True)

    class Meta:
        model = PartnerVoice
        fields = (
            "id",
            "quote_sw",
            "quote_en",
            "speaker_name",
            "speaker_title",
            "partner",
            "partner_name",
            "photo",
            "display_order",
        )


class AdminPartnerVoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = PartnerVoice
        fields = (
            "id",
            "quote_sw",
            "quote_en",
            "speaker_name",
            "speaker_title",
            "partner",
            "photo",
            "is_published",
            "display_order",
        )
