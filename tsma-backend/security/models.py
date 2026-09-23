"""
TSMA Security Monitoring — models.

MUUNDO: app hii imejengwa KWA MAKUSUDI kujitegemea (loosely-coupled) —
haina foreign keys ngumu kwenda apps nyingine (isipokuwa User kwa hiari),
na "adapter pattern" ile ile tuliyotumia kwa payments/meeting-providers
inatumika kwa notifiers (Email/SMS/WhatsApp). Hii ni MAKUSUDI: siku
utakapotaka kuitoa (extract) app hii iwe bidhaa yake tofauti
("TSMA Guardian" au jina lolote), inaweza kuhamishwa kwa mabadiliko
madogo sana.
"""

import uuid
from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class SecuritySeverity(models.TextChoices):
    LOW = "low", _("Ndogo")
    MEDIUM = "medium", _("Wastani")
    HIGH = "high", _("Kubwa")
    CRITICAL = "critical", _("Hatari Kubwa Sana")


class SecurityEventType(models.TextChoices):
    FAILED_LOGIN = "failed_login", _("Kuingia Kushindwa")
    BRUTE_FORCE_DETECTED = "brute_force_detected", _("Mashambulizi ya Brute-Force Yamegundulika")
    ACCOUNT_LOCKED = "account_locked", _("Akaunti Imefungwa (Lockout)")
    WEBHOOK_SIGNATURE_INVALID = "webhook_signature_invalid", _("Saini ya Webhook Si Sahihi")
    WEBHOOK_AMOUNT_MISMATCH = "webhook_amount_mismatch", _("Kiasi cha Webhook Hakilingani")
    PAYOUT_FAILED = "payout_failed", _("Payout Imeshindwa")
    PAYOUT_REFERENCE_COLLISION = "payout_reference_collision", _("Mgongano wa Payout Reference")
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded", _("Kikomo cha Maombi Kimevukwa")
    SUSPICIOUS_IP_BLOCKED = "suspicious_ip_blocked", _("IP Hatari Imezuiwa Kiotomatiki")
    UNAUTHORIZED_ACCESS_ATTEMPT = "unauthorized_access_attempt", _("Jaribio la Kuingia Bila Ruhusa")
    FILE_UPLOAD_REJECTED = "file_upload_rejected", _("Faili Hatari Limekataliwa")
    OTHER = "other", _("Nyingine")


