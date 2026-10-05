"""
Manual Gateway Adapter — "Malipo ya Mkono" (bank deposit / cash / office payment).

Hii SI muunganiko wa API ya nje — badala yake:
1. `create_checkout` haiwasiliani na huduma yoyote ya nje; inarudisha
   taarifa KAMILI za akaunti ya benki (kutoka ManualPaymentSettings —
   Admin anahariri kupitia Django Admin) pamoja na deadline ya
   kuthibitisha (default masaa 24), na transaction inabaki PROCESSING
   ikisubiri uthibitisho wa mkono.
2. Mwanachama analipa (benki/ofisi), kisha anatuma ujumbe (WhatsApp/SMS)
   kwenye namba iliyowekwa na Admin, akiwa na REFERENCE yake, ndani ya
   muda wa deadline.
3. Admin/Finance anapopokea ujumbe huo, anaingia Django Admin ->
   Malipo (Transactions) -> anachagua transaction husika -> anatumia
   action "✅ Thibitisha malipo yamepokelewa (manual pekee)" (angalia
   payments/admin.py) — hii ndiyo inayoita mark_success() na kutuma
   payment_succeeded signal (uanachama unawezeshwa, risiti/kadi
   zinatengenezwa, n.k. — sawa kabisa na Selcom ingekuwa imethibitisha
   moja kwa moja).
4. Ikiwa deadline ikipita bila uthibitisho, amri
   `python manage.py expire_stale_manual_payments` (inayoweza kuwekwa
   kwenye cron/scheduled task) inaibadilisha kuwa EXPIRED moja kwa moja.

MUHIMU (matumizi ya sasa - testing kabla ya Selcom/AzamPay kusajiliwa):
Gateway hii inaruhusu kujaribu mzunguko MZIMA wa mfumo (register -> "lipa"
-> uanachama kuwezeshwa -> kadi ya kidijitali -> QR ya conference n.k.)
bila kuhitaji akaunti ya kweli ya payment gateway. Frontend inadhibitiwa
na VITE_PAYMENT_GATEWAY (angalia src/config.js) — ukishapata Selcom/AzamPay
account halisi, badilisha env variable hiyo kuwa "selcom", si code.
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

        # ULINZI: usimwonyeshe mtumiaji maandishi ya placeholder kama
        # "[Weka namba ya akaunti - Django Admin]". Admin lazima kwanza
        # ajaze Django Admin -> Taarifa za Malipo ya Mkono (Manual).
        required_values = (
            settings_obj.bank_name,
            settings_obj.account_name,
            settings_obj.account_number,
            settings_obj.confirm_phone,
        )
        if any((v or "").strip().startswith("[Weka") or not (v or "").strip() for v in required_values):
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
