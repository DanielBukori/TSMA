"""
PayPal Gateway Adapter (Orders API v2).

Muundo huu unafuata PayPal REST API v2 (OAuth2 client_credentials + Orders
API) ambayo imekuwa thabiti (stable) kwa miaka mingi — tofauti na Selcom/
AzamPay, PayPal ina nyaraka rasmi za umma zinazoweza kufikiwa bila akaunti
(https://developer.paypal.com/api/rest/), kwa hiyo muundo huu una uhakika
mkubwa zaidi. Bado, THIBITISHA dhidi ya sandbox yako kabla ya live.

MUHIMU SANA — SARAFU (CURRENCY): PayPal HAIUNGI MKONO TZS (Tanzanian
Shilling) kama sarafu ya malipo. Ukiwasha gateway hii, malipo yatatozwa
kwa PAYPAL_CURRENCY (default: USD kwenye settings.py), SI transaction.amount
ya TZS moja kwa moja — LAZIMA uongeze kiwango cha kubadilisha fedha
(exchange rate) mahali fulani (mfano field ya ziada kwenye Membership
Tier, au huduma ya exchange rate ya nje) kabla ya kuwasha hii live.
Kwa sasa create_checkout() inatumia transaction.amount moja kwa moja tu
IKIWA PAYPAL_CURRENCY inalingana na transaction.currency — vinginevyo
inakataa (fail-closed) badala ya kutoza kiasi kibaya.

Matumizi yaliyokusudiwa: wanachama/washirika WA NJE ya Tanzania
wanaotaka kulipa kwa dola (kadi ya kimataifa) - si mbadala wa mobile
money ya ndani (hiyo ni kazi ya Selcom/AzamPay).
"""

import base64
import json

import requests
from django.conf import settings

from payments.models import Gateway
from .base import GatewayError, PaymentGatewayBase


