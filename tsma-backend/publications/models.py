from decimal import Decimal

from django.conf import settings
from django.db import models
from django.utils.text import slugify
from django.utils.translation import gettext_lazy as _

from common.validators import validate_document_max_15mb, validate_image_max_8mb, validate_pdf_max_20mb

from .storage import PublicationFileStorage


class PublicationCategory(models.Model):
    """
    Kategoria za machapisho (mfano: Uchumi wa Michezo, Uongozi wa Michezo,
    Sayansi ya Michezo) — inasimamiwa na Admin, siyo hardcoded, ili
    kategoria mpya ziweze kuongezwa wakati wowote bila kugusa code.
    """

    name = models.CharField(max_length=150, unique=True)
    slug = models.SlugField(max_length=170, unique=True, blank=True)
    description = models.TextField(blank=True)

    class Meta:
        verbose_name = _("Kategoria ya Machapisho")
        verbose_name_plural = _("Kategoria za Machapisho")
        ordering = ["name"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class PublicationAccessType(models.TextChoices):
    FREE = "free", _("Bure kwa Wote")
    MEMBER_ONLY = "member_only", _("Wanachama Pekee (Uanachama)")
    PAID = "paid", _("Inanunuliwa (Paid)")


class Publication(models.Model):
    """
    Chapisho la Kitaaluma (research paper, journal, report). Kila chapisho
    lina aina MOJA ya ufikiaji (`access_type`):

    - FREE: kwa wote, bila malipo.
    - MEMBER_ONLY: kwa wanachama active pekee (ada ya uanachama tayari
      inagharamia hili — hakuna malipo ya ziada kwa chapisho hili moja).
    - PAID: mtu YEYOTE (hata asiye mwanachama) ananunua chapisho hili
      moja moja. TSMA inakata commission (% inayosimamiwa na Admin
      kupitia PublicationCommissionSettings), na mwandishi analipwa
      sehemu iliyobaki MOJA KWA MOJA (automated payout) baada ya malipo
      kufanikiwa — angalia `PublicationPurchase` na
      `services/payout_handler.py`.
    """

    title = models.CharField(_("Kichwa cha Chapisho"), max_length=300)
    slug = models.SlugField(max_length=330, unique=True, blank=True)

    category = models.ForeignKey(
        PublicationCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="publications",
    )

    authors = models.CharField(
        _("Waandishi"), max_length=500,
        help_text=_("Majina ya waandishi, yaliyotenganishwa kwa comma."),
    )
    abstract = models.TextField(_("Muhtasari (Abstract)"))
    publication_year = models.PositiveIntegerField(_("Mwaka wa Kuchapishwa"), db_index=True)

    cover_image = models.ImageField(
        _("Picha ya Jalada (Hiari)"), upload_to="publications/covers/", blank=True, null=True,
        validators=validate_image_max_8mb,
    )
    file = models.FileField(
        _("Faili la Chapisho (PDF)"), upload_to="publications/files/",
        storage=PublicationFileStorage(),
        help_text=_("Faili litakalopakuliwa au kusomwa online."),
        validators=validate_pdf_max_20mb,
    )

    access_type = models.CharField(
        _("Aina ya Ufikiaji"), max_length=15,
        choices=PublicationAccessType.choices, default=PublicationAccessType.FREE,
    )

    # -- Fields za PAID pekee --
    price = models.DecimalField(
        _("Bei (kwa PAID pekee)"), max_digits=12, decimal_places=2,
        null=True, blank=True,
    )
    currency = models.CharField(max_length=3, default="TZS")

    author_payout_name = models.CharField(
        _("Jina la Mwandishi (kwa Malipo)"), max_length=200, blank=True,
        help_text=_("Jina litakalotumika kwenye malipo ya mwandishi (payout)."),
    )
    author_payout_phone_number = models.CharField(
        _("Namba ya Simu ya Mwandishi (kwa Malipo)"), max_length=20, blank=True,
        help_text=_("Mobile money namba itakayopokea malipo moja kwa moja baada ya mauzo."),
    )

    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="publications_uploaded",
    )

    is_published = models.BooleanField(default=True)
    download_count = models.PositiveIntegerField(default=0)
    view_count = models.PositiveIntegerField(default=0)
    purchase_count = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Chapisho la Kitaaluma")
        verbose_name_plural = _("Machapisho ya Kitaaluma")
        ordering = ["-publication_year", "-created_at"]
        indexes = [
            models.Index(fields=["is_published", "access_type"]),
            models.Index(fields=["publication_year"]),
        ]

    def __str__(self):
        return f"{self.title} ({self.publication_year})"

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.title)
            slug = base_slug
            counter = 1
            while Publication.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def increment_views(self):
        Publication.objects.filter(pk=self.pk).update(
            view_count=models.F("view_count") + 1
        )

    def increment_downloads(self):
        Publication.objects.filter(pk=self.pk).update(
            download_count=models.F("download_count") + 1
        )

    def is_accessible_by(self, user):
        """Public/free ni kwa wote; member-only ni kwa wanachama active; paid ni kwa waliolinunua."""
        if self.access_type == PublicationAccessType.FREE:
            return True

        if not user or not user.is_authenticated:
            return False
        if getattr(user, "is_super_admin", False) or getattr(user, "is_board_admin", False):
            return True

        if self.access_type == PublicationAccessType.MEMBER_ONLY:
            membership = getattr(user, "membership", None)
            return bool(membership and membership.is_active_member)

        if self.access_type == PublicationAccessType.PAID:
            return self.purchases.filter(
                buyer=user, status=PublicationPurchaseStatus.COMPLETED
            ).exists()

        return False

    @property
    def commission_percent(self):
        return PublicationCommissionSettings.load().default_commission_percent

    def calculate_split(self):
        """Rudisha (tsma_commission_amount, author_payout_amount) kwa bei ya sasa."""
        if not self.price:
            return Decimal("0"), Decimal("0")
        commission = (self.price * self.commission_percent) / Decimal("100")
        commission = commission.quantize(Decimal("0.01"))
        author_share = self.price - commission
        return commission, author_share


