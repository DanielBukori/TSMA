from rest_framework import serializers

from payments.gateways.registry import available_gateways, default_gateway, gateway_requires_phone

from publications.models import (
    AbstractSubmission,
    Publication,
    PublicationCategory,
    PublicationCommissionSettings,
    PublicationPurchase,
)


class PublicationCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = PublicationCategory
        fields = ("id", "name", "slug", "description")


class PublicationListSerializer(serializers.ModelSerializer):
    """
    Public: orodha ya machapisho. `file` haitolewi hapa kamwe — inaonekana
    tu kupitia detail/download endpoints ambazo zinathibitisha ruhusa.
    """

    category = PublicationCategorySerializer(read_only=True)

    class Meta:
        model = Publication
        fields = (
            "id",
            "title",
            "slug",
            "category",
            "authors",
            "abstract",
            "publication_year",
            "cover_image",
            "access_type",
            "price",
            "currency",
            "download_count",
            "view_count",
            "purchase_count",
        )


class PublicationDetailSerializer(serializers.ModelSerializer):
    """
    Public/Member/Buyer: chapisho kamili.

    USALAMA: hii KWA MAKUSUDI HAIRUDISHI `file` URL yoyote — hata kwa
    watumiaji wenye ruhusa. Kutoa `obj.file.url` moja kwa moja (hata kwa
    walio na access) kunatengeneza njia ya kupita authorization endapo
    /media/ itakuwa public kwa bahati mbaya upande wa deployment (nginx/
    storage). Badala yake, frontend inatumia `GET /<slug>/download/`
    (PublicationDownloadView) — endpoint INAYOTHIBITISHA ruhusa KILA
    wakati wa kupakua, na inatuma faili moja kwa moja kupitia Django
    (FileResponse) badala ya kutoa link inayoweza kusambazwa/kuhifadhiwa.
    """

    category = PublicationCategorySerializer(read_only=True)
    can_access_file = serializers.SerializerMethodField()
    has_purchased = serializers.SerializerMethodField()

    class Meta:
        model = Publication
        fields = (
            "id",
            "title",
            "slug",
            "category",
            "authors",
            "abstract",
            "publication_year",
            "cover_image",
            "access_type",
            "price",
            "currency",
            "can_access_file",
            "has_purchased",
            "download_count",
            "view_count",
            "purchase_count",
        )

    def get_can_access_file(self, obj):
        user = self.context["request"].user
        return obj.is_accessible_by(user)

    def get_has_purchased(self, obj):
        user = self.context["request"].user
        if not user.is_authenticated:
            return False
        return obj.purchases.filter(buyer=user, status="completed").exists()


class PublicationPurchaseInitiateSerializer(serializers.Serializer):
    """POST /api/publications/<slug>/purchase/ - anzisha ununuzi wa chapisho la PAID."""

    phone_number = serializers.CharField(required=False, allow_blank=True, default="")
    gateway = serializers.ChoiceField(choices=available_gateways(), default=default_gateway)
    payment_method = serializers.ChoiceField(
        choices=["mobile_money", "card", "bank_transfer"], default="mobile_money"
    )

    def validate(self, attrs):
        # Namba ya simu inahitajika TU kwa gateway za mobile money (si Manual/PayPal).
        if gateway_requires_phone(attrs.get("gateway")) and not (attrs.get("phone_number") or "").strip():
            raise serializers.ValidationError(
                {"phone_number": "Weka namba ya simu kwa ajili ya malipo."}
            )
        return attrs


class PublicationPurchaseSerializer(serializers.ModelSerializer):
    publication_title = serializers.CharField(source="publication.title", read_only=True)

    class Meta:
        model = PublicationPurchase
        fields = (
            "id",
            "publication",
            "publication_title",
            "amount_paid",
            "currency",
            "status",
            "created_at",
        )
        read_only_fields = fields


