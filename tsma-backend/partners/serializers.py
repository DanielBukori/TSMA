from rest_framework import serializers

from .models import Partner


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