class PublicationCommissionSettings(models.Model):
    """
    Mipangilio ya Commission — SINGLETON, inasimamiwa na Admin kupitia
    Django Admin. Asilimia MOJA ya kudumu inatumika kwa machapisho YOTE
    ya PAID (kama ulivyochagua), badala ya kuweka kwa kila chapisho.
    """

    default_commission_percent = models.DecimalField(
        _("Asilimia ya TSMA (Commission %)"), max_digits=5, decimal_places=2, default=Decimal("20.00"),
        help_text=_("Mfano: 20.00 inamaanisha TSMA inachukua 20%%, mwandishi anapata 80%%."),
    )
    payout_gateway = models.CharField(
        _("Gateway ya Payout"), max_length=20, default="selcom",
        help_text=_("Gateway itakayotumika kutuma malipo kwa waandishi moja kwa moja."),
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Mipangilio ya Commission")
        verbose_name_plural = _("Mipangilio ya Commission")

    def __str__(self):
        return f"Commission: {self.default_commission_percent}%"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, _created = cls.objects.get_or_create(pk=1)
        return obj


class PublicationPurchaseStatus(models.TextChoices):
    PENDING_PAYMENT = "pending_payment", _("Inasubiri Malipo")
    COMPLETED = "completed", _("Imekamilika")
    CANCELLED = "cancelled", _("Imefutwa")


class PublicationPayoutStatus(models.TextChoices):
    NOT_APPLICABLE = "not_applicable", _("Haihusiki")
    PENDING = "pending", _("Inasubiri Kutumwa")
    PROCESSING = "processing", _("Inatumwa Sasa")
    PAID = "paid", _("Imelipwa")
    FAILED = "failed", _("Imeshindwa — Inahitaji Kuangaliwa")


class PublicationPurchase(models.Model):
    """
    Ununuzi wa chapisho moja (PAID) — kila ununuzi unahifadhi mgawanyo wa
    fedha (commission ya TSMA + sehemu ya mwandishi) wa WAKATI HUO (hata
    kama commission % itabadilika baadaye, rekodi hii inabaki sahihi ya
    kihistoria).
    """

    publication = models.ForeignKey(
        Publication, on_delete=models.CASCADE, related_name="purchases"
    )
    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="publication_purchases"
    )

    amount_paid = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default="TZS")

    commission_percent_snapshot = models.DecimalField(max_digits=5, decimal_places=2)
    tsma_commission_amount = models.DecimalField(max_digits=12, decimal_places=2)
    author_payout_amount = models.DecimalField(max_digits=12, decimal_places=2)

    status = models.CharField(
        max_length=20,
        choices=PublicationPurchaseStatus.choices,
        default=PublicationPurchaseStatus.PENDING_PAYMENT,
    )

    payout_status = models.CharField(
        max_length=20,
        choices=PublicationPayoutStatus.choices,
        default=PublicationPayoutStatus.PENDING,
    )
    # unique=True + null=True (SIYO blank string default): Postgres
    # inaruhusu NULL nyingi chini ya UNIQUE constraint, lakini haitaruhusu
    # "" (empty string) nyingi. Hii inahakikisha reference moja HAIWEZI
    # kutumika kwa payout mbili tofauti kwa bahati mbaya (defence-in-depth
    # ya database-level, ziada ya application-level lock).
    payout_reference = models.CharField(max_length=128, null=True, blank=True, unique=True)
    payout_failure_reason = models.CharField(max_length=255, blank=True)
    payout_attempted_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("Ununuzi wa Chapisho")
        verbose_name_plural = _("Ununuzi wa Machapisho")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.buyer.email} - {self.publication.title} ({self.status})"

    def complete_and_calculate_payout(self):
        """
        Inaitwa mara payment inapofanikiwa. USALAMA: kama tayari
        imekamilika (webhook replay), hii ni no-op — haihesabu upya wala
        haibadilishi payout_status iliyokwishawekwa na jaribio la awali.
        """
        if self.status == PublicationPurchaseStatus.COMPLETED:
            return

        commission, author_share = self.publication.calculate_split()
        self.commission_percent_snapshot = self.publication.commission_percent
        self.tsma_commission_amount = commission
        self.author_payout_amount = author_share
        self.status = PublicationPurchaseStatus.COMPLETED
        if not self.publication.author_payout_phone_number:
            self.payout_status = PublicationPayoutStatus.NOT_APPLICABLE
        self.save()

        Publication.objects.filter(pk=self.publication_id).update(
            purchase_count=models.F("purchase_count") + 1
        )


