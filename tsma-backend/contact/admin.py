from django.contrib import admin

from .models import ContactInfo, ContactMessage


@admin.register(ContactInfo)
class ContactInfoAdmin(admin.ModelAdmin):
    """
    Hapa ndipo Bosi/Board Admin anaweka/anahariri namba za simu, WhatsApp,
    email na mitandao ya kijamii — vitakavyoonekana kwenye tovuti kama
    viungo vinavyobofywa moja kwa moja (piga simu / WhatsApp / email).
    """

    list_display = ("organization_name", "phone_number", "whatsapp_number", "email", "is_active")
    list_editable = ("is_active",)

    fieldsets = (
        (None, {"fields": ("organization_name", "is_active")}),
        (
            "Phone na WhatsApp",
            {
                "fields": (
                    "phone_number",
                    "phone_number_secondary",
                    "whatsapp_number",
                    "whatsapp_default_message",
                ),
                "description": "Weka namba kwa muundo wa kimataifa, mfano: +255712345678",
            },
        ),
        ("Email", {"fields": ("email", "email_secondary")}),
        (
            "address",
            {"fields": ("physical_address", "postal_address", "latitude", "longitude")},
        ),
        (
            "Social media account",
            {
                "fields": (
                    "facebook_url",
                    "twitter_x_url",
                    "instagram_url",
                    "linkedin_url",
                    "youtube_url",
                    "tiktok_url",
                )
            },
        ),
    )


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ("full_name", "email", "phone_number", "subject", "is_read", "is_replied", "submitted_at")
    list_filter = ("is_read", "is_replied")
    search_fields = ("full_name", "email", "subject", "message")
    readonly_fields = ("full_name", "email", "phone_number", "subject", "message", "submitted_at")
    ordering = ("-submitted_at",)
