from django.contrib import admin

from .models import (
    Conference,
    ConferenceDay,
    ConferenceRegistration,
    ConferenceRegistrationBatch,
    ConferenceSession,
    ConferenceTicketType,
)


class ConferenceTicketTypeInline(admin.TabularInline):
    model = ConferenceTicketType
    extra = 1
    fields = ("name", "price", "currency", "max_quantity", "is_active", "display_order")


class ConferenceDayInline(admin.TabularInline):
    model = ConferenceDay
    extra = 1
    fields = ("day_number", "date", "title")


@admin.register(Conference)
class ConferenceAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "start_date",
        "end_date",
        "city",
        "is_published",
        "registration_open",
    )
    list_filter = ("is_published", "registration_open")
    search_fields = ("title", "description", "city")
    prepopulated_fields = {"slug": ("title",)}
    inlines = [ConferenceDayInline, ConferenceTicketTypeInline]

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


class ConferenceSessionInline(admin.TabularInline):
    model = ConferenceSession
    extra = 1
    fields = (
        "title",
        "session_type",
        "start_time",
        "end_time",
        "speaker_name",
        "venue_hall",
        "display_order",
    )


@admin.register(ConferenceDay)
class ConferenceDayAdmin(admin.ModelAdmin):
    list_display = ("conference", "day_number", "date", "title")
    list_filter = ("conference",)
    inlines = [ConferenceSessionInline]


@admin.register(ConferenceSession)
class ConferenceSessionAdmin(admin.ModelAdmin):
    list_display = ("title", "day", "session_type", "start_time", "end_time", "speaker_name")
    list_filter = ("session_type", "day__conference")
    search_fields = ("title", "speaker_name")


@admin.register(ConferenceTicketType)
class ConferenceTicketTypeAdmin(admin.ModelAdmin):
    list_display = ("name", "conference", "price", "currency", "sold_count", "is_active")
    list_filter = ("conference", "is_active")


class ConferenceRegistrationInline(admin.TabularInline):
    model = ConferenceRegistration
    extra = 0
    readonly_fields = (
        "full_name",
        "email",
        "ticket_type",
        "verification_code",
        "checked_in",
        "checked_in_at",
    )
    can_delete = False


@admin.register(ConferenceRegistrationBatch)
class ConferenceRegistrationBatchAdmin(admin.ModelAdmin):
    list_display = (
        "conference",
        "registered_by",
        "is_self_registration",
        "organization_name",
        "total_amount",
        "status",
        "created_at",
    )
    list_filter = ("status", "is_self_registration", "conference")
    search_fields = ("registered_by__email", "organization_name")
    inlines = [ConferenceRegistrationInline]


@admin.register(ConferenceRegistration)
class ConferenceRegistrationAdmin(admin.ModelAdmin):
    list_display = (
        "full_name",
        "email",
        "batch",
        "ticket_type",
        "checked_in",
        "checked_in_at",
    )
    list_filter = ("checked_in", "ticket_type")
    search_fields = ("full_name", "email", "verification_code")
    readonly_fields = ("verification_code", "e_receipt_image")
