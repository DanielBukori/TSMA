"""
Snippe Gateway Adapter — mobile money (USSD push) kupitia api.snippe.sh.

CHANZO CHA TAARIFA HII (kiwango cha juu cha uhakika, tofauti na
Selcom/AzamPay hapo juu): endpoints, muundo wa request/response, na
webhook signature hapa chini vimetolewa moja kwa moja kwenye SOURCE CODE
halisi (yenye vipimo/tests vinavyothibitisha JSON exact) ya Snippe Rust
SDK (docs.rs/crate/snippe) na Laravel package rasmi — SI kubahatisha
kutoka nyaraka za maelezo tu. Bado, KABLA ya kwenda live:
1. Sajili akaunti: https://snippe.sh (au https://docs.snippe.sh)
2. Pata SNIPPE_API_KEY (Dashboard -> API Keys) na SNIPPE_WEBHOOK_SECRET
   (Dashboard -> Webhooks -> Signing Secret)
3. Jaribu kwenye sandbox/akaunti ya majaribio kabla ya production key
4. Thibitisha `Snippe-Version` (2026-01-25) bado ndiyo version ya sasa
   wakati unapoenda live — Snippe wanaweza kutoa version mpya baadaye.

MUUNDO WA API:
- Base URL: https://api.snippe.sh
- Auth: header `Authorization: Bearer <api_key>` + `Snippe-Version: <version>`
- POST /v1/payments — anzisha malipo (hapa: channel "mobile" = USSD push)
- GET /v1/payments/{reference} — angalia hali ya malipo
- Idempotency-Key header — tunatumia internal_reference yetu (salama
  kurudia bila kutengeneza malipo mawili)
- Response envelope: {"status": "success"|"error", "code": ..., "data": {...}}
  au {"status": "error", "code": ..., "error_code": ..., "message": ...}

WEBHOOKS (fail-closed, HMAC-SHA256 iliyothibitishwa kikamilifu — SI
kama AzamPay ambayo tunalazimika kuuliza tena server-to-server):
- Headers: X-Webhook-Timestamp (Unix seconds), X-Webhook-Signature
  (hex HMAC-SHA256 ya "{timestamp}.{raw_body}" kwa kutumia
  SNIPPE_WEBHOOK_SECRET), X-Webhook-Event (hint tu — hatuamini, tunatumia
  `type` ndani ya body iliyothibitishwa).
- Replay protection: timestamp zaidi ya dakika 5 zilizopita = KATAA.
- Event muhimu: payment.completed, payment.failed, payment.voided,
  payment.expired. `data.metadata.internal_reference` ndiyo tunayotumia
  kutambua transaction yetu (tuliituma sisi wakati wa create_checkout).
"""

import hashlib
import hmac
import json
import time

import requests
from django.conf import settings
from django.utils.dateparse import parse_datetime

from payments.models import Gateway
from .base import GatewayError, PaymentGatewayBase

# Snippe inakataa timestamp za webhook zilizopita zaidi ya dakika 5 (ulinzi
# dhidi ya "replay attack") — tunafuata kigezo kile kile hapa upande wetu.
WEBHOOK_MAX_AGE_SECONDS = 300


