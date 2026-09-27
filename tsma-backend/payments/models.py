import uuid

from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class Gateway(models.TextChoices):
    """
    Gateway zinazotambulika na mfumo. Kuongeza gateway mpya:
    1. Ongeza chaguo hapa.
    2. Andika class mpya kwenye payments/gateways/ inayorithi PaymentGatewayBase.
    3. Isajili kwenye payments/gateways/registry.py — hakuna sehemu nyingine ya
       kubadili, mfumo mzima (views, models) haugusiki.
    """

    SELCOM = "selcom", _("Selcom")
    AZAMPAY = "azampay", _("AzamPay")
    PAYPAL = "paypal", _("PayPal")
    CLICKPESA = "clickpesa", _("ClickPesa")
    DPO_PESAPAL = "dpo_pesapal", _("DPO/Pesapal")
    FLUTTERWAVE = "flutterwave", _("Flutterwave")
    SNIPPE = "snippe", _("Snippe")
    MANUAL = "manual", _("Malipo ya Mkono (Manual/Bank Deposit)")


class PaymentPurpose(models.TextChoices):
    MEMBERSHIP = "membership", _("Ada ya Uanachama")
    CONFERENCE = "conference", _("Usajili wa Conference")
    PUBLICATION_PURCHASE = "publication_purchase", _("Ununuzi wa Chapisho")
    OTHER = "other", _("Nyingine")


class PaymentMethod(models.TextChoices):
    MOBILE_MONEY = "mobile_money", _("Simu (Mobile Money)")
    CARD = "card", _("Kadi (Debit/Credit Card)")
    BANK_TRANSFER = "bank_transfer", _("Uhamisho wa Benki")
    MANUAL = "manual", _("Manual")


class PaymentStatus(models.TextChoices):
    PENDING = "pending", _("Inasubiri")
    PROCESSING = "processing", _("Inachakatwa")
    SUCCESS = "success", _("Imefanikiwa")
    FAILED = "failed", _("Imeshindwa")
    CANCELLED = "cancelled", _("Imesitishwa")
    EXPIRED = "expired", _("Imeisha Muda")