class SecurityEvent(models.Model):
    """
    Rekodi ya kila tukio la kiusalama linaloonekana kwenye mfumo. Hii
    ndiyo 'chanzo cha ukweli' kinachotumika kujenga dashboard na kutuma
    arifa. Apps nyingine (payments, accounts, n.k.) zinaita
    `security.services.log_event(...)` badala ya kuandika moja kwa moja
    kwenye model hii — hivyo apps hizo hazihitaji kujua chochote kuhusu
    muundo wa ndani wa app hii (loose coupling kwa ajili ya extraction
    ya baadaye).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    event_type = models.CharField(max_length=40, choices=SecurityEventType.choices, db_index=True)
    severity = models.CharField(
        max_length=10, choices=SecuritySeverity.choices, default=SecuritySeverity.LOW, db_index=True
    )

    ip_address = models.GenericIPAddressField(null=True, blank=True, db_index=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="security_events",
    )
    path = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    # Tukio hili lilisababisha hatua ya kiotomatiki (mfano IP ilizuiwa)?
    auto_action_taken = models.CharField(max_length=255, blank=True)

    is_reviewed = models.BooleanField(default=False)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="security_events_reviewed",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = _("Tukio la Kiusalama")
        verbose_name_plural = _("Matukio ya Kiusalama")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["event_type", "created_at"]),
            models.Index(fields=["ip_address", "created_at"]),
        ]

    def __str__(self):
        return f"[{self.severity.upper()}] {self.get_event_type_display()} — {self.created_at:%Y-%m-%d %H:%M}"

    def mark_reviewed(self, user):
        self.is_reviewed = True
        self.reviewed_by = user
        self.reviewed_at = timezone.now()
        self.save(update_fields=["is_reviewed", "reviewed_by", "reviewed_at"])


class BlockedIP(models.Model):
    """
    IP zilizozuiwa (moja kwa moja kiotomatiki, au na Admin kwa mkono).
    `is_permanent=False` (default ya auto-block) inamaanisha block hii
    itaisha muda yenyewe (self-healing — huhitaji kuizindua tena kwa
    mkono) ISIPOKUWA Admin ai-thibitishe kuwa ya kudumu (approval flow).
    """

    ip_address = models.GenericIPAddressField(unique=True)
    reason = models.CharField(max_length=255)

    is_permanent = models.BooleanField(default=False)
    blocked_until = models.DateTimeField(
        null=True, blank=True,
        help_text=_("Kwa temporary block — IP itafunguliwa yenyewe baada ya muda huu."),
    )

    blocked_by_system = models.BooleanField(
        default=True, help_text=_("True = ilizuiwa kiotomatiki na mfumo. False = Admin kwa mkono.")
    )
    approved_by = models.ForeignKey(
        "security.SecurityAdminUser", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="ip_blocks_approved",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("IP Iliyozuiwa")
        verbose_name_plural = _("IP Zilizozuiwa")
        ordering = ["-created_at"]

    def __str__(self):
        kind = "KUDUMU" if self.is_permanent else "MUDA"
        return f"{self.ip_address} ({kind}) — {self.reason}"

    @property
    def is_active(self):
        if self.is_permanent:
            return True
        if self.blocked_until is None:
            return True
        return timezone.now() < self.blocked_until


class PendingApprovalAction(models.Model):
    """
    Hatua ambayo mfumo umependekeza/umeanza KIOTOMATIKA, lakini
    inasubiri IDHINI YA BINADAMU kabla ya kuwa ya KUDUMU au kabla ya
    hatua kali zaidi kuchukuliwa — kama ulivyoomba ("izuie na ilete
    taarifa kwajili ya approval ya human kurekebisha").

    Mfano: IP imezuiwa kwa MUDA (saa 1) kiotomatiki mara moja (self-
    healing), LAKINI kama block hiyo iwe ya KUDUMU inasubiri Admin
    abonyeze "Idhinisha" hapa.
    """

    class ActionType(models.TextChoices):
        PERMANENT_IP_BLOCK = "permanent_ip_block", _("Zuia IP Kudumu")
        DISABLE_ACCOUNT = "disable_account", _("Zima Akaunti ya Mtumiaji")
        REVERSE_PAYOUT = "reverse_payout", _("Rudisha/Kagua Payout")
        OTHER = "other", _("Nyingine")

    class Status(models.TextChoices):
        PENDING = "pending", _("Inasubiri Idhini")
        APPROVED = "approved", _("Imeidhinishwa")
        REJECTED = "rejected", _("Imekataliwa")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    action_type = models.CharField(max_length=30, choices=ActionType.choices)
    related_event = models.ForeignKey(
        SecurityEvent, on_delete=models.SET_NULL, null=True, blank=True, related_name="pending_actions"
    )
    target_description = models.CharField(
        max_length=255, help_text=_("Mfano: 'IP 41.xxx.xxx.xxx' au 'Akaunti: john@example.com'")
    )
    reason = models.TextField()

    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    decided_by = models.ForeignKey(
        "security.SecurityAdminUser", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="security_actions_decided",
    )
    decided_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("Hatua Inayosubiri Idhini")
        verbose_name_plural = _("Hatua Zinazosubiri Idhini")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_action_type_display()} — {self.target_description} ({self.status})"


# ============================================================================
# SECURITY DASHBOARD — Akaunti/Login TOFAUTI KABISA na accounts.User
# ============================================================================
# Kama ulivyoomba: dashibodi ya usalama ina mfumo wake wa login SIYO
# unaotumia akaunti za kawaida za wanachama/admin wa TSMA. Hii inapunguza
# "blast radius" — hata kama akaunti za kawaida za TSMA zitavamiwa,
# mvamizi HAWEZI kufikia dashibodi ya usalama bila kuvunja mfumo huu wa
# pili (defence in depth), na 2FA ni YA LAZIMA (siyo hiari) kwa akaunti
# hizi.

class SecurityAdminUser(models.Model):
    """
    Akaunti ya 'Security Operator' — HAIRITHI django.contrib.auth.User
    wala accounts.User kwa MAKUSUDI (isolation kamili). Ina password
    yake, na 2FA (TOTP) YA LAZIMA. Hii ndiyo itakayotumika kuingia
    kwenye dashibodi ya usalama (`/api/security/auth/...`).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=200)
    password_hash = models.CharField(max_length=255)

    # --- 2FA (TOTP) — LAZIMA, siyo hiari ---
    totp_secret = models.CharField(max_length=64, blank=True)
    totp_confirmed = models.BooleanField(
        default=False,
        help_text=_("True baada ya operator kuthibitisha usanidi wa 2FA kwa mara ya kwanza."),
    )

    is_active = models.BooleanField(default=True)
    is_superuser_operator = models.BooleanField(
        default=False, help_text=_("Anaweza kuidhinisha PendingApprovalAction (block za kudumu, n.k.)")
    )

    failed_login_attempts = models.PositiveIntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)

    last_login_at = models.DateTimeField(null=True, blank=True)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("Security Operator")
        verbose_name_plural = _("Security Operators")

    def __str__(self):
        return f"{self.full_name} <{self.email}>"

    def set_password(self, raw_password):
        from django.contrib.auth.hashers import make_password

        self.password_hash = make_password(raw_password)

    def check_password(self, raw_password):
        from django.contrib.auth.hashers import check_password

        return check_password(raw_password, self.password_hash)

    @property
    def is_locked(self):
        return bool(self.locked_until and timezone.now() < self.locked_until)

    def register_failed_attempt(self):
        self.failed_login_attempts += 1
        # Funga akaunti hii MAALUM baada ya majaribio 5 (ziada ya
        # BlockedIP ya jumla) — safu ya pili ya ulinzi mahususi kwa
        # dashibodi ya usalama.
        if self.failed_login_attempts >= 5:
            self.locked_until = timezone.now() + timedelta(minutes=30)
        self.save(update_fields=["failed_login_attempts", "locked_until"])

    def register_successful_login(self, ip_address):
        self.failed_login_attempts = 0
        self.locked_until = None
        self.last_login_at = timezone.now()
        self.last_login_ip = ip_address
        self.save(
            update_fields=[
                "failed_login_attempts", "locked_until", "last_login_at", "last_login_ip",
            ]
        )


class SecurityAdminSession(models.Model):
    """
    Session token za SecurityAdminUser — TOFAUTI kabisa na JWT za
    accounts.User (simplejwt), ili kompromisi ya mfumo mmoja isiathiri
    mwingine. Angalia security/auth_tokens.py.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    operator = models.ForeignKey(
        SecurityAdminUser, on_delete=models.CASCADE, related_name="sessions"
    )
    token_hash = models.CharField(max_length=128, unique=True, db_index=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    revoked = models.BooleanField(default=False)

    class Meta:
        verbose_name = _("Security Session")
        verbose_name_plural = _("Security Sessions")

    @property
    def is_valid(self):
        return not self.revoked and timezone.now() < self.expires_at
