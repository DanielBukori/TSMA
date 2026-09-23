from django import forms
from django.contrib import admin
from django.contrib.admin.widgets import AdminTextInputWidget

from .models import (
    BlockedIP,
    PendingApprovalAction,
    SecurityAdminSession,
    SecurityAdminUser,
    SecurityEvent,
)


@admin.register(SecurityEvent)
class SecurityEventAdmin(admin.ModelAdmin):
    list_display = ("event_type", "severity", "ip_address", "auto_action_taken", "is_reviewed", "created_at")
    list_filter = ("severity", "event_type", "is_reviewed")
    search_fields = ("ip_address", "description", "path")
    readonly_fields = (
        "id", "event_type", "severity", "ip_address", "user", "path",
        "description", "metadata", "auto_action_taken", "created_at",
    )
    ordering = ("-created_at",)

    actions = ["mark_reviewed"]

    @admin.action(description="Weka kama zimeangaliwa (reviewed)")
    def mark_reviewed(self, request, queryset):
        for event in queryset:
            event.mark_reviewed(request.user)


@admin.register(BlockedIP)
class BlockedIPAdmin(admin.ModelAdmin):
    list_display = ("ip_address", "is_permanent", "blocked_until", "blocked_by_system", "created_at")
    list_filter = ("is_permanent", "blocked_by_system")
    search_fields = ("ip_address", "reason")


@admin.register(PendingApprovalAction)
class PendingApprovalActionAdmin(admin.ModelAdmin):
    """
    Admin anaweza kuidhinisha/kukataa hapa PIA (ziada ya security
    dashboard yenye 2FA) — muhimu kama mvamizi anaishambulia dashibodi
    ya usalama yenyewe, Django Admin (yenye ulinzi wake — django-axes,
    n.k.) inabaki njia mbadala.
    """

    list_display = ("action_type", "target_description", "status", "created_at", "decided_at")
    list_filter = ("status", "action_type")
    readonly_fields = ("id", "action_type", "related_event", "target_description", "reason", "created_at")


class SecurityAdminUserForm(forms.ModelForm):
    """Fomu maalum yenye field ya 'raw_password' (haihifadhiwi wazi, inapigwa hash kabla ya kuhifadhiwa)."""

    raw_password = forms.CharField(
        required=False,
        widget=AdminTextInputWidget(attrs={"type": "password"}),
        help_text="Weka kuunda au kubadili password ya operator huyu.",
    )

    class Meta:
        model = SecurityAdminUser
        fields = (
            "email", "full_name", "is_active", "is_superuser_operator",
            "totp_confirmed", "raw_password",
        )


@admin.register(SecurityAdminUser)
class SecurityAdminUserAdmin(admin.ModelAdmin):
    form = SecurityAdminUserForm
    list_display = ("email", "full_name", "is_active", "totp_confirmed", "is_superuser_operator", "last_login_at")
    list_filter = ("is_active", "totp_confirmed", "is_superuser_operator")
    readonly_fields = ("failed_login_attempts", "locked_until", "last_login_at", "last_login_ip")

    def save_model(self, request, obj, form, change):
        raw_password = form.cleaned_data.get("raw_password")
        if raw_password:
            obj.set_password(raw_password)
        elif not change:
            # Akaunti mpya bila password iliyowekwa — zuia kutengeneza
            # akaunti isiyoweza kuingia kimya kimya.
            raise forms.ValidationError("Weka password kwa operator mpya.")
        super().save_model(request, obj, form, change)


@admin.register(SecurityAdminSession)
class SecurityAdminSessionAdmin(admin.ModelAdmin):
    list_display = ("operator", "ip_address", "created_at", "expires_at", "revoked")
    readonly_fields = ("id", "operator", "token_hash", "ip_address", "created_at", "expires_at")
    list_filter = ("revoked",)
