from django.contrib import admin

from .models import Partner, PartnerVoice


@admin.register(Partner)
class PartnerAdmin(admin.ModelAdmin):
    list_display = ("name", "website_url", "is_active", "display_order")
    list_editable = ("is_active", "display_order")
    ordering = ("display_order", "name")


@admin.register(PartnerVoice)
class PartnerVoiceAdmin(admin.ModelAdmin):
    list_display = ("speaker_name", "speaker_title", "partner", "is_published", "display_order")
    list_editable = ("is_published", "display_order")
    search_fields = ("speaker_name", "quote_sw", "quote_en")
    ordering = ("display_order", "-created_at")
