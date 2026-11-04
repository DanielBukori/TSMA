"""
Manual Gateway Adapter — "Malipo ya Mkono" (benki / taslimu / ofisi).

Hii SI muunganiko wa API ya nje:
1. create_checkout() inarudisha taarifa za akaunti ya benki kutoka
   ManualPaymentSettings (Admin/Editor anahariri Django Admin au
   /api/finance/manual-settings/) na deadline ya kuthibitisha (default
   masaa 24); transaction inabaki PROCESSING.
2. Mwanachama analipa kisha atuma ujumbe (WhatsApp/SMS) kwenye namba
   iliyowekwa na Admin, akiambia reference yake.
3. Treasurer (accountant) athibitishe kwenye dashibodi ya fedha (/finance)
   — njia ya Django Admin (Transactions -> "Thibitisha malipo yamepokelewa")
   bado ipo. Zote mbili zinaita mark_success() na kutuma
   payment_succeeded, kwa hiyo uanachama, risiti na kadi huwezeshwa kama
   vile gateway ya kiotomatiki ingavyofanya.
4. Deadline ikipita bila uthibitisho, `python manage.py
   expire_stale_manual_payments` (cron) inaibadilisha kuwa EXPIRED.

Gateway hii inachaguliwa kila wakati; nyingine zinaonekana tu zinapokuwa na
funguo halisi kwenye env (angalia payments/gateways/registry.py).
"""

from datetime import timedelta

from django.utils import timezone

from .base import GatewayError, PaymentGatewayBase
from payments.models import Gateway, ManualPaymentSettings


class ManualGateway(PaymentGatewayBase):
    gateway_code = Gateway.MANUAL
    requires_phone = False
    supports_redirect = False

    def create_checkout(self, transaction, **kwargs):
        settings_obj = ManualPaymentSettings.load()

        # Never show a member an account number nobody has entered yet
        # (Treasurer fills these under /finance).
        if not settings_obj.is_ready:
            raise GatewayError(
                "Taarifa za akaunti ya benki za TSMA bado hazijawekwa. "
                "Tafadhali wasiliana na TSMA."
            )

        deadline_hours = settings_obj.confirm_deadline_hours
        expires_at = timezone.now() + timedelta(hours=deadline_hours)

        bank_details = {
            "bank_name": settings_obj.bank_name,
            "account_name": settings_obj.account_name,
            "account_number": settings_obj.account_number,
            "swift_code": settings_obj.swift_code or None,
            "confirm_phone": settings_obj.confirm_phone,
            "extra_instructions_sw": settings_obj.extra_instructions_sw or None,
            "extra_instructions_en": settings_obj.extra_instructions_en or None,
        }

        # `instructions` - maandishi ya kawaida (single string, Kiswahili),
        # yanabaki kwa ajili ya sehemu za mfumo zisizojua kuhusu
        # `bank_details` iliyopangwa (mfano dashibodi ya siku zijazo,
        # SMS/email receipts). Frontend mpya (Members.jsx) inatumia
        # `bank_details` moja kwa moja kuonyesha kadi iliyopangwa vizuri.
        instructions = (
            f"Fanya malipo benki '{settings_obj.bank_name}', Akaunti: "
            f"{settings_obj.account_name} ({settings_obj.account_number}). "
            f"Tumia REFERENCE: {transaction.internal_reference}. Baada ya kulipa, "
            f"tuma ujumbe wa WhatsApp kwenye {settings_obj.confirm_phone} ukiwa "
            f"na reference hiyo (na picha ya risiti ya benki), ndani ya masaa "
            f"{deadline_hours}, ili tuthibitishe malipo yako."
        )

        return {
            "gateway_order_id": transaction.internal_reference,
            "checkout_url": None,
            "ussd_push_sent": False,
            "instructions": instructions,
            "bank_details": bank_details,
            "expires_at": expires_at,
            "confirm_deadline_hours": deadline_hours,
            "raw_response": {"note": "manual gateway - no external API call"},
        }

    def verify_payment(self, transaction):
        # Hakuna API ya nje ya "kuuliza" — hali inabadilika TU pale Admin
        # anapotumia action ya "Thibitisha malipo" kwenye Django Admin
        # (au expire_stale_manual_payments ikiwa deadline imepita).
        return "pending", {"note": "manual gateway - admin confirmation required"}

    def parse_webhook(self, request):
        raise GatewayError("Gateway 'manual' haina webhook — thibitisho ni la mkono (Admin).")
