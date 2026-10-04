"""
Registry ya Payment Gateways.

Hii ndiyo sehemu PEKEE unayohitaji kugusa unapoongeza gateway mpya
(baada ya kuandika class yake kwenye faili jipya hapa ndani ya
payments/gateways/).

Mfano wa kuongeza AzamPay baadaye:

    from .azampay import AzamPayGateway
    _REGISTRY[Gateway.AZAMPAY] = AzamPayGateway

Kila kitu kingine (views, models, members app) kinatumia tu
`get_gateway(code)` na hakihitaji kujua gateway zipi zipo.
"""

from payments.models import Gateway

from .azampay import AzamPayGateway
from .manual import ManualGateway
from .paypal import PayPalGateway
from .selcom import SelcomGateway
from .snippe import SnippeGateway

_REGISTRY = {
    Gateway.SELCOM: SelcomGateway,
    Gateway.AZAMPAY: AzamPayGateway,
    Gateway.PAYPAL: PayPalGateway,
    Gateway.SNIPPE: SnippeGateway,
    Gateway.MANUAL: ManualGateway,
    # Gateway.CLICKPESA: ClickPesaGateway,    # ongeza hapa baadaye
    # Gateway.DPO_PESAPAL: DpoPesapalGateway, # ongeza hapa baadaye
    # Gateway.FLUTTERWAVE: FlutterwaveGateway,# ongeza hapa baadaye
}


class GatewayNotConfigured(Exception):
    pass


def enabled_gateway_codes():
    """
    Gateway codes zilizoruhusiwa na settings.ENABLED_PAYMENT_GATEWAYS
    (default: ["manual"]). Gateway iliyosajiliwa lakini isiyo kwenye
    orodha hii HAIONEKANI kwa mtumiaji na HAIKUBALIWI na API.
    """
    from django.conf import settings as dj_settings

    return [str(c).lower() for c in getattr(dj_settings, "ENABLED_PAYMENT_GATEWAYS", ["manual"])]


def is_gateway_enabled(gateway_code):
    code = gateway_code.value if hasattr(gateway_code, "value") else str(gateway_code)
    return code.lower() in enabled_gateway_codes()


def default_gateway():
    """Gateway ya default kwa serializers (ya kwanza kwenye orodha iliyoruhusiwa)."""
    enabled = enabled_gateway_codes()
    return enabled[0] if enabled else "manual"


def gateway_requires_phone(gateway_code):
    """True kama gateway hii inahitaji namba ya simu (mobile money)."""
    gateway_class = _REGISTRY.get(gateway_code)
    return bool(gateway_class and gateway_class.requires_phone)


def get_gateway(gateway_code):
    """Rudisha instance ya gateway adapter kulingana na gateway_code."""
    gateway_class = _REGISTRY.get(gateway_code)
    if gateway_class is None:
        raise GatewayNotConfigured(
            f"Gateway '{gateway_code}' haijasajiliwa kwenye payments/gateways/registry.py"
        )
    return gateway_class()


def available_gateways():
    """Orodha ya gateway codes zilizosajiliwa (kwa dropdown ya frontend)."""
    return list(_REGISTRY.keys())


def available_gateways_info(include_unconfigured=False):
    """
    Kama available_gateways() lakini na maelezo kamili (label + meta-data)
    kwa ajili ya AvailableGatewaysView — frontend inajenga UI ya kuchagua
    gateway BILA kuwa na orodha ya majina iliyofungwa (hardcoded) ndani
    yake. Gateway mpya ikisajiliwa hapa juu, inatokea kwenye dropdown ya
    mtumiaji MOJA KWA MOJA (auto) — hakuna mabadiliko mengine ya frontend
    yanayohitajika.

    KWA DEFAULT: gateway ambayo bado haina funguo (.env) HAIONYESHWI kwa
    mtumiaji wa kawaida (fail-closed dhidi ya kumpa mtumiaji chaguo
    litakaloshindwa akibofya). Mara Sunga akijaza AZAMPAY_*/PAYPAL_* n.k.
    kwenye .env na ku-restart server, gateway husika INAONEKANA yenyewe —
    hakuna code inayohitaji kubadilika.
    """
    info = []
    enabled = enabled_gateway_codes()
    for code, gateway_class in _REGISTRY.items():
        code_str = code.value if hasattr(code, "value") else str(code)
        # Gateway lazima iwe kwenye ENABLED_PAYMENT_GATEWAYS (settings.py)
        if code_str.lower() not in enabled:
            continue
        if not include_unconfigured and not gateway_class.is_configured():
            continue
        info.append(
            {
                "code": code.value if hasattr(code, "value") else code,
                "label": code.label if hasattr(code, "label") else str(code),
                "requires_phone": gateway_class.requires_phone,
                "supports_redirect": gateway_class.supports_redirect,
            }
        )
    return info
