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

_REGISTRY = {
    Gateway.SELCOM: SelcomGateway,
    Gateway.AZAMPAY: AzamPayGateway,
    Gateway.PAYPAL: PayPalGateway,
    Gateway.MANUAL: ManualGateway,
    # Gateway.CLICKPESA: ClickPesaGateway,    # ongeza hapa baadaye
    # Gateway.DPO_PESAPAL: DpoPesapalGateway, # ongeza hapa baadaye
    # Gateway.FLUTTERWAVE: FlutterwaveGateway,# ongeza hapa baadaye
}


class GatewayNotConfigured(Exception):
    pass


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
    for code, gateway_class in _REGISTRY.items():
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
