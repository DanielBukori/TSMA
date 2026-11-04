from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from accounts.permissions import staff_can_view_any_transaction
from payments.gateways.base import GatewayError, WebhookNotApplicable
from payments.gateways.registry import available_gateways_info
from payments.models import Gateway, PaymentTransaction
from payments.payment_services import process_webhook


class AvailableGatewaysView(APIView):
    """Public: return configured gateway options for the frontend."""

    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"gateways": available_gateways_info()})


class GatewayWebhookView(APIView):
    """
    Njia ya KAWAIDA kwa webhook zote za gateway (Selcom, AzamPay, PayPal,
    Snippe). Subclass inaweka `gateway_code` pekee.

    Mtiririko:
      1. `gateway.parse_webhook()` huthibitisha saini ya ombi (fail-closed —
        angalia payments/gateways/selcom.py n.k.). Ombi lisilo na saini
        sahihi halifiki hatua ya 2.
      2. `process_webhook()` hulinganisha order_id/kiasi/currency na
        transaction yetu ya ndani, kisha kuiisasisha MARA MOJA tu (webhook
        ile ile ikirudiwa na gateway haihaiishi jambo mara ya pili).

    USALAMA wa kiufundi:
      - `authentication_classes = []`: gateway hutuma `Authorization`/`Digest`
        ya muundo wake wa kipekee, ambayo JWTAuthentication ingelikataa kwa
        401 kabla ya kuifikia hapa. Hapa uthibitisho ni saini ya gateway, siyo
        JWT.
      - `throttle_classes`: kila ombi lililokataliwa huandika tukio la usalama
        na kuchochea arifa, kwa hiyo kikomo cha maombi kwa IP kinazuia mtu
        kujaza hifadhi na arifa kwa mfululizo wa POST za takataka.
    """

    gateway_code = None
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        from security.models import SecurityEventType, SecuritySeverity
        from security.services import get_client_ip, log_event

        try:
            txn = process_webhook(self.gateway_code, request)
        except WebhookNotApplicable:
            # Tukio la kweli lisilohusu PaymentTransaction (mfano payout.*) —
            # tunaliridhia kwa HTTP 200 ili gateway likiache kurudia.
            return Response({"status": "ignored"})
        except GatewayError as exc:
            log_event(
                event_type=SecurityEventType.WEBHOOK_SIGNATURE_INVALID,
                severity=SecuritySeverity.HIGH,
                ip_address=get_client_ip(request),
                path=request.path,
                description=f"{self.gateway_code} webhook imekataliwa: {exc}",
                metadata={"gateway": str(self.gateway_code), "reason": str(exc)[:200]},
            )
            return Response(
                {"detail": "Webhook imekataliwa kwa usalama."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "status": "processed",
                "internal_reference": txn.internal_reference,
                "payment_status": txn.status,
            }
        )


class SelcomWebhookView(GatewayWebhookView):
    gateway_code = Gateway.SELCOM


class AzamPayWebhookView(GatewayWebhookView):
    gateway_code = Gateway.AZAMPAY


class PayPalWebhookView(GatewayWebhookView):
    gateway_code = Gateway.PAYPAL


class SnippeWebhookView(GatewayWebhookView):
    gateway_code = Gateway.SNIPPE


class MyTransactionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        transactions = PaymentTransaction.objects.filter(user=request.user).order_by("-created_at")
        return Response(
            [
                {
                    "internal_reference": txn.internal_reference,
                    "status": txn.status,
                    "amount": str(txn.amount),
                    "currency": txn.currency,
                    "gateway": txn.gateway,
                    "created_at": txn.created_at,
                }
                for txn in transactions
            ]
        )


class TransactionStatusView(APIView):
    """
    GET /api/payments/status/<internal_reference>/
    Hali ya muamala inaonekana kwa MMILIKI wake (au admin) pekee.

    Awali ilikuwa `AllowAny`: mtu yeyote aliyeshikilia (au kukisia)
    `internal_reference` angelichekiwa hali, kiasi na tarehe ya ulipaji ya
    mwingine. Reference zetu ni za nasibu (uuid), lakini hiyo si ruhusa ya
    kuichapisha kwa umma; uthibitisho wa kina bado hufanywa na saini ya
    gateway kwenye webhook, siyo na endpoint hii.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, internal_reference):
        queryset = PaymentTransaction.objects.filter(internal_reference=internal_reference)
        if not staff_can_view_any_transaction(request.user):
            queryset = queryset.filter(user=request.user)
        transaction = get_object_or_404(queryset)
        return Response({
            "internal_reference": transaction.internal_reference,
            "status": transaction.status,
            "amount": str(transaction.amount),
            "currency": transaction.currency,
            "gateway": transaction.gateway,
            "paid_at": transaction.paid_at,
        })

