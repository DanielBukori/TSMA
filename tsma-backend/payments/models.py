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

    @staticmethod
    def generate_internal_reference(prefix="TSMA"):
        return f"{prefix}-{uuid.uuid4().hex[:12].upper()}"
