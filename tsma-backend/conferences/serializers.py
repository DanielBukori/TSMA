from django.db import transaction as db_transaction
from rest_framework import serializers

from payments.gateways.registry import available_gateways, default_gateway, gateway_requires_phone

from .models import (
    Conference,
    ConferenceDay,
    ConferenceRegistration,
    ConferenceRegistrationBatch,
    ConferenceSession,
    ConferenceTicketType,
    RegistrationBatchStatus,
)


class ConferenceSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConferenceSession
        fields = (
            "id",
            "title",
            "description",
            "session_type",
            "start_time",
            "end_time",
            "speaker_name",
            "speaker_title",
            "speaker_bio",
            "speaker_photo",
            "venue_hall",
            "display_order",
        )


class ConferenceDaySerializer(serializers.ModelSerializer):
    """Ratiba kamili ya siku moja — vikao vyote vikiwa vimepangwa kwa muda."""

    sessions = ConferenceSessionSerializer(many=True, read_only=True)

    class Meta:
        model = ConferenceDay
        fields = ("id", "day_number", "date", "title", "sessions")


class ConferenceTicketTypeSerializer(serializers.ModelSerializer):
    is_available = serializers.BooleanField(read_only=True)

    class Meta:
        model = ConferenceTicketType
        fields = (
            "id",
            "name",
            "description",
            "price",
            "currency",
            "max_quantity",
            "is_available",
        )


class ConferenceListSerializer(serializers.ModelSerializer):
    """Public: orodha ya mikutano (upcoming + historia ya iliyopita)."""

    is_past = serializers.BooleanField(read_only=True)

    class Meta:
        model = Conference
        fields = (
            "id",
            "title",
            "slug",
            "theme",
            "banner_image",
            "venue_name",
            "city",
            "country",
            "start_date",
            "end_date",
            "is_past",
        )


class ConferenceDetailSerializer(serializers.ModelSerializer):
    """Public: mkutano kamili — ajenda kamili + aina za tiketi."""

    days = ConferenceDaySerializer(many=True, read_only=True)
    ticket_types = ConferenceTicketTypeSerializer(many=True, read_only=True)
    is_past = serializers.BooleanField(read_only=True)
    is_registration_still_open = serializers.BooleanField(read_only=True)

    class Meta:
        model = Conference
        fields = (
            "id",
            "title",
            "slug",
            "description",
            "theme",
            "banner_image",
            "venue_name",
            "city",
            "country",
            "physical_address",
            "start_date",
            "end_date",
            "registration_deadline",
            "is_past",
            "is_registration_still_open",
            "days",
            "ticket_types",
        )


# ----------------------------------------------------------------------
# Registration (self na bulk)
# ----------------------------------------------------------------------

class AttendeeInputSerializer(serializers.Serializer):
    """Mshiriki mmoja ndani ya usajili (self au bulk)."""

    ticket_type_id = serializers.IntegerField()
    full_name = serializers.CharField(max_length=200)
    email = serializers.EmailField()
    phone_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    organization_name = serializers.CharField(
        max_length=255, required=False, allow_blank=True
    )


class SelfRegistrationSerializer(serializers.Serializer):
    """
    POST /api/conferences/<slug>/register/
    Usajili wa mtu mwenyewe — akaunti moja mara moja tu kwa conference hii
    (inasimamiwa na database constraint).
    """

    ticket_type_id = serializers.IntegerField()
    phone_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    gateway = serializers.ChoiceField(choices=available_gateways(), default=default_gateway)
    payment_method = serializers.ChoiceField(
        choices=["mobile_money", "card", "bank_transfer"], default="mobile_money"
    )

    def validate(self, attrs):
        # Namba ya simu inahitajika TU kwa gateway za mobile money (si Manual/PayPal).
        if gateway_requires_phone(attrs.get("gateway")) and not (attrs.get("phone_number") or "").strip():
            raise serializers.ValidationError(
                {"phone_number": "Weka namba ya simu kwa ajili ya malipo."}
            )
        return attrs


