from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import EmailVerificationToken, PasswordResetToken, User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    ordering = ("-date_joined",)
    list_display = (
        "email",
        "first_name",
        "last_name",
        "role",
        "is_email_verified",
        "is_active",
        "date_joined",
    )
    list_filter = ("role", "is_active", "is_staff", "is_email_verified")
    search_fields = ("email", "first_name", "last_name", "phone_number")
    readonly_fields = ("id", "date_joined", "updated_at")

    fieldsets = (
        (None, {"fields": ("id", "email", "password")}),
        (
            "Taarifa Binafsi",
            {"fields": ("first_name", "last_name", "phone_number")},
        ),
        (
            "Ruhusa (Permissions)",
            {
                "fields": (
                    "role",
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "is_email_verified",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Tarehe Muhimu", {"fields": ("date_joined", "updated_at", "last_login")}),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "first_name",
                    "last_name",
                    "role",
                    "password1",
                    "password2",
                ),
            },
        ),
    )


@admin.register(EmailVerificationToken)
class EmailVerificationTokenAdmin(admin.ModelAdmin):
    list_display = ("user", "token", "created_at")
    readonly_fields = ("token", "created_at")


@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    list_display = ("user", "token", "used", "created_at")
    list_filter = ("used",)
    readonly_fields = ("token", "created_at")
