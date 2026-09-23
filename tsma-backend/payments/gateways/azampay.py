"""
AzamPay Gateway Adapter.

MUHIMU (soma kabla ya kuwasha live): Endpoints na muundo wa payload hapa
chini vinafuata muundo wa jumla wa AzamPay API (Authenticator + MNO
Checkout) kama ulivyoelezwa kwenye nyaraka za awali za AzamPay Developer
Docs (developers.azampay.co.tz). AzamPay wanaweza kubadilisha maelezo
madogo (jina la field, path ya endpoint) — SINA uwezo wa kutembelea
mtandao kuthibitisha real-time. KABLA ya kwenda live:
1. Sajili Partner/Merchant account: https://developers.azampay.co.tz
2. Pata App Name, Client ID, Client Secret (sandbox kwanza)
3. Thibitisha endpoints/field names dhidi ya nyaraka za sasa au Postman
   collection watakayokupa AzamPay support
4. Badilisha AZAMPAY_ENV kutoka "sandbox" kwenda "production" kwenye .env

USALAMA (fail-closed kwa webhook): Callback ya AzamPay HAINA HMAC
signature iliyoandikwa wazi kwenye nyaraka za umma (tofauti na Selcom).
Kwa hiyo TUNAKATAA kuamini payload ya webhook peke yake — parse_webhook()
inatumia webhook TU kama "kengele" ya kuuliza tena AzamPay moja kwa moja
(server-to-server, verify_payment) kupata hali HALISI kabla ya kubadilisha
chochote. Hii ndiyo maana ya "fail-closed": hatuamini ombi lisilothibitishwa.
"""

import json

import requests
from django.conf import settings

from payments.models import Gateway
from .base import GatewayError, PaymentGatewayBase

# Namba za simu (MSISDN) zinazoanza na hizi prefixes zinawekwa kwa network
# husika — AzamPay inataka jina la mtoa huduma (provider) wazi kwenye
# ombi la checkout, si namba peke yake. Orodha hii ni MWONGOZO wa awali
# tu — thibitisha dhidi ya orodha rasmi ya AzamPay (majina ya providers
# yanaweza kutofautiana kidogo, mfano "Halopesa" dhidi ya "HaloPesa").
_PREFIX_TO_PROVIDER = {
    "255074": "Tigo", "255071": "Tigo", "255065": "Tigo", "255067": "Tigo",
    "255078": "Airtel", "255068": "Airtel", "255069": "Airtel",
    "255075": "Mpesa", "255076": "Mpesa",
    "255062": "Halopesa", "255061": "Halopesa",
    "255077": "Azampesa",
}


def _guess_provider(msisdn):
    digits = "".join(ch for ch in (msisdn or "") if ch.isdigit())
    if digits.startswith("0"):
        digits = "255" + digits[1:]
    for prefix, provider in _PREFIX_TO_PROVIDER.items():
        if digits.startswith(prefix):
            return provider
    return "Airtel"  # default salama - REBEBISHA wakati wa testing halisi


