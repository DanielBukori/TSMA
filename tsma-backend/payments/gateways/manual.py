"""
Manual Gateway Adapter — "Malipo ya Mkono" (bank deposit / cash / office payment).

Hii SI muunganiko wa API ya nje — badala yake:
1. `create_checkout` haiwasiliani na huduma yoyote ya nje; inarudisha tu
   maelekezo kwa mtumiaji (namba ya benki/reference) na transaction inabaki
   PROCESSING ikisubiri uthibitisho wa mkono.
2. Admin/Finance anapopokea malipo (benki, M-Pesa ya ofisi, cash), anaingia
   Django Admin -> Payments -> anachagua transaction husika -> anatumia
   action "Thibitisha malipo yamepokelewa" (angalia payments/admin.py) —
   hii ndiyo inayoita `mark_success()` na kutuma `payment_succeeded` signal
   (ambayo huwezesha uanachama/kutengeneza risiti n.k., sawa kabisa na
   Selcom ingekuwa imethibitisha moja kwa moja).

MUHIMU (matumizi ya sasa - testing kabla ya Selcom/AzamPay kusajiliwa):
Gateway hii inaruhusu kujaribu mzunguko MZIMA wa mfumo (register -> "lipa"
-> uanachama kuwezeshwa -> kadi ya kidijitali -> QR ya conference n.k.)
bila kuhitaji akaunti ya kweli ya payment gateway. Frontend inadhibitiwa
na VITE_PAYMENT_GATEWAY (angalia src/config.js) — ukishapata Selcom/AzamPay
account halisi, badilisha env variable hiyo kuwa "selcom", si code.
"""

from .base import GatewayError, PaymentGatewayBase
from payments.models import Gateway


class ManualGateway(PaymentGatewayBase):
    gateway_code = Gateway.MANUAL
    requires_phone = False
    supports_redirect = False

    def create_checkout(self, transaction, **kwargs):
        return {
            "gateway_order_id": transaction.internal_reference,
            "checkout_url": None,
            "ussd_push_sent": False,
            "instructions": (
                "Malipo ya mkono: fanya malipo (benki/ofisi) ukitumia "
                f"REFERENCE: {transaction.internal_reference}, kisha "
                "subiri uthibitisho kutoka TSMA (kawaida saa chache za "
                "kazi). Utapokea taarifa mara akaunti yako itakapowezeshwa."
            ),
            "raw_response": {"note": "manual gateway - no external API call"},
        }

    def verify_payment(self, transaction):
        # Hakuna API ya nje ya "kuuliza" — hali inabadilika TU pale Admin
        # anapotumia action ya "Thibitisha malipo" kwenye Django Admin.
        return "pending", {"note": "manual gateway - admin confirmation required"}

    def parse_webhook(self, request):
        raise GatewayError("Gateway 'manual' haina webhook — thibitisho ni la mkono (Admin).")
