from django.contrib import admin

from .models import BoardMember


@admin.register(BoardMember)
class BoardMemberAdmin(admin.ModelAdmin):
    list_display = (
        "full_name",
        "position",
        "is_founder",
        "is_active",
        "display_order",
        "joined_board_date",
    )
    list_editable = ("display_order", "is_active")
    list_filter = ("is_founder", "is_active")
    search_fields = ("full_name", "position", "email")
    ordering = ("display_order", "full_name")

    fieldsets = (
        (None, {"fields": ("full_name", "position", "photo")}),
        (
            "Profile",
            {"fields": ("bio", "education", "experience", "contribution")},
        ),
        ("contact", {"fields": ("email", "linkedin_url")}),
        (
            "Status",
            {
                "fields": (
                    "is_founder",
                    "is_active",
                    "display_order",
                    "joined_board_date",
                )
            },
        ),
    )

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