class AzamPayGateway(PaymentGatewayBase):
    gateway_code = Gateway.AZAMPAY
    requires_phone = True
    supports_redirect = False  # MNO checkout - hakuna redirect page, ni USSD push
    required_settings = ["AZAMPAY_APP_NAME", "AZAMPAY_CLIENT_ID", "AZAMPAY_CLIENT_SECRET"]

    def __init__(self):
        self.auth_url = settings.AZAMPAY_AUTH_URL.rstrip("/")
        self.checkout_url = settings.AZAMPAY_CHECKOUT_URL.rstrip("/")
        self.app_name = settings.AZAMPAY_APP_NAME
        self.client_id = settings.AZAMPAY_CLIENT_ID
        self.client_secret = settings.AZAMPAY_CLIENT_SECRET

    def _get_access_token(self):
        payload = {
            "appName": self.app_name,
            "clientId": self.client_id,
            "clientSecret": self.client_secret,
        }
        try:
            response = requests.post(
                f"{self.auth_url}/AppRegistration/GenerateToken",
                json=payload,
                timeout=30,
            )
            data = response.json()
        except (requests.RequestException, json.JSONDecodeError) as exc:
            raise GatewayError(f"AzamPay auth imeshindwa: {exc}")

        token = (data.get("data") or {}).get("accessToken") or data.get("accessToken")
        if not token:
            raise GatewayError("AzamPay haikurudisha access token.", raw_response=data)
        return token

    # ------------------------------------------------------------------
    # PaymentGatewayBase implementation
    # ------------------------------------------------------------------
    def create_checkout(self, transaction, **kwargs):
        phone_number = kwargs.get("phone_number") or transaction.phone_number
        if not phone_number:
            raise GatewayError("AzamPay inahitaji namba ya simu (mobile money).")

        provider = kwargs.get("mno_provider") or _guess_provider(phone_number)
        token = self._get_access_token()

        payload = {
            "accountNumber": phone_number,
            "amount": str(transaction.amount),
            "currency": transaction.currency or "TZS",
            "externalId": transaction.internal_reference,
            "provider": provider,
        }
        try:
            response = requests.post(
                f"{self.checkout_url}/azampay/mno/checkout",
                json=payload,
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                timeout=30,
            )
            data = response.json()
        except (requests.RequestException, json.JSONDecodeError) as exc:
            raise GatewayError(f"AzamPay checkout imeshindwa: {exc}")

        # AzamPay kwa kawaida inarudisha success=True/statusCode 200 pale
        # ombi limepokelewa (SI pale malipo yamekamilika - hiyo bado
        # inasubiriwa kwa USSD push kwenye simu ya mteja).
        if data.get("success") is False:
            raise GatewayError(
                data.get("message", "AzamPay imekataa ombi la checkout."), raw_response=data
            )

        return {
            "gateway_order_id": data.get("transactionId") or transaction.internal_reference,
            "checkout_url": None,
            "ussd_push_sent": True,
            "instructions": (
                f"Angalia simu yako ({phone_number}) kwa ujumbe wa {provider} "
                "kukamilisha malipo (weka PIN yako)."
            ),
            "raw_response": data,
        }

    def verify_payment(self, transaction):
        """
        AzamPay - endpoint ya "order status" ya moja kwa moja haikuandikwa
        wazi kwenye nyaraka za umma wakati huu (tofauti na Selcom). Baadhi
        ya miradi hutumia tu MNO callback pekee. IKIWA AzamPay watakupa
        endpoint ya status check wakati wa sandbox onboarding, jaza hapa
        (angalia AZAMPAY_STATUS_URL kwenye settings.py - imeachwa tupu
        kwa makusudi). Kwa sasa, tunarudisha "pending" salama - mfumo
        utaendelea kutegemea webhook (na verify_payment hii hii tena baada
        ya muda, kupitia polling ya frontend).
        """
        if not settings.AZAMPAY_STATUS_URL:
            return "pending", {"note": "AZAMPAY_STATUS_URL haijawekwa - thibitisha na AzamPay support"}
        try:
            token = self._get_access_token()
            response = requests.get(
                settings.AZAMPAY_STATUS_URL,
                params={"externalId": transaction.internal_reference},
                headers={"Authorization": f"Bearer {token}"},
                timeout=30,
            )
            data = response.json()
        except (requests.RequestException, json.JSONDecodeError) as exc:
            raise GatewayError(f"AzamPay status-check imeshindwa: {exc}")

        gw_status = str(data.get("transactionstatus") or data.get("status") or "").lower()
        if gw_status in ("success", "completed"):
            return "success", data
        if gw_status in ("failed", "declined", "cancelled"):
            return "failed", data
        return "pending", data

    def parse_webhook(self, request):
        try:
            payload = json.loads(request.body.decode("utf-8"))
        except (ValueError, UnicodeDecodeError) as exc:
            raise GatewayError(f"AzamPay webhook payload si JSON sahihi: {exc}")

        internal_reference = (
            payload.get("externalId") or payload.get("reference") or payload.get("utilityref")
        )
        if not internal_reference:
            raise GatewayError("AzamPay webhook haina externalId/reference.")

        # FAIL-CLOSED: hatuamini "transactionstatus" ya payload peke yake
        # (hakuna signature iliyothibitishwa kwenye nyaraka za umma za
        # AzamPay). Tunauliza AzamPay wenyewe (server-to-server) kupata
        # hali halisi kabla ya kuchakata chochote. Kama AZAMPAY_STATUS_URL
        # haijawekwa bado, tunakataa webhook kwa usalama badala ya
        # kuamini payload isiyothibitishwa - ongeza status endpoint kabla
        # ya kwenda live.
        if not settings.AZAMPAY_STATUS_URL:
            raise GatewayError(
                "AZAMPAY_STATUS_URL haijawekwa - haiwezekani kuthibitisha "
                "webhook hii kwa usalama (fail-closed). Ongeza status "
                "endpoint kwenye .env kabla ya kutumia AzamPay live."
            )

        token = self._get_access_token()
        try:
            response = requests.get(
                settings.AZAMPAY_STATUS_URL,
                params={"externalId": internal_reference},
                headers={"Authorization": f"Bearer {token}"},
                timeout=30,
            )
            verify_data = response.json()
        except (requests.RequestException, json.JSONDecodeError) as exc:
            raise GatewayError(f"AzamPay webhook verification imeshindwa: {exc}")

        gw_status = str(verify_data.get("transactionstatus") or "").lower()
        status = "success" if gw_status in ("success", "completed") else "failed"

        return {
            "internal_reference": internal_reference,
            "status": status,
            "gateway_transaction_id": payload.get("transactionId") or payload.get("msisdn_ref"),
            "raw_response": {"webhook": payload, "verified": verify_data},
        }
