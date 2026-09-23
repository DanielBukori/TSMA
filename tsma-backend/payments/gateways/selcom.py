"""
Selcom Gateway Adapter.

MUHIMU: Endpoints na muundo wa payload hapa chini vinafuata muundo wa jumla
wa Selcom Checkout API (Minimal Header / Push USSD + Order Status + Webhook)
kama ulivyoainishwa kwenye nyaraka za awali za Selcom Developer Docs.
Selcom mara nyingine hubadilisha maelezo madogo (jina la field, path).
KABLA ya kwenda live, thibitisha endpoints, field names na muundo wa
signature dhidi ya Selcom API documentation ya sasa (utapata baada ya
kusajili Merchant/Vendor account — https://developers.selcommobile.com)
au uliza Selcom support wapate kukupa sandbox credentials + Postman collection
ya hivi karibuni. Sina uwezo wa kutembelea mtandao kuthibitisha real-time.
"""

import base64
import hashlib
import hmac
import json
from datetime import datetime, timezone as dt_timezone

import requests
from django.conf import settings

from payments.models import Gateway, PaymentStatus
from .base import GatewayError, PaymentGatewayBase


class SelcomGateway(PaymentGatewayBase):
    gateway_code = Gateway.SELCOM
    requires_phone = True
    supports_redirect = True  # ina checkout_url kama fallback kwa kadi
    required_settings = ["SELCOM_VENDOR_ID", "SELCOM_API_KEY", "SELCOM_API_SECRET"]

    def __init__(self):
        self.base_url = settings.SELCOM_BASE_URL.rstrip("/")
        self.vendor_id = settings.SELCOM_VENDOR_ID
        self.api_key = settings.SELCOM_API_KEY
        self.api_secret = settings.SELCOM_API_SECRET
        self.webhook_url = settings.SELCOM_WEBHOOK_URL

    # ------------------------------------------------------------------
    # Signature helpers (HMAC-SHA256, kama inavyotumika na Selcom API)
    # ------------------------------------------------------------------
    def _timestamp(self):
        return datetime.now(dt_timezone.utc).strftime("%Y-%m-%dT%H:%M:%S+0000")

    def _digest(self, payload_dict, signed_fields):
        """
        Tengeneza 'Digest' header: HMAC-SHA256 juu ya string ya
        'field=value' zilizounganishwa kwa '&', kwa kutumia api_secret,
        kisha base64-encode matokeo.
        """
        parts = [f"{field}={payload_dict.get(field, '')}" for field in signed_fields]
        raw_string = "&".join(parts)
        signature = hmac.new(
            self.api_secret.encode("utf-8"),
            raw_string.encode("utf-8"),
            hashlib.sha256,
        ).digest()
        return base64.b64encode(signature).decode("utf-8")

    def _headers(self, payload_dict, signed_fields):
        auth_token = base64.b64encode(self.api_key.encode("utf-8")).decode("utf-8")
        return {
            "Content-Type": "application/json",
            "Authorization": f"SELCOM {auth_token}",
            "Digest-Method": "HS256",
            "Digest": self._digest(payload_dict, signed_fields),
            "Timestamp": self._timestamp(),
            "Signed-Fields": ",".join(signed_fields),
        }

    # ------------------------------------------------------------------
    # PaymentGatewayBase implementation
    # ------------------------------------------------------------------
    def create_checkout(self, transaction, **kwargs):
        """
        Hatua 1: Tengeneza order kwa Selcom.
        Hatua 2 (hiari): Tuma USSD push moja kwa moja kwa namba ya simu
        aliyotoa mtumiaji, ili apokee popup ya kuweka PIN yake.
        """
        phone_number = kwargs.get("phone_number") or transaction.phone_number
        buyer_name = kwargs.get("buyer_name") or transaction.user.get_full_name()
        buyer_email = kwargs.get("buyer_email") or transaction.user.email

        order_payload = {
            "vendor": self.vendor_id,
            "order_id": transaction.internal_reference,
            "buyer_email": buyer_email,
            "buyer_name": buyer_name,
            "buyer_phone": phone_number,
            "amount": str(transaction.amount),
            "currency": transaction.currency,
            "no_of_items": 1,
            "webhook": self.webhook_url,
            "buyer_remarks": f"TSMA - {transaction.get_purpose_display()}",
            "merchant_remarks": transaction.internal_reference,
        }
        signed_fields = [
            "vendor",
            "order_id",
            "buyer_email",
            "buyer_phone",
            "amount",
            "currency",
        ]

        try:
            response = requests.post(
                f"{self.base_url}/v1/checkout/create-order-minimal",
                json=order_payload,
                headers=self._headers(order_payload, signed_fields),
                timeout=30,
            )
            data = response.json()
        except (requests.RequestException, json.JSONDecodeError) as exc:
            raise GatewayError(f"Selcom create-order imeshindwa: {exc}")

        if data.get("resultcode") not in ("000", 0, "0"):
            raise GatewayError(
                data.get("message", "Selcom imekataa ombi la order."), raw_response=data
            )

        gateway_order_id = order_payload["order_id"]
        ussd_push_sent = False

        # Kama namba ya simu ipo, tuma USSD push moja kwa moja (mobile money)
        if phone_number:
            push_payload = {
                "order_id": gateway_order_id,
                "vendor": self.vendor_id,
                "msisdn": phone_number,
            }
            push_signed_fields = ["order_id", "vendor", "msisdn"]
            try:
                push_response = requests.post(
                    f"{self.base_url}/v1/checkout/wallet-payment",
                    json=push_payload,
                    headers=self._headers(push_payload, push_signed_fields),
                    timeout=30,
                )
                push_data = push_response.json()
                ussd_push_sent = push_data.get("resultcode") in ("000", 0, "0")
            except (requests.RequestException, json.JSONDecodeError):
                ussd_push_sent = False

        return {
            "gateway_order_id": gateway_order_id,
            "checkout_url": data.get("data", [{}])[0].get("payment_gateway_url"),
            "ussd_push_sent": ussd_push_sent,
            "instructions": (
                "Angalia simu yako kwa ujumbe wa USSD kukamilisha malipo."
                if ussd_push_sent
                else "Tumia link ya malipo (checkout_url) kukamilisha malipo yako."
            ),
            "raw_response": data,
        }

    def verify_payment(self, transaction):
        query_payload = {
            "order_id": transaction.gateway_order_id or transaction.internal_reference,
        }
        signed_fields = ["order_id"]
        try:
            response = requests.get(
                f"{self.base_url}/v1/checkout/order-status",
                params=query_payload,
                headers=self._headers(query_payload, signed_fields),
                timeout=30,
            )
            data = response.json()
        except (requests.RequestException, json.JSONDecodeError) as exc:
            raise GatewayError(f"Selcom order-status imeshindwa: {exc}")

        payment_status = (
            data.get("data", [{}])[0].get("payment_status", "").upper()
            if data.get("data")
            else ""
        )

        if payment_status == "COMPLETED":
            return "success", data
        if payment_status in ("PENDING", "PROCESSING", ""):
            return "pending", data
        return "failed", data

    def parse_webhook(self, request):
        """
        Selcom hutuma POST kwa `webhook` URL tuliyotoa wakati wa create-order,
        yenye vichwa (headers) sawa na tulivyotuma (Authorization/Digest) —
        tunathibitisha kwa kuunda upya digest na kulinganisha.

        USALAMA (fail-closed): Signed-Fields/Digest ni LAZIMA ziwepo na
        ziwe sahihi. Ombi lolote lisilo na Digest, lisilo na Signed-Fields,
        au lenye digest isiyolingana LINAKATALIWA moja kwa moja —
        halijaruhusiwi "kupita" kimya kimya bila uthibitisho.
        """
        try:
            payload = json.loads(request.body.decode("utf-8"))
        except (ValueError, UnicodeDecodeError) as exc:
            raise GatewayError(f"Webhook payload si JSON sahihi: {exc}")

        received_digest = request.headers.get("Digest", "")
        signed_fields_header = request.headers.get("Signed-Fields", "")
        signed_fields = [f.strip() for f in signed_fields_header.split(",") if f.strip()]

        # FAIL-CLOSED: bila Digest au Signed-Fields, ombi HALIAMINIWI kamwe.
        if not received_digest or not signed_fields:
            raise GatewayError(
                "Selcom webhook haina Digest/Signed-Fields — imekataliwa "
                "kwa usalama (haiwezi kuthibitishwa kuwa ni ya kweli)."
            )

        # Kila field iliyotajwa kwenye Signed-Fields LAZIMA iwepo kwenye
        # payload — vinginevyo mtu anaweza "kusaini" fields chache tu na
        # kubadilisha zilizobaki bila kuvunja signature.
        missing = [f for f in signed_fields if f not in payload]
        if missing:
            raise GatewayError(f"Selcom webhook haina fields zilizosainiwa: {missing}")

        expected_digest = self._digest(payload, signed_fields)
        if not hmac.compare_digest(expected_digest, received_digest):
            raise GatewayError("Selcom webhook signature si sahihi (uwezekano wa udanganyifu).")

        # Fields za msingi za usalama LAZIMA ziwe miongoni mwa zilizosainiwa,
        # ili mtu asiweze kusaini field isiyo na maana na kuacha order_id/
        # amount bila ulinzi wa signature.
        required_signed = {"order_id", "amount"}
        if not required_signed.issubset(set(signed_fields)):
            raise GatewayError(
                f"Selcom webhook haikusaini fields muhimu ({required_signed}) — imekataliwa."
            )

        gateway_status = str(payload.get("payment_status", "")).upper()
        status = "success" if gateway_status == "COMPLETED" else "failed"

        return {
            "internal_reference": payload.get("order_id"),
            "status": status,
            "gateway_transaction_id": payload.get("transid") or payload.get("reference"),
            "raw_response": payload,
        }

    def disburse_payout(self, phone_number, amount, currency, reference, narration=""):
        """
        Selcom Disbursement/Payout API — hutuma fedha KWENDA namba ya simu
        (mobile money) ya mwandishi. MUHIMU: hii ni bidhaa TOFAUTI na
        Checkout API (ile ni C2B - collection; hii ni B2C - disbursement),
        na mara nyingi inahitaji uidhinishwaji maalum wa ziada kutoka
        Selcom (Disbursement/Payout account, siyo Merchant account ya
        kawaida). Thibitisha endpoint na muundo dhidi ya nyaraka za Selcom
        za sasa (au uliza Selcom Business Support) kabla ya kutumia live —
        sina uwezo wa kutembelea mtandao kuthibitisha real-time.
        """
        payload = {
            "vendor": self.vendor_id,
            "reference": reference,
            "msisdn": phone_number,
            "amount": str(amount),
            "currency": currency,
            "remarks": narration or "TSMA Publication Payout",
        }
        signed_fields = ["vendor", "reference", "msisdn", "amount"]

        try:
            response = requests.post(
                f"{self.base_url}/v1/disbursement/payout",
                json=payload,
                headers=self._headers(payload, signed_fields),
                timeout=30,
            )
            data = response.json()
        except (requests.RequestException, json.JSONDecodeError) as exc:
            raise GatewayError(f"Selcom payout imeshindwa: {exc}")

        if data.get("resultcode") not in ("000", 0, "0"):
            raise GatewayError(
                data.get("message", "Selcom imekataa ombi la payout."), raw_response=data
            )

        return {
            "payout_reference": data.get("data", [{}])[0].get("transid", reference),
            "raw_response": data,
        }