class AdminPublicationSerializer(serializers.ModelSerializer):
    """
    Kwa Content Editor/Board/Super Admin kupakia na kusimamia machapisho —
    ikiwemo kuweka bei na namba ya malipo ya mwandishi kwa PAID.
    """

    class Meta:
        model = Publication
        fields = (
            "id",
            "title",
            "slug",
            "category",
            "authors",
            "abstract",
            "publication_year",
            "cover_image",
            "file",
            "access_type",
            "price",
            "currency",
            "author_payout_name",
            "author_payout_phone_number",
            "is_published",
            "download_count",
            "view_count",
            "purchase_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "slug",
            "download_count",
            "view_count",
            "purchase_count",
            "created_at",
            "updated_at",
        )

    FINANCE_FIELDS = ("access_type", "price", "currency", "author_payout_name", "author_payout_phone_number")

    def validate(self, attrs):
        access_type = attrs.get("access_type", getattr(self.instance, "access_type", None))
        price = attrs.get("price", getattr(self.instance, "price", None))
        if access_type == "paid" and not price:
            raise serializers.ValidationError(
                {"price": "Bei inahitajika kwa chapisho la aina 'Paid'."}
            )

        # USALAMA (least privilege — separation of duties): Content Editor
        # wa kawaida anaweza kusimamia MAUDHUI (title, abstract, file, n.k.)
        # lakini SIYO fedha za chapisho (bei, aina ya ufikiaji, namba ya
        # malipo ya mwandishi). Fields hizo ni kwa Board/Super Admin pekee
        # — hii inapunguza hatari ya mtu mmoja aliye na akaunti ya
        # "content editor" kubadilisha bei au kuelekeza payout kwenda
        # namba nyingine.
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user and not (user.is_board_admin or user.is_super_admin):
            touched_finance_fields = [f for f in self.FINANCE_FIELDS if f in attrs]
            if touched_finance_fields:
                raise serializers.ValidationError(
                    {
                        field: "Ni Board/Super Admin pekee wanaoweza kubadilisha field hii."
                        for field in touched_finance_fields
                    }
                )
        return attrs


class AdminPublicationCommissionSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PublicationCommissionSettings
        fields = ("default_commission_percent", "payout_gateway", "updated_at")
        read_only_fields = ("updated_at",)


class AdminPublicationPurchaseSerializer(serializers.ModelSerializer):
    publication_title = serializers.CharField(source="publication.title", read_only=True)
    buyer_email = serializers.EmailField(source="buyer.email", read_only=True)
    author_payout_phone_number = serializers.CharField(
        source="publication.author_payout_phone_number", read_only=True
    )

    class Meta:
        model = PublicationPurchase
        fields = (
            "id",
            "publication_title",
            "buyer_email",
            "amount_paid",
            "currency",
            "commission_percent_snapshot",
            "tsma_commission_amount",
            "author_payout_amount",
            "author_payout_phone_number",
            "status",
            "payout_status",
            "payout_reference",
            "payout_failure_reason",
            "created_at",
        )
        read_only_fields = fields


class AbstractSubmissionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = AbstractSubmission
        fields = (
            "id",
            "title",
            "authors",
            "abstract_text",
            "keywords",
            "category",
            "supporting_file",
            "status",
            "submitted_at",
        )
        read_only_fields = ("id", "status", "submitted_at")


class AbstractSubmissionSerializer(serializers.ModelSerializer):
    category = PublicationCategorySerializer(read_only=True)
    submitted_by_name = serializers.CharField(
        source="submitted_by.get_full_name", read_only=True
    )

    class Meta:
        model = AbstractSubmission
        fields = (
            "id",
            "title",
            "authors",
            "abstract_text",
            "keywords",
            "category",
            "supporting_file",
            "submitted_by_name",
            "status",
            "review_notes",
            "submitted_at",
        )
        read_only_fields = fields


class AdminAbstractSubmissionSerializer(serializers.ModelSerializer):
    submitted_by_name = serializers.CharField(
        source="submitted_by.get_full_name", read_only=True
    )
    submitted_by_email = serializers.EmailField(source="submitted_by.email", read_only=True)
    category = PublicationCategorySerializer(read_only=True)

    class Meta:
        model = AbstractSubmission
        fields = (
            "id",
            "title",
            "authors",
            "abstract_text",
            "keywords",
            "category",
            "supporting_file",
            "submitted_by_name",
            "submitted_by_email",
            "status",
            "review_notes",
            "reviewed_by",
            "submitted_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "title",
            "authors",
            "abstract_text",
            "keywords",
            "category",
            "supporting_file",
            "submitted_by_name",
            "submitted_by_email",
            "submitted_at",
            "updated_at",
        )
