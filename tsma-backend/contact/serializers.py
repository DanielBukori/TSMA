from rest_framework import serializers

from .models import ContactInfo, ContactMessage


class ContactInfoSerializer(serializers.ModelSerializer):
    """
    Public: taarifa za mawasiliano + viungo VILIVYO TAYARI kubofywa
    (clickable) — frontend inahitaji tu kuweka thamani hizi moja kwa moja
    kwenye <a href="...">, bila usindikaji wowote wa ziada.
    """

    phone_call_link = serializers.CharField(read_only=True)
    phone_secondary_call_link = serializers.CharField(read_only=True)
    whatsapp_link = serializers.CharField(read_only=True)
    email_mailto_link = serializers.CharField(read_only=True)
    email_secondary_mailto_link = serializers.CharField(read_only=True)
    google_maps_link = serializers.CharField(read_only=True)

    class Meta:
        model = ContactInfo
        fields = (
            "organization_name",
            "phone_number",
            "phone_call_link",
            "phone_number_secondary",
            "phone_secondary_call_link",
            "whatsapp_number",
            "whatsapp_link",
            "email",
            "email_mailto_link",
            "email_secondary",
            "email_secondary_mailto_link",
            "physical_address",
            "postal_address",
            "latitude",
            "longitude",
            "google_maps_link",
            "facebook_url",
            "twitter_x_url",
            "instagram_url",
            "linkedin_url",
            "youtube_url",
            "tiktok_url",
        )


class AdminContactInfoSerializer(serializers.ModelSerializer):
    """Kwa Super Admin/Board Admin kuhariri taarifa za mawasiliano."""

    class Meta:
        model = ContactInfo
        fields = (
            "id",
            "organization_name",
            "phone_number",
            "phone_number_secondary",
            "whatsapp_number",
            "whatsapp_default_message",
            "email",
            "email_secondary",
            "physical_address",
            "postal_address",
            "latitude",
            "longitude",
            "facebook_url",
            "twitter_x_url",
            "instagram_url",
            "linkedin_url",
            "youtube_url",
            "tiktok_url",
            "is_active",
            "updated_at",
        )
        read_only_fields = ("id", "updated_at")


class ContactMessageCreateSerializer(serializers.ModelSerializer):
    """Public: fomu ya mawasiliano (contact form) kwenye tovuti."""

    class Meta:
        model = ContactMessage
        fields = ("full_name", "email", "phone_number", "subject", "message")


class AdminContactMessageSerializer(serializers.ModelSerializer):
    """Kwa admin kuona/kusimamia ujumbe uliotumwa, ikiwa na viungo vya haraka."""

    sender_mailto_link = serializers.CharField(read_only=True)
    sender_call_link = serializers.CharField(read_only=True)

    class Meta:
        model = ContactMessage
        fields = (
            "id",
            "full_name",
            "email",
            "sender_mailto_link",
            "phone_number",
            "sender_call_link",
            "subject",
            "message",
            "is_read",
            "is_replied",
            "submitted_at",
        )
        read_only_fields = (
            "id",
            "full_name",
            "email",
            "phone_number",
            "subject",
            "message",
            "submitted_at",
        )