class PayPalGateway(PaymentGatewayBase):
    gateway_code = Gateway.PAYPAL
    requires_phone = False
    supports_redirect = True  # mtumiaji anaelekezwa kwenye ukurasa wa PayPal kuidhinisha
    required_settings = ["PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET"]

    def __init__(self):
        self.base_url = settings.PAYPAL_BASE_URL.rstrip("/")
        self.client_id = settings.PAYPAL_CLIENT_ID
        self.client_secret = settings.PAYPAL_CLIENT_SECRET
        self.webhook_id = settings.PAYPAL_WEBHOOK_ID
        self.currency = settings.PAYPAL_CURRENCY
        self.return_url = settings.PAYPAL_RETURN_URL
        self.cancel_url = settings.PAYPAL_CANCEL_URL

    def _get_access_token(self):
        basic = base64.b64encode(f"{self.client_id}:{self.client_secret}".encode()).decode()
        try:
            response = requests.post(
                f"{self.base_url}/v1/oauth2/token",
                data={"grant_type": "client_credentials"},
                headers={
                    "Authorization": f"Basic {basic}",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                timeout=30,
            )
            data = response.json()
        except (requests.RequestException, json.JSONDecodeError) as exc:
            raise GatewayError(f"PayPal auth imeshindwa: {exc}")

        token = data.get("access_token")
        if not token:
            raise GatewayError("PayPal haikurudisha access token.", raw_response=data)
        return token

    # ------------------------------------------------------------------
    # PaymentGatewayBase implementation
    # ------------------------------------------------------------------
    def create_checkout(self, transaction, **kwargs):
        if transaction.currency != self.currency:
            # FAIL-CLOSED: usibadilishe sarafu kimya kimya - kataa badala
            # ya kutoza kiasi kisicho sahihi. Ongeza exchange-rate
            # conversion hapa wakati mfumo wa TSMA utakapokuwa tayari
            # kutoza wanachama wa nje kwa USD (au sarafu nyingine).
            raise GatewayError(
                f"PayPal imesanidiwa kwa {self.currency}, lakini transaction "
                f"hii iko {transaction.currency}. Ongeza currency conversion "
                "kabla ya kutumia PayPal kwa transaction hii."
            )

        token = self._get_access_token()
        payload = {
            "intent": "CAPTURE",
            "purchase_units": [
                {
                    "reference_id": transaction.internal_reference,
                    "custom_id": transaction.internal_reference,
                    "description": f"TSMA - {transaction.get_purpose_display()}"[:127],
                    "amount": {
                        "currency_code": self.currency,
                        "value": str(transaction.amount),
                    },
                }
            ],
            "application_context": {
                "brand_name": "TSMA - Tanzania Sports Management Association",
                "return_url": self.return_url,
                "cancel_url": self.cancel_url,
                "user_action": "PAY_NOW",
            },
        }
        try:
            response = requests.post(
                f"{self.base_url}/v2/checkout/orders",
                json=payload,
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                timeout=30,
            )
            data = response.json()
        except (requests.RequestException, json.JSONDecodeError) as exc:
            raise GatewayError(f"PayPal create-order imeshindwa: {exc}")

        if response.status_code not in (200, 201):
            raise GatewayError(
                data.get("message", "PayPal imekataa ombi la order."), raw_response=data
            )

        approve_link = next(
            (link["href"] for link in data.get("links", []) if link.get("rel") == "approve"),
            None,
        )
        if not approve_link:
            raise GatewayError("PayPal haikurudisha 'approve' link.", raw_response=data)

        return {
            "gateway_order_id": data.get("id"),
            "checkout_url": approve_link,
            "ussd_push_sent": False,
            "instructions": "Fungua link ya PayPal kukamilisha malipo (utaelekezwa kuingia PayPal).",
            "raw_response": data,
        }

    def verify_payment(self, transaction):
        token = self._get_access_token()
        try:
            response = requests.get(
                f"{self.base_url}/v2/checkout/orders/{transaction.gateway_order_id}",
                headers={"Authorization": f"Bearer {token}"},
                timeout=30,
            )
            data = response.json()
        except (requests.RequestException, json.JSONDecodeError) as exc:
            raise GatewayError(f"PayPal order-status imeshindwa: {exc}")

        paypal_status = data.get("status", "")
        if paypal_status == "COMPLETED":
            return "success", data
        if paypal_status == "APPROVED":
            # Mtumiaji ameidhinisha lakini bado hatujachukua fedha (capture).
            captured = self._capture_order(token, transaction.gateway_order_id)
            return ("success", captured) if captured.get("status") == "COMPLETED" else ("pending", captured)
        if paypal_status in ("VOIDED",):
            return "failed", data
        return "pending", data

    def _capture_order(self, token, order_id):
        try:
            response = requests.post(
                f"{self.base_url}/v2/checkout/orders/{order_id}/capture",
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                timeout=30,
            )
            return response.json()
        except (requests.RequestException, json.JSONDecodeError) as exc:
            raise GatewayError(f"PayPal capture imeshindwa: {exc}")

    def parse_webhook(self, request):
        """
        USALAMA (fail-closed): kila webhook ya PayPal INAJITHIBITISHA
        kupitia /v1/notifications/verify-webhook-signature API (siyo kwa
        kuhesabu HMAC wenyewe kama Selcom) — PAYPAL_WEBHOOK_ID (kutoka
        PayPal Developer Dashboard -> Webhooks) LAZIMA iwe sahihi. Ombi
        lolote ambalo PayPal wenyewe hawathibitishi kama halali
        LINAKATALIWA.
        """
        try:
            payload = json.loads(request.body.decode("utf-8"))
        except (ValueError, UnicodeDecodeError) as exc:
            raise GatewayError(f"PayPal webhook payload si JSON sahihi: {exc}")

        headers = request.headers
        verify_payload = {
            "transmission_id": headers.get("Paypal-Transmission-Id", ""),
            "transmission_time": headers.get("Paypal-Transmission-Time", ""),
            "cert_url": headers.get("Paypal-Cert-Url", ""),
            "auth_algo": headers.get("Paypal-Auth-Algo", ""),
            "transmission_sig": headers.get("Paypal-Transmission-Sig", ""),
            "webhook_id": self.webhook_id,
            "webhook_event": payload,
        }
        if not all(
            [
                verify_payload["transmission_id"],
                verify_payload["transmission_sig"],
                self.webhook_id,
            ]
        ):
            raise GatewayError(
                "PayPal webhook haina vichwa vya utambulisho (Transmission-Id/Sig) "
                "au PAYPAL_WEBHOOK_ID haijawekwa - imekataliwa kwa usalama."
            )

        token = self._get_access_token()
        try:
            response = requests.post(
                f"{self.base_url}/v1/notifications/verify-webhook-signature",
                json=verify_payload,
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                timeout=30,
            )
            verify_result = response.json()
        except (requests.RequestException, json.JSONDecodeError) as exc:
            raise GatewayError(f"PayPal webhook verification imeshindwa: {exc}")

        if verify_result.get("verification_status") != "SUCCESS":
            raise GatewayError(
                "PayPal webhook signature si sahihi (imekataliwa).", raw_response=verify_result
            )

        event_type = payload.get("event_type", "")
        resource = payload.get("resource", {})
        purchase_units = resource.get("purchase_units") or []
        internal_reference = resource.get("custom_id") or (
            purchase_units[0].get("reference_id") if purchase_units else None
        )
        if not internal_reference:
            raise GatewayError("PayPal webhook haina reference_id/custom_id.")

        if event_type in ("CHECKOUT.ORDER.APPROVED",):
            order_id = resource.get("id")
            captured = self._capture_order(token, order_id)
            status = "success" if captured.get("status") == "COMPLETED" else "failed"
        elif event_type in ("PAYMENT.CAPTURE.COMPLETED",):
            status = "success"
        elif event_type in ("PAYMENT.CAPTURE.DENIED", "CHECKOUT.ORDER.VOIDED"):
            status = "failed"
        else:
            # Event nyingine (mfano REFUND) - hatuzichakati hapa, angalia tu
            status = "pending"

        return {
            "internal_reference": internal_reference,
            "status": status,
            "gateway_transaction_id": resource.get("id"),
            "raw_response": payload,
        }
