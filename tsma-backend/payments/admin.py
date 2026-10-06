from django.contrib import admin
from django.utils import timezone

from .models import ManualPaymentSettings, PaymentStatus, PaymentTransaction
from .services import dispatch_payment_succeeded


@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(admin.ModelAdmin):
    list_display = (
        "internal_reference",
        "user",
        "purpose",
        "gateway",
        "amount",
        "currency",
        "status",
        "expires_at",
        "created_at",
        "paid_at",
        "has_post_error",
    )
    list_filter = ("purpose", "gateway", "status", "payment_method")
    search_fields = (
        "internal_reference",
        "gateway_order_id",
        "gateway_transaction_id",
        "user__email",
        "phone_number",
    )
    readonly_fields = (
        "id",
        "internal_reference",
        "gateway_order_id",
        "gateway_transaction_id",
        "gateway_response",
        "created_at",
        "updated_at",
        "paid_at",
        "post_processing_error",
    )
    ordering = ("-created_at",)
    actions = ["confirm_manual_payment", "reprocess_after_payment"]

    @admin.display(boolean=True, description="Hitilafu baada ya malipo?")
    def has_post_error(self, obj):
        return bool(obj.post_processing_error)

    @admin.action(description="🔁 Rudia usindikaji baada ya malipo (uanachama/risiti/kitabu)")
    def reprocess_after_payment(self, request, queryset):
        """
        Kwa malipo yaliyo SUCCESS lakini uanachama haukuwezeshwa, risiti/kadi
        haikutengenezwa, au kitabu hakifunguki. Inaendesha tena hatua zote za
        baada ya malipo (ni salama kurudia - hazibadilishi kilichokamilika).
        """
        fixed, still_failing = 0, 0
        for txn in queryset.filter(status=PaymentStatus.SUCCESS):
            errors = dispatch_payment_succeeded(txn)
            if errors:
                still_failing += 1
                self.message_user(
                    request,
                    f"{txn.internal_reference}: bado kuna hitilafu - {errors[0][:300]}",
                    level="error",
                )
            else:
                fixed += 1
        if fixed:
            self.message_user(request, f"{fixed} zimekamilishwa kikamilifu.")
        if not fixed and not still_failing:
            self.message_user(request, "Hakuna malipo yenye hali ya SUCCESS kwenye uchaguzi.", level="warning")

    @admin.action(description="✅ Thibitisha malipo yamepokelewa (manual pekee)")
    def confirm_manual_payment(self, request, queryset):
        """
        Kwa transaction za gateway='manual' pekee — Admin/Finance amethibitisha
        (kwa mkono) kwamba fedha zimefika benki/ofisini (baada ya kupokea
        ujumbe wa mwanachama), hivyo anaithibitisha hapa. Hii inaita
        mark_success() na kutuma payment_succeeded signal — sawa kabisa na
        Selcom/AzamPay zingekuwa zimethibitisha moja kwa moja (uanachama
        unawezeshwa, risiti/kadi zinatengenezwa, n.k.).
        """
        skipped_wrong_gateway = 0
        skipped_wrong_status = 0
        confirmed = 0

        for txn in queryset:
            if txn.gateway != "manual":
                skipped_wrong_gateway += 1
                continue
            if txn.status == PaymentStatus.SUCCESS:
                continue  # tayari imethibitishwa - salama kuruka (idempotent)
            # EXPIRED inaruhusiwa pia: mtu anaweza kulipa/kutuma uthibitisho
            # baada ya masaa 24 — Admin akijiridhisha fedha zimefika, anaweza
            # kuthibitisha na uanachama/risiti vitawezeshwa kawaida.
            if txn.status not in (
                PaymentStatus.PENDING,
                PaymentStatus.PROCESSING,
                PaymentStatus.EXPIRED,
            ):
                skipped_wrong_status += 1
                continue

            txn.mark_success(raw_response={"confirmed_by_admin": request.user.email, "confirmed_at": str(timezone.now())})
            errors = dispatch_payment_succeeded(txn)
            if errors:
                self.message_user(
                    request,
                    f"{txn.internal_reference}: malipo yamethibitishwa LAKINI hatua ya baadaye "
                    f"imeshindwa ({errors[0][:300]}). Rekebisha kisha tumia 'Rudia usindikaji'.",
                    level="error",
                )
            confirmed += 1

        if confirmed:
            self.message_user(request, f"{confirmed} zimethibitishwa kwa mafanikio.")
        if skipped_wrong_gateway:
            self.message_user(
                request,
                f"{skipped_wrong_gateway} zimerukwa - si za gateway 'manual'.",
                level="warning",
            )
        if skipped_wrong_status:
            self.message_user(
                request,
                f"{skipped_wrong_status} zimerukwa - hali yake si pending/processing/expired.",
                level="warning",
            )


@admin.register(ManualPaymentSettings)
class ManualPaymentSettingsAdmin(admin.ModelAdmin):
    """
    Weka hapa akaunti ya benki na namba ya WhatsApp/simu ya kupokea
    uthibitisho wa malipo ya mkono. Mwanachama anayechagua "Manual" kwenye
    checkout ataona taarifa hizi moja kwa moja — hakuna deployment mpya
    inayohitajika ukibadilisha.
    """

    fieldsets = (
        ("Akaunti ya Benki", {
            "fields": ("bank_name", "account_name", "account_number", "swift_code"),
        }),
        ("Uthibitisho", {
            "fields": ("confirm_phone", "confirm_deadline_hours"),
        }),
        ("Maelezo ya Ziada (hiari)", {
            "fields": ("extra_instructions_sw", "extra_instructions_en"),
        }),
    )
    readonly_fields = ("updated_at",)

    def has_add_permission(self, request):
        return not ManualPaymentSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False
