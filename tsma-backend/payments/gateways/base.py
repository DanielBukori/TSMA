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


class PaymentGatewayBase(ABC):
    """Kila gateway adapter LAZIMA i-implement methods hizi tatu."""

    gateway_code = None  # mfano "selcom" — lazima ilingane na Gateway.choices

    # META-DATA — hutumika na AvailableGatewaysView (payments/views.py) kuambia
    # frontend jinsi ya kuonyesha fomu kwa gateway hii, BILA frontend kuwa na
    # "if selcom / if paypal" yoyote iliyofungwa (hardcoded). Gateway mpya
    # ikiongeza thamani zake hapa, UI inajibadilisha yenyewe (auto).
    requires_phone = True     # True = fomu ionyeshe "Namba ya Simu" (mobile money)
    supports_redirect = False  # True = gateway inaweza kutoa checkout_url ya kuelekeza mtumiaji (kadi/PayPal)

    # Majina ya Django settings (.env) ambayo LAZIMA yawe na thamani kabla
    # gateway hii kuonekana kwa mtumiaji kama "available". Hii ndiyo
    # inayoruhusu Sunga kusajili gateway mpya kwenye registry.py SASA
    # (bila funguo bado), na ikaonekana kiotomatiki kwa watumiaji MARA
    # anapojaza .env baadaye - hakuna code inayohitaji kubadilika.
    required_settings = []

    @classmethod
    def is_configured(cls):
        from django.conf import settings as dj_settings

        return all(getattr(dj_settings, name, "") for name in cls.required_settings)

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
        Ikiwa signature si sahihi, LAZIMA i-raise GatewayError.
        """
        raise NotImplementedError

    def disburse_payout(self, phone_number, amount, currency, reference, narration=""):
        """
        HIARI — inatumika TU na gateway zenye uwezo wa "payout/disbursement"
        (kutuma fedha KUTOKA TSMA KWENDA kwa mtu, mfano kulipa mwandishi
        sehemu yake ya mauzo ya chapisho). Gateway isiyo na uwezo huu
        haihitaji ku-override method hii — default inatupa GatewayError.

        Lazima irudishe dict: {"payout_reference": "...", "raw_response": {...}}
        """
        raise GatewayError(
            f"Gateway '{self.gateway_code}' haiungi mkono payout/disbursement moja kwa moja."
        )
