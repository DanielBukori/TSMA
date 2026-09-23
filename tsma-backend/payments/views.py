from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .gateways.base import GatewayError
from .gateways.registry import available_gateways_info
from .models import PaymentTransaction
from .serializers import PaymentTransactionSerializer
from .services import process_webhook, verify_and_sync


class AvailableGatewaysView(APIView):
    """
    GET /api/payments/gateways/ - Orodha ya payment gateways zilizosajiliwa
    (public — mtumiaji anahitaji kuona hii kabla hata ya ku-login kwenye
    baadhi ya fomu). Frontend (GatewaySelect.jsx) inajenga dropdown/buttons
    kutoka hapa moja kwa moja — gateway mpya ikiongezwa kwenye
    payments/gateways/registry.py, inatokea hapa AUTO, bila kugusa
    frontend.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        return Response(available_gateways_info())


def _handle_gateway_webhook(request, gateway_code, gateway_label):
    """
    Msaidizi wa pamoja kwa views zote za webhook (Selcom/AzamPay/PayPal) —
    epuka kurudia code ile ile mara tatu. Kila gateway bado ina URL yake
    ya wazi (si dynamic <str:code>) kwa usalama zaidi na uwazi wa nyaraka.
    """
    try:
        txn = process_webhook(gateway_code, request)
    except GatewayError as exc:
        # USALAMA: webhook iliyokataliwa (signature mbaya, amount
        # isiyolingana, n.k.) NI TUKIO LA KIUSALAMA — mtu anaweza kuwa
        # anajaribu kudanganya mfumo wa malipo. Rekodi + arifa + (kama
        # itarudiwa mara nyingi kutoka IP moja) auto-block.
        from security.models import SecurityEventType, SecuritySeverity
        from security.services import get_client_ip, log_event

        log_event(
            event_type=SecurityEventType.WEBHOOK_SIGNATURE_INVALID,
            severity=SecuritySeverity.HIGH,
            ip_address=get_client_ip(request),
            path=request.path,
            description=f"{gateway_label} webhook imekataliwa: {exc}",
        )
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    return Response({"detail": f"Webhook imepokelewa. Status: {txn.status}"})


class SelcomWebhookView(APIView):
    """
    POST /api/payments/webhook/selcom/
    Selcom inatuma callback hapa mara malipo yanapokamilika (au kushindwa).
    Haihitaji authentication ya mtumiaji (gateway ndiye anayeita), lakini
    signature ya Selcom inathibitishwa ndani ya gateway.parse_webhook().
    """

    permission_classes = [AllowAny]
    authentication_classes = []  # Webhook haitumii JWT ya mtumiaji

    def post(self, request):
        return _handle_gateway_webhook(request, "selcom", "Selcom")


class AzamPayWebhookView(APIView):
    """POST /api/payments/webhook/azampay/ — angalia payments/gateways/azampay.py."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        return _handle_gateway_webhook(request, "azampay", "AzamPay")


class PayPalWebhookView(APIView):
    """POST /api/payments/webhook/paypal/ — angalia payments/gateways/paypal.py."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        return _handle_gateway_webhook(request, "paypal", "PayPal")


class MyTransactionsView(ListAPIView):
    """GET /api/payments/my-transactions/ - Historia ya malipo ya mtumiaji aliye-login."""

    serializer_class = PaymentTransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return PaymentTransaction.objects.filter(user=self.request.user)


class TransactionStatusView(RetrieveAPIView):
    """
    GET /api/payments/status/<internal_reference>/
    Inaangalia status ya sasa, na kama bado 'processing', inauliza gateway
    moja kwa moja (poll) kama fallback endapo webhook haikufika.
    """

    serializer_class = PaymentTransactionSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "internal_reference"

    def get_queryset(self):
        return PaymentTransaction.objects.filter(user=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        txn = get_object_or_404(
            self.get_queryset(), internal_reference=kwargs["internal_reference"]
        )
        if txn.status == "processing":
            txn = verify_and_sync(txn)
        serializer = self.get_serializer(txn)
        return Response(serializer.data)