class BulkRegistrationSerializer(serializers.Serializer):
    """
    POST /api/conferences/<slug>/register-bulk/
    Taasisi/shirika linasajili watu wengi mara moja — malipo moja kwa wote.
    """

    organization_name = serializers.CharField(max_length=255)
    attendees = AttendeeInputSerializer(many=True)
    phone_number = serializers.CharField(
        max_length=20, required=False, allow_blank=True, default="",
        help_text="Namba ya simu ya kulipia (mwakilishi wa taasisi). Haihitajiki kwa Malipo ya Mkono (Manual).",
    )
    gateway = serializers.ChoiceField(choices=available_gateways(), default=default_gateway)
    payment_method = serializers.ChoiceField(
        choices=["mobile_money", "card", "bank_transfer"], default="mobile_money"
    )

    def validate(self, attrs):
        # Namba ya simu inahitajika TU kwa gateway za mobile money (si Manual/PayPal).
        if gateway_requires_phone(attrs.get("gateway")) and not (attrs.get("phone_number") or "").strip():
            raise serializers.ValidationError(
                {"phone_number": "Weka namba ya simu kwa ajili ya malipo."}
            )
        return attrs

    def validate_attendees(self, value):
        if not value:
            raise serializers.ValidationError("Weka angalau mshiriki mmoja.")
        return value


class ConferenceRegistrationSerializer(serializers.ModelSerializer):
    """Taarifa za mshiriki mmoja (kwa 'my registrations' au admin list)."""

    ticket_type_name = serializers.CharField(source="ticket_type.name", read_only=True)
    conference_title = serializers.CharField(
        source="batch.conference.title", read_only=True
    )
    conference_slug = serializers.CharField(
        source="batch.conference.slug", read_only=True
    )
    conference_end_date = serializers.DateField(
        source="batch.conference.end_date", read_only=True
    )
    batch_status = serializers.CharField(source="batch.status", read_only=True)
    is_valid_for_entry = serializers.BooleanField(read_only=True)

    class Meta:
        model = ConferenceRegistration
        fields = (
            "id",
            "conference_title",
            "conference_slug",
            "conference_end_date",
            "ticket_type_name",
            "full_name",
            "email",
            "phone_number",
            "organization_name",
            "verification_code",
            "e_receipt_image",
            "batch_status",
            "checked_in",
            "checked_in_at",
            "is_valid_for_entry",
        )
        read_only_fields = fields


class ConferenceRegistrationBatchSerializer(serializers.ModelSerializer):
    attendees = ConferenceRegistrationSerializer(many=True, read_only=True)

    class Meta:
        model = ConferenceRegistrationBatch
        fields = (
            "id",
            "conference",
            "is_self_registration",
            "organization_name",
            "total_amount",
            "currency",
            "status",
            "attendees",
            "created_at",
        )
        read_only_fields = fields


class CheckInSerializer(serializers.Serializer):
    """POST /api/conferences/check-in/ - Scan ya QR mlangoni."""

    verification_code = serializers.UUIDField(required=True)


# ----------------------------------------------------------------------
# Admin — CRUD ya mkutano, siku, vikao, tiketi
# ----------------------------------------------------------------------

class AdminConferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Conference
        fields = (
            "id",
            "title",
            "slug",
            "description",
            "theme",
            "banner_image",
            "venue_name",
            "city",
            "country",
            "physical_address",
            "start_date",
            "end_date",
            "registration_deadline",
            "is_published",
            "registration_open",
            "created_at",
        )
        read_only_fields = ("id", "slug", "created_at")


class AdminConferenceDaySerializer(serializers.ModelSerializer):
    class Meta:
        model = ConferenceDay
        fields = ("id", "conference", "day_number", "date", "title")
        read_only_fields = ("id",)


class AdminConferenceSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConferenceSession
        fields = (
            "id",
            "day",
            "title",
            "description",
            "session_type",
            "start_time",
            "end_time",
            "speaker_name",
            "speaker_title",
            "speaker_bio",
            "speaker_photo",
            "venue_hall",
            "display_order",
        )
        read_only_fields = ("id",)


class AdminConferenceTicketTypeSerializer(serializers.ModelSerializer):
    sold_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = ConferenceTicketType
        fields = (
            "id",
            "conference",
            "name",
            "description",
            "price",
            "currency",
            "max_quantity",
            "sold_count",
            "sales_start",
            "sales_end",
            "is_active",
            "display_order",
        )
        read_only_fields = ("id", "sold_count")


class ConferenceAnalyticsSerializer(serializers.Serializer):
    """GET /api/conferences/<slug>/analytics/ - Dashboard ya waandaaji."""

    total_registered = serializers.IntegerField()
    total_paid = serializers.IntegerField()
    total_checked_in = serializers.IntegerField()
    by_ticket_type = serializers.ListField()


class ConferenceMemorySerializer(serializers.ModelSerializer):
    class Meta:
        from .models import ConferenceMemory
        model = ConferenceMemory
        fields = ("id", "conference", "event_title", "description", "media_type", "image", "video_url", "display_order")
