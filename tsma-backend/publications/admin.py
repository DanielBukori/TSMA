from django.contrib import admin

from .models import (
    AbstractSubmission,
    Publication,
    PublicationCategory,
    PublicationCommissionSettings,
    PublicationPurchase,
)


@admin.register(PublicationCategory)
class PublicationCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(PublicationCommissionSettings)
class PublicationCommissionSettingsAdmin(admin.ModelAdmin):
    """
    Hapa Admin anaweka ASILIMIA MOJA ya kudumu ya TSMA (commission)
    inayotumika kwa machapisho YOTE ya 'Paid'.
    """

    list_display = ("default_commission_percent", "payout_gateway", "updated_at")

    def has_add_permission(self, request):
        return not PublicationCommissionSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Publication)
class PublicationAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "category",
        "authors",
        "publication_year",
        "access_type",
        "price",
        "purchase_count",
        "is_published",
    )
    list_filter = ("access_type", "is_published", "category", "publication_year")
    search_fields = ("title", "authors", "abstract")
    prepopulated_fields = {"slug": ("title",)}
    readonly_fields = ("download_count", "view_count", "purchase_count", "created_at", "updated_at")
    ordering = ("-publication_year", "-created_at")

    fieldsets = (
        (None, {"fields": ("title", "slug", "category", "authors", "abstract", "publication_year")}),
        ("Faili", {"fields": ("cover_image", "file")}),
        (
            "Ufikiaji",
            {
                "fields": ("access_type", "price", "currency"),
                "description": (
                    "FREE: kwa wote. MEMBER_ONLY: wanachama active pekee. "
                    "PAID: mtu yeyote ananunua — weka bei na taarifa za malipo "
                    "ya mwandishi hapa chini."
                ),
            },
        ),
        (
            "Malipo ya Mwandishi (kwa PAID pekee)",
            {
                "fields": ("author_payout_name", "author_payout_phone_number"),
                "description": (
                    "Mfumo utatuma sehemu ya mwandishi MOJA KWA MOJA kwa namba "
                    "hii mara mnunuzi analipa (baada ya kukata commission)."
                ),
            },
        ),
        ("Takwimu", {"fields": ("download_count", "view_count", "purchase_count")}),
        ("Uchapishaji", {"fields": ("is_published", "created_at", "updated_at")}),
    )

    def save_model(self, request, obj, form, change):
        if not change:
            obj.uploaded_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(PublicationPurchase)
class PublicationPurchaseAdmin(admin.ModelAdmin):
    """
    Hapa Admin anaona mauzo yote — hasa payout_status=FAILED (payout
    iliyoshindwa) inayohitaji kushughulikiwa kwa mkono (kumlipa mwandishi
    nje ya mfumo, kisha kuweka 'Paid' hapa kwa rekodi).
    """

    list_display = (
        "publication",
        "buyer",
        "amount_paid",
        "tsma_commission_amount",
        "author_payout_amount",
        "status",
        "payout_status",
        "created_at",
    )
    list_filter = ("status", "payout_status")
    search_fields = ("publication__title", "buyer__email")
    readonly_fields = (
        "publication",
        "buyer",
        "amount_paid",
        "currency",
        "commission_percent_snapshot",
        "tsma_commission_amount",
        "author_payout_amount",
        "status",
        "created_at",
    )


@admin.action(description="Weka status: Imekubaliwa (Accepted)")
def mark_accepted(modeladmin, request, queryset):
    queryset.update(status="accepted", reviewed_by=request.user)


@admin.action(description="Weka status: Imekataliwa (Rejected)")
def mark_rejected(modeladmin, request, queryset):
    queryset.update(status="rejected", reviewed_by=request.user)


@admin.register(AbstractSubmission)
class AbstractSubmissionAdmin(admin.ModelAdmin):
    list_display = ("title", "authors", "submitted_by", "status", "submitted_at")
    list_filter = ("status", "category")
    search_fields = ("title", "authors", "abstract_text", "keywords")
    readonly_fields = ("submitted_by", "submitted_at", "updated_at")
    actions = [mark_accepted, mark_rejected]