class AbstractSubmissionStatus(models.TextChoices):
    PENDING = "pending", _("Inasubiri Uhakiki")
    UNDER_REVIEW = "under_review", _("Inahakikiwa")
    ACCEPTED = "accepted", _("Imekubaliwa")
    REJECTED = "rejected", _("Imekataliwa")
    REVISION_REQUIRED = "revision_required", _("Inahitaji Marekebisho")


class AbstractSubmission(models.Model):
    """
    Uwasilishaji wa Kazi za Kitaaluma (Abstract Submission) kwa ajili ya
    mikutano (conferences) — kama roadmap ilivyoainisha kwenye Publications
    na Conferences.
    """

    title = models.CharField(_("Kichwa cha Kazi"), max_length=300)
    authors = models.CharField(_("Waandishi"), max_length=500)
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="abstract_submissions"
    )

    abstract_text = models.TextField(_("Maandishi ya Abstract"))
    keywords = models.CharField(
        _("Maneno Muhimu (Keywords)"), max_length=300, blank=True,
        help_text=_("Yaliyotenganishwa kwa comma."),
    )
    category = models.ForeignKey(
        PublicationCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="abstract_submissions",
    )

    supporting_file = models.FileField(
        _("Faili la Ziada (Hiari)"), upload_to="publications/abstracts/", blank=True, null=True,
        validators=validate_document_max_15mb,
    )

    status = models.CharField(
        max_length=20,
        choices=AbstractSubmissionStatus.choices,
        default=AbstractSubmissionStatus.PENDING,
    )
    review_notes = models.TextField(_("Maoni ya Wahakiki"), blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="abstracts_reviewed",
    )

    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Uwasilishaji wa Abstract")
        verbose_name_plural = _("Uwasilishaji wa Abstracts")
        ordering = ["-submitted_at"]

    def __str__(self):
        return f"{self.title} - {self.get_status_display()}"
