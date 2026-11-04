"""
Treasurer/Accountant API surface (/api/finance/*).

Everything here is money-facing, so one permission covers the whole module:
IsFinanceAdmin. Reads aggregate PaymentTransaction rows; the write endpoints
are the manual-confirmation workflow that used to exist only as a Django Admin
action.
"""

from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsFinanceAdmin

from .gateways.base import GatewayError
from .models import ManualPaymentSettings, PaymentStatus, PaymentTransaction
from .payment_services import dispatch_payment_succeeded
from .serializers import FinanceTransactionSerializer, ManualPaymentSettingsSerializer

# A manual payment can still be confirmed after its deadline: members do pay
# late and the Treasurer verifies the money independently of the timer.
CONFIRMABLE_STATUSES = (
    PaymentStatus.PENDING,
    PaymentStatus.PROCESSING,
    PaymentStatus.EXPIRED,
)


class FinanceSummaryView(APIView):
    """GET /api/finance/summary/ — headline figures for the accountant dashboard."""

    permission_classes = [IsAuthenticated, IsFinanceAdmin]

    def get(self, request):
        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        week_ago = now - timedelta(days=7)

        success = PaymentTransaction.objects.filter(status=PaymentStatus.SUCCESS)
        pending = PaymentTransaction.objects.filter(
            status__in=CONFIRMABLE_STATUSES, gateway="manual"
        )

        by_purpose = list(
            success.values("purpose").annotate(total=Sum("amount"), count=Count("id"))
        )
        by_gateway = list(
            success.values("gateway").annotate(total=Sum("amount"), count=Count("id"))
        )
        monthly = list(
            success.annotate(month=TruncMonth("paid_at"))
            .values("month")
            .annotate(total=Sum("amount"), count=Count("id"))
            .order_by("-month")[:6]
        )

        return Response(
            {
                "collected_total": _amount(success.aggregate(v=Sum("amount"))["v"]),
                "collected_this_month": _amount(
                    success.filter(paid_at__gte=month_start).aggregate(v=Sum("amount"))["v"]
                ),
                "collected_last_7_days": _amount(
                    success.filter(paid_at__gte=week_ago).aggregate(v=Sum("amount"))["v"]
                ),
                "successful_count": success.count(),
                "awaiting_confirmation": {
                    "count": pending.count(),
                    "amount": _amount(pending.aggregate(v=Sum("amount"))["v"]),
                },
                "failed_count": PaymentTransaction.objects.filter(
                    status=PaymentStatus.FAILED
                ).count(),
                "post_processing_failures": PaymentTransaction.objects.exclude(
                    post_processing_error=""
                ).count(),
                "by_purpose": [
                    {"purpose": row["purpose"], "total": _amount(row["total"]), "count": row["count"]}
                    for row in by_purpose
                ],
                "by_gateway": [
                    {"gateway": row["gateway"], "total": _amount(row["total"]), "count": row["count"]}
                    for row in by_gateway
                ],
                "monthly": [
                    {
                        "month": row["month"].strftime("%Y-%m") if row["month"] else None,
                        "total": _amount(row["total"]),
                        "count": row["count"],
                    }
                    for row in monthly
                ],
                "manual_payments_ready": ManualPaymentSettings.load().is_ready,
                "currency": "TZS",
            }
        )


class FinanceTransactionListView(ListAPIView):
    """GET /api/finance/transactions/ — the ledger, filterable and paginated."""

    permission_classes = [IsAuthenticated, IsFinanceAdmin]
    serializer_class = FinanceTransactionSerializer
    queryset = PaymentTransaction.objects.select_related("user").all()

    def get_queryset(self):
        params = self.request.query_params
        queryset = self.queryset
        for field in ("status", "purpose", "gateway"):
            value = params.get(field)
            if value:
                queryset = queryset.filter(**{field: value})
        search = params.get("q")
        if search:
            queryset = queryset.filter(
                Q(internal_reference__icontains=search)
                | Q(gateway_transaction_id__icontains=search)
                | Q(phone_number__icontains=search)
                | Q(user__email__icontains=search)
                | Q(user__first_name__icontains=search)
                | Q(user__last_name__icontains=search)
            )
        if params.get("awaiting") == "1":
            queryset = queryset.filter(
                status__in=CONFIRMABLE_STATUSES, gateway="manual"
            )
        date_field = params.get("date_field", "created_at")
        if date_field in ("created_at", "paid_at"):
            if params.get("from"):
                queryset = queryset.filter(**{f"{date_field}__date__gte": params["from"]})
            if params.get("to"):
                queryset = queryset.filter(**{f"{date_field}__date__lte": params["to"]})
        return queryset.order_by("-created_at")


