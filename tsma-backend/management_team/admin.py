from django.contrib import admin

from .models import ManagementMember


@admin.register(ManagementMember)
class ManagementMemberAdmin(admin.ModelAdmin):
    list_display = ("full_name", "position", "is_active", "display_order", "joined_date")
    list_editable = ("display_order", "is_active")
    list_filter = ("is_active",)
    search_fields = ("full_name", "position", "email")
    ordering = ("display_order", "full_name")

    fieldsets = (
        (None, {"fields": ("full_name", "position", "photo")}),
        (
            "Wasifu",
            {"fields": ("bio", "education", "experience", "contribution")},
        ),
        ("Mawasiliano", {"fields": ("email", "linkedin_url")}),
        ("Hali", {"fields": ("is_active", "display_order", "joined_date")}),
    )

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
