"""
Registry ya Payment Gateways.

Hii ndiyo sehemu PEKEE unayohitaji kugusa unapoongeza gateway mpya (baada ya
kuandika class yake kwenye faili jipya hapa ndani ya payments/gateways/):

    from .clickpesa import ClickPesaGateway
    _REGISTRY[Gateway.CLICKPESA] = ClickPesaGateway

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


def _code_str(code):
    return (code.value if hasattr(code, "value") else str(code)).lower()


def disabled_gateway_codes():
    """Codes an operator switched off with DISABLED_PAYMENT_GATEWAYS, whatever the keys say."""
    from django.conf import settings as dj_settings

    return [_code_str(c) for c in getattr(dj_settings, "DISABLED_PAYMENT_GATEWAYS", [])]


def gateway_is_available(gateway_code):
    """
    Availability rule for the whole system (dropdown, API validation and
    payment initiation all use this single check):

    - manual (bank deposit / office cash) is always available;
    - every other gateway is available only once its credentials are real,
      so adding keys in the backend is the only switch an operator needs;
    - DISABLED_PAYMENT_GATEWAYS can still switch a gateway off in an emergency.
    """
    gateway_class = _REGISTRY.get(gateway_code)
    if gateway_class is None:
        return False
    code = _code_str(gateway_code)
    if code == Gateway.MANUAL.value:
        return True
    if code in disabled_gateway_codes():
        return False
    return gateway_class.is_configured()


def available_gateway_codes():
    return [_code_str(code) for code in _REGISTRY if gateway_is_available(code)]


def is_gateway_enabled(gateway_code):
    return gateway_is_available(gateway_code)


def default_gateway():
    return Gateway.MANUAL.value


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


def available_gateways_info():
    """
    Gateway options for the checkout dropdown, in the order they should be
    offered: manual first, then the gateways whose credentials are configured.

    The frontend never hardcodes gateway names. A gateway registered in
    _REGISTRY appears here by itself as soon as its keys exist in the backend.
    """
    info = []
    for code, gateway_class in _REGISTRY.items():
        if not gateway_is_available(code):
            continue
        info.append(
            {
                "code": _code_str(code),
                "label": code.label if hasattr(code, "label") else str(code),
                "requires_phone": gateway_class.requires_phone,
                "supports_redirect": gateway_class.supports_redirect,
            }
        )
    info.sort(key=lambda item: item["code"] != Gateway.MANUAL.value)
    return info