class FinanceTransactionConfirmView(APIView):
    """POST /api/finance/transactions/<reference>/confirm/ — money received offline."""

    permission_classes = [IsAuthenticated, IsFinanceAdmin]

    def post(self, request, internal_reference):
        transaction = _get_transaction(internal_reference)
        if transaction.status == PaymentStatus.SUCCESS:
            return Response(FinanceTransactionSerializer(transaction).data)
        if transaction.gateway != "manual":
            raise ValidationError(
                {"detail": "Ni malipo ya mkono (manual) ndayo yanayothibitishwa hapa."}
            )
        if transaction.status not in CONFIRMABLE_STATUSES:
            raise ValidationError(
                {"detail": f"Hali '{transaction.get_status_display()}' haithibitishwi kwa mkono."}
            )

        transaction.mark_success(
            raw_response={
                "confirmed_by": request.user.email,
                "confirmed_at": timezone.now().isoformat(),
                "gateway_reference": request.data.get("gateway_reference", ""),
            }
        )
        errors = dispatch_payment_succeeded(transaction)
        _audit(request, transaction, "confirmed")

        return Response(
            {
                "transaction": FinanceTransactionSerializer(transaction).data,
                "post_processing_errors": errors,
            }
        )


class FinanceTransactionRejectView(APIView):
    """POST /api/finance/transactions/<reference>/reject/ — money never arrived."""

    permission_classes = [IsAuthenticated, IsFinanceAdmin]

    def post(self, request, internal_reference):
        reason = str(request.data.get("reason", "")).strip()
        if not reason:
            raise ValidationError({"detail": "Sababu inahitajika."})

        transaction = _get_transaction(internal_reference)
        if transaction.status == PaymentStatus.SUCCESS:
            raise ValidationError(
                {"detail": "Malipo yaliyo thibitishwa hayawezi kubadilishwa hapa."}
            )
        transaction.mark_failed(reason=reason[:255])
        _audit(request, transaction, "rejected")
        return Response(FinanceTransactionSerializer(transaction).data)


class FinanceTransactionReprocessView(APIView):
    """
    POST /api/finance/transactions/<reference>/reprocess/

    Re-runs the steps that follow a successful payment (membership activation,
    receipt, card). Receivers are idempotent, so this is safe to repeat.
    """

    permission_classes = [IsAuthenticated, IsFinanceAdmin]

    def post(self, request, internal_reference):
        transaction = _get_transaction(internal_reference)
        if transaction.status != PaymentStatus.SUCCESS:
            raise ValidationError({"detail": "Malipo hayyajawi SUCCESS."})
        errors = dispatch_payment_succeeded(transaction)
        return Response(
            {
                "transaction": FinanceTransactionSerializer(transaction).data,
                "post_processing_errors": errors,
            }
        )


class FinanceManualSettingsView(APIView):
    """
    GET/PATCH /api/finance/manual-settings/

    The bank account members pay into, edited by the Treasurer instead of
    Django Admin. Until it is filled, manual checkout stays closed.
    """

    permission_classes = [IsAuthenticated, IsFinanceAdmin]

    def get(self, request):
        settings_obj = ManualPaymentSettings.load()
        return Response(ManualPaymentSettingsSerializer(settings_obj).data)

    def patch(self, request):
        settings_obj = ManualPaymentSettings.load()
        serializer = ManualPaymentSettingsSerializer(
            settings_obj, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        _log(request, "manual payment settings updated")
        return Response(serializer.data)


def _get_transaction(internal_reference):
    transaction = PaymentTransaction.objects.filter(
        internal_reference=internal_reference
    ).select_related("user").first()
    if transaction is None:
        raise ValidationError({"detail": "Muamala haujapatikana."})
    return transaction


def _amount(value):
    """Sums come back as float on SQLite, so normalise to two decimal places."""
    return str(Decimal(value or 0).quantize(Decimal("0.01")))


def _audit(request, transaction, action):
    _log(
        request,
        f"{action}: {transaction.internal_reference} "
        f"({transaction.amount} {transaction.currency})",
    )


def _log(request, description):
    from security.models import SecurityEventType, SecuritySeverity
    from security.services import get_client_ip, log_event

    log_event(
        event_type=SecurityEventType.OTHER,
        severity=SecuritySeverity.LOW,
        ip_address=get_client_ip(request),
        user=request.user,
        path=request.path,
        description=f"{request.user.get_full_name()} {description}",
    )