class PaymentTransaction(models.Model):
    """
    Transaction ya malipo ya jumla — inaweza kutumika kwa ada ya uanachama,
    usajili wa conference, au kitu kingine chochote cha baadaye, kupitia
    GenericForeignKey (content_object) badala ya kuunda model ya malipo
    kwa kila moduli.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="payment_transactions",
    )

    purpose = models.CharField(max_length=20, choices=PaymentPurpose.choices)

    # Kiungo cha jumla (generic) — mfano: Member, ConferenceRegistration, n.k.
    content_type = models.ForeignKey(
        ContentType, on_delete=models.SET_NULL, null=True, blank=True
    )
    object_id = models.CharField(max_length=64, null=True, blank=True)
    content_object = GenericForeignKey("content_type", "object_id")

    gateway = models.CharField(max_length=20, choices=Gateway.choices)
    payment_method = models.CharField(
        max_length=20, choices=PaymentMethod.choices, default=PaymentMethod.MOBILE_MONEY
    )

    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default="TZS")

    # Internal order id (tunayoituma kwa gateway kama order_id yetu)
    internal_reference = models.CharField(max_length=64, unique=True, db_index=True)
    # ID/Reference inayotolewa na gateway husika
    gateway_order_id = models.CharField(max_length=128, blank=True, null=True)
    gateway_transaction_id = models.CharField(max_length=128, blank=True, null=True)

    phone_number = models.CharField(max_length=20, blank=True, null=True)

    status = models.CharField(
        max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.PENDING
    )

    # Response ghafi kutoka gateway (kwa ajili ya debugging na audit)
    gateway_response = models.JSONField(blank=True, null=True)
    failure_reason = models.CharField(max_length=255, blank=True, null=True)

    # Deadline ya kuthibitishwa — kwa sasa inatumika na gateway 'manual'
    # pekee (mtumiaji analipa nje ya mfumo, kisha anatuma ujumbe kuthibitisha
    # ndani ya muda huu). Gateway zingine (Selcom/AzamPay/PayPal) haziitumii,
    # zinabaki null. Angalia ManualGateway.create_checkout() na
    # `expire_stale_manual_payments` management command.
    expires_at = models.DateTimeField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    paid_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        verbose_name = _("Malipo (Transaction)")
        verbose_name_plural = _("Malipo (Transactions)")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "purpose"]),
            models.Index(fields=["gateway_order_id"]),
        ]

    def __str__(self):
        return f"{self.internal_reference} - {self.amount} {self.currency} ({self.status})"

    def mark_success(self, gateway_transaction_id=None, raw_response=None):
        # Ulinzi wa state machine: SUCCESS ni hali ya "mwisho" (terminal).
        # Ikiwa tayari ni SUCCESS, hii ni no-op salama (idempotent). Kamwe
        # hairuhusiwi kubadilika kutoka SUCCESS kwenda hali nyingine yoyote.
        if self.status == PaymentStatus.SUCCESS:
            return
        self.status = PaymentStatus.SUCCESS
        self.paid_at = timezone.now()
        if gateway_transaction_id:
            self.gateway_transaction_id = gateway_transaction_id
        if raw_response is not None:
            self.gateway_response = raw_response
        self.save(
            update_fields=[
                "status",
                "paid_at",
                "gateway_transaction_id",
                "gateway_response",
                "updated_at",
            ]
        )

    def mark_failed(self, reason=None, raw_response=None):
        # SUCCESS haiwezi KAMWE kubadilishwa kuwa FAILED (mfano: race
        # condition kati ya webhook na polling fallback).
        if self.status == PaymentStatus.SUCCESS:
            return
        self.status = PaymentStatus.FAILED
        self.failure_reason = reason or ""
        if raw_response is not None:
            self.gateway_response = raw_response
        self.save(
            update_fields=[
                "status",
                "failure_reason",
                "gateway_response",
                "updated_at",
            ]
        )

    def mark_expired(self):
        """
        Kwa 'manual' gateway pekee - transaction imepita deadline yake
        (expires_at) bila Admin kuithibitisha. SUCCESS bado ni hali ya
        mwisho isiyoweza kubadilika (sawa na mark_failed) - kinga dhidi
        ya race condition kati ya Admin kuthibitisha na cron ya expiry
        ikiendesha wakati mmoja.
        """
        if self.status == PaymentStatus.SUCCESS:
            return
        self.status = PaymentStatus.EXPIRED
        self.failure_reason = (
            "Muda wa masaa uliopangwa ulipita bila uthibitisho wa malipo "
            "(manual gateway)."
        )
        self.save(update_fields=["status", "failure_reason", "updated_at"])

    @staticmethod
    def generate_internal_reference(prefix="TSMA"):
        return f"{prefix}-{uuid.uuid4().hex[:12].upper()}"


class ManualPaymentSettings(models.Model):
    """
    Taarifa za akaunti ya benki (au namba ya kupokelea malipo ya mkono) —
    Admin anahariri hapa kupitia Django Admin, hazipaswi kuandikwa moja
    kwa moja (hardcoded) ndani ya ManualGateway. Singleton (rekodi moja
    tu) — angalia `load()`.
    """

    bank_name = models.CharField(_("Jina la Benki"), max_length=150)
    account_name = models.CharField(_("Jina la Akaunti"), max_length=150)
    account_number = models.CharField(_("Namba ya Akaunti"), max_length=50)
    swift_code = models.CharField(_("SWIFT/BIC Code (hiari)"), max_length=20, blank=True)

    confirm_phone = models.CharField(
        _("Namba ya Kutuma Uthibitisho (WhatsApp/SMS)"), max_length=20,
        help_text=_(
            "Namba ambayo mwanachama atatuma ujumbe (screenshot/reference) "
            "baada ya kulipa, kwa ajili ya uthibitisho."
        ),
    )
    confirm_deadline_hours = models.PositiveIntegerField(
        _("Muda wa Kuthibitisha (masaa)"), default=24,
        help_text=_("Mwanachama anapaswa kutuma ujumbe wa uthibitisho ndani ya masaa haya."),
    )

    extra_instructions_sw = models.TextField(
        _("Maelezo ya Ziada (Kiswahili) — hiari"), blank=True,
    )
    extra_instructions_en = models.TextField(
        _("Maelezo ya Ziada (Kiingereza) — hiari"), blank=True,
    )

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Taarifa za Malipo ya Mkono (Manual)")
        verbose_name_plural = _("Taarifa za Malipo ya Mkono (Manual)")

    def __str__(self):
        return f"{self.bank_name} — {self.account_number}"

    @classmethod
    def load(cls):
        obj, _created = cls.objects.get_or_create(
            pk=1,
            defaults={
                "bank_name": "[Weka jina la benki - Django Admin]",
                "account_name": "[Weka jina la akaunti - Django Admin]",
                "account_number": "[Weka namba ya akaunti - Django Admin]",
                "confirm_phone": "[Weka namba ya simu - Django Admin]",
            },
        )
        return obj