class SnippeGateway(PaymentGatewayBase):
    gateway_code = Gateway.SNIPPE
    requires_phone = True      # channel ya mobile (USSD push)
    supports_redirect = False  # channel hii — hakuna checkout_url (tofauti na "card"/"dynamic-qr" ambazo Snippe pia inaunga mkono lakini hazijaunganishwa hapa)
    required_settings = ["SNIPPE_API_KEY", "SNIPPE_WEBHOOK_SECRET"]

    def __init__(self):
        self.api_key = settings.SNIPPE_API_KEY
        self.webhook_secret = settings.SNIPPE_WEBHOOK_SECRET
        self.base_url = getattr(settings, "SNIPPE_BASE_URL", "https://api.snippe.sh").rstrip("/")
        self.api_version = getattr(settings, "SNIPPE_API_VERSION", "2026-01-25")
        self.webhook_url = getattr(settings, "SNIPPE_WEBHOOK_URL", "")

    def _headers(self, idempotency_key=None):
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Snippe-Version": self.api_version,
        }
        if idempotency_key:
            headers["Idempotency-Key"] = idempotency_key
        return headers

    # ------------------------------------------------------------------
    # PaymentGatewayBase implementation
    # ------------------------------------------------------------------
    def create_checkout(self, transaction, **kwargs):
        phone_number = kwargs.get("phone_number") or transaction.phone_number
        if not phone_number:
            raise GatewayError("Snippe (mobile) inahitaji namba ya simu.")

        full_name = (transaction.user.get_full_name() or "").strip()
        firstname, _, lastname = full_name.partition(" ")
        firstname = firstname or transaction.user.email.split("@")[0]
        lastname = lastname or "-"

        payload = {
            "payment_type": "mobile",
            "details": {
                "amount": int(transaction.amount),
                "currency": transaction.currency or "TZS",
            },
            "phone_number": phone_number,
            "customer": {
                "firstname": firstname,
                "lastname": lastname,
                "email": transaction.user.email,
            },
            "metadata": {"internal_reference": transaction.internal_reference},
        }
        if self.webhook_url:
            payload["webhook_url"] = self.webhook_url

        try:
            response = requests.post(
                f"{self.base_url}/v1/payments",
                json=payload,
                headers=self._headers(idempotency_key=transaction.internal_reference),
                timeout=30,
            )
            data = response.json()
        except (requests.RequestException, json.JSONDecodeError) as exc:
            raise GatewayError(f"Snippe create-payment imeshindwa: {exc}")

        if data.get("status") == "error":
            raise GatewayError(
                data.get("message", "Snippe imekataa ombi la malipo."), raw_response=data
            )

        inner = data.get("data", {})
        expires_at = parse_datetime(inner["expires_at"]) if inner.get("expires_at") else None

        result = {
            "gateway_order_id": inner.get("reference") or transaction.internal_reference,
            "checkout_url": None,
            "ussd_push_sent": True,
            "instructions": (
                f"Angalia simu yako ({phone_number}) kwa ujumbe wa USSD "
                "kukamilisha malipo (weka PIN yako ya mobile money)."
            ),
            "raw_response": data,
        }
        if expires_at:
            result["expires_at"] = expires_at
        return result

    def verify_payment(self, transaction):
        reference = transaction.gateway_order_id or transaction.internal_reference
        try:
            response = requests.get(
                f"{self.base_url}/v1/payments/{reference}",
                headers=self._headers(),
                timeout=30,
            )
            data = response.json()
        except (requests.RequestException, json.JSONDecodeError) as exc:
            raise GatewayError(f"Snippe status-check imeshindwa: {exc}")

        if data.get("status") == "error":
            return "pending", data

        gw_status = str(data.get("data", {}).get("status", "")).lower()
        if gw_status == "completed":
            return "success", data
        if gw_status in ("failed", "voided", "expired"):
            return "failed", data
        return "pending", data

    def parse_webhook(self, request):
        raw_body = request.body  # LAZIMA iwe bytes ghafi — angalia doc string ya faili hili
        timestamp = request.headers.get("X-Webhook-Timestamp", "")
        signature = request.headers.get("X-Webhook-Signature", "")

        # FAIL-CLOSED: bila timestamp/signature, ombi HALIAMINIWI kamwe.
        if not timestamp or not signature:
            raise GatewayError(
                "Snippe webhook haina X-Webhook-Timestamp/X-Webhook-Signature — "
                "imekataliwa kwa usalama."
            )

        try:
            ts_int = int(timestamp)
        except ValueError:
            raise GatewayError(f"Snippe webhook timestamp si sahihi: {timestamp!r}")

        age = int(time.time()) - ts_int
        if age > WEBHOOK_MAX_AGE_SECONDS:
            raise GatewayError(
                f"Snippe webhook imechelewa mno (sekunde {age}) — inaweza kuwa 'replay attack', imekataliwa."
            )

        expected_sig = hmac.new(
            self.webhook_secret.encode("utf-8"),
            f"{timestamp}.".encode("utf-8") + raw_body,
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(expected_sig, signature):
            raise GatewayError("Snippe webhook signature si sahihi (uwezekano wa udanganyifu).")

        try:
            payload = json.loads(raw_body.decode("utf-8"))
        except (ValueError, UnicodeDecodeError) as exc:
            raise GatewayError(f"Snippe webhook payload si JSON sahihi: {exc}")

        event_type = payload.get("type", "")
        event_data = payload.get("data", {})

        if not event_type.startswith("payment."):
            # payout.* (au tukio jingine lisilohusu malipo ya mwanachama/
            # conference) — si jukumu la webhook hii, halina athari kwa
            # PaymentTransaction. Kataa kwa uwazi badala ya kujaribu
            # kuichakata kimakosa.
            raise GatewayError(
                f"Tukio '{event_type}' si 'payment.*' — halihusiani na PaymentTransaction, limepuuzwa."
            )

        internal_reference = (event_data.get("metadata") or {}).get("internal_reference")
        if not internal_reference:
            raise GatewayError(
                "Snippe webhook (payment.*) haina metadata.internal_reference — "
                "haiwezekani kutambua transaction yetu."
            )

        status = "success" if event_type == "payment.completed" else "failed"

        return {
            "internal_reference": internal_reference,
            "status": status,
            "gateway_transaction_id": event_data.get("reference") or event_data.get("external_reference"),
            "raw_response": payload,
        }
