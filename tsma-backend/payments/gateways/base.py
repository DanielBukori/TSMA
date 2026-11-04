"""
PaymentGatewayBase — "Adapter Pattern" kwa Payment Gateways.

Lengo: mfumo mkuu (views, models, members app, conferences app) haujali
gateway ipi inatumika. Kila gateway mpya (AzamPay, ClickPesa, DPO, n.k.)
inahitaji tu ku-implement class hii — bila kubadili chochote pengine.

Jinsi ya kuongeza gateway mpya baadaye:
1. Unda faili mpya kwenye payments/gateways/ (mfano azampay.py).
2. Andika class inayorithi PaymentGatewayBase na ku-implement methods zote 3.
3. Isajili kwenye payments/gateways/registry.py (line moja tu).
Hakuna sehemu nyingine ya mfumo inayohitaji kuguswa.
"""

from abc import ABC, abstractmethod


class GatewayError(Exception):
    """Exception ya jumla kwa makosa ya mawasiliano na gateway."""

    def __init__(self, message, raw_response=None):
        super().__init__(message)
        self.raw_response = raw_response


class WebhookNotApplicable(GatewayError):
    """
    Webhook was verified as genuine but does not concern a PaymentTransaction
    (for example a 'payout.*' event from Snippe). This is not a threat signal -
    the webhook view returns no error and writes no security event.
    """


# ".env" mifano hubaki na thamani za kufeza kama CHANGE_ME; hayo si funguo za kweli.
PLACEHOLDER_VALUES = {
    "",
    "change_me",
    "changeme",
    "replace_me",
    "your_api_key_here",
    "api_key_here",
    "xxx",
    "todo",
    "none",
    "null",
}


def credential_is_set(value):
    text = str(value or "").strip().lower().replace("-", "_")
    return text not in PLACEHOLDER_VALUES


class PaymentGatewayBase(ABC):
    """Every gateway adapter implements these three methods."""

    gateway_code = None  # mfano "selcom" — lazima ilingane na Gateway.choices

    # META-DATA — hutumika na AvailableGatewaysView (payments/views.py) kuambia
    # frontend jinsi ya kuonyesha fomu kwa gateway hii, BILA frontend kuwa na
    # "if selcom / if paypal" yoyote iliyofungwa (hardcoded). Gateway mpya
    # ikiongeza thamani zake hapa, UI inajibadilisha yenyewe (auto).
    requires_phone = True     # True = fomu ionyeshe "Namba ya Simu" (mobile money)
    supports_redirect = False  # True = gateway inaweza kutoa checkout_url ya kuelekeza mtumiaji (kadi/PayPal)

    # Django settings (.env) names that must hold a real value before this
    # gateway is offered to users. A gateway can therefore be registered in
    # registry.py before its keys exist and appear on the checkout dropdown
    # by itself once the keys are added - no code change needed.
    required_settings = []

    @classmethod
    def is_configured(cls):
        """True only when every credential the gateway needs holds a real value."""
        from django.conf import settings as dj_settings

        return all(
            credential_is_set(getattr(dj_settings, name, ""))
            for name in cls.required_settings
        )

    @abstractmethod
    def create_checkout(self, transaction, **kwargs):
        """
        Anzisha malipo kwa gateway husika.

        `transaction` ni PaymentTransaction instance (bado PENDING).
        `kwargs` zinaweza kubeba taarifa za ziada mfano phone_number,
        redirect_url, buyer_name, n.k.

        Lazima irudishe dict yenye muundo huu (angalau):
        {
            "gateway_order_id": "...",       # ID ya order kwa upande wa gateway
            "checkout_url": "..." (au None), # kama gateway ina checkout page
            "ussd_push_sent": True/False,    # kama gateway ilituma USSD push
            "instructions": "...",           # ujumbe wa kumwelekeza mtumiaji
            "raw_response": {...},           # response ghafi (kwa audit)
        }
        """
        raise NotImplementedError

    @abstractmethod
    def verify_payment(self, transaction):
        """
        Uliza gateway hali halisi ya malipo (query/status check).
        Lazima irudishe moja ya: "success", "pending", "failed".
        """
        raise NotImplementedError

    @abstractmethod
    def parse_webhook(self, request):
        """
        Chukua ombi (request) la webhook/callback kutoka gateway, thibitisha
        signature yake, kisha rudisha dict:
        {
            "internal_reference": "...",   # reference yetu (order id yetu)
            "status": "success" | "failed",
            "gateway_transaction_id": "...",
            "raw_response": {...},
        }
        Ikiwa signature si sahihi, raise GatewayError.
        """
        raise NotImplementedError

    def disburse_payout(self, phone_number, amount, currency, reference, narration=""):
        """
        Optional - only gateways that can move money out of TSMA implement this
        (paying an author their share of a publication sale). Others can leave
        it alone; the default raises GatewayError.

        Must return dict: {"payout_reference": "...", "raw_response": {...}}
        """
        raise GatewayError(
            f"Gateway '{self.gateway_code}' haiungi mkono payout/disbursement moja kwa moja."
        )
