from django.contrib import admin

from .models import Partner


@admin.register(Partner)
class PartnerAdmin(admin.ModelAdmin):
    list_display = ("name", "website_url", "is_active", "display_order")
    list_editable = ("is_active", "display_order")
    ordering = ("display_order", "name")
