import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.text import slugify
from django.utils.translation import gettext_lazy as _

from common.validators import validate_image_max_8mb


class Conference(models.Model):
    """
    Mkutano Mkubwa (Conference) — TSMA inapanga angalau mmoja kwa mwaka.
    """

    title = models.CharField(_("Conference Tittle"), max_length=255)
    slug = models.SlugField(max_length=280, unique=True, blank=True)

    description = models.TextField(_("General explanations"))
    theme = models.CharField(_("Theme (Kaulimbiu)"), max_length=255, blank=True)

    venue_name = models.CharField(_("Conference hall name/Place"), max_length=255)
    city = models.CharField(_("City/Region"), max_length=100)
    country = models.CharField(_("Country"), max_length=100, default="Tanzania")
    physical_address = models.TextField(blank=True)

    start_date = models.DateField(_("Start date"))
    end_date = models.DateField(_("End date"))
    registration_deadline = models.DateTimeField(_("Registration ending on"), null=True, blank=True)

    banner_image = models.ImageField(
        _("Cover Image"), upload_to="conferences/banners/", blank=True, null=True,
        validators=validate_image_max_8mb,
    )

    is_published = models.BooleanField(_("Published"), default=False)
    registration_open = models.BooleanField(_("Registration Opens"), default=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="conferences_created",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _(" Conference (Mkutano)")
        verbose_name_plural = _("Conferences (Mikutano)")
        ordering = ["-start_date"]

    def __str__(self):
        return f"{self.title} ({self.start_date.year})"

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.title)
            slug = base_slug
            counter = 1
            while Conference.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    @property
    def is_past(self):
        return self.end_date < timezone.now().date()

    @property
    def is_registration_still_open(self):
        if not self.registration_open:
            return False
        if self.registration_deadline and timezone.now() > self.registration_deadline:
            return False
        return not self.is_past


class ConferenceDay(models.Model):
    """Siku moja ya mkutano (mfano: 'Siku ya 1 — Ufunguzi')."""

    conference = models.ForeignKey(Conference, on_delete=models.CASCADE, related_name="days")
    day_number = models.PositiveIntegerField(_("Days Number"))
    date = models.DateField(_("Date"))
    title = models.CharField(_("Tittle of the day"), max_length=255, blank=True)

    class Meta:
        verbose_name = _("Conference date")
        verbose_name_plural = _("Conference days")
        ordering = ["day_number"]
        unique_together = ("conference", "day_number")

    def __str__(self):
        return f"{self.conference.title} - Siku {self.day_number}"


class SessionType(models.TextChoices):
    KEYNOTE = "keynote", _("Keynote")
    PANEL = "panel", _("Panel Discussion")
    WORKSHOP = "workshop", _("Workshop")
    PRESENTATION = "presentation", _("Presentation")
    BREAK = "break", _("Break/Tea")
    NETWORKING = "networking", _("Networking")
    ELECTORAL = "electoral", _("Uchaguzi/Electoral Congress")
    OTHER = "other", _("Other")


class ConferenceSession(models.Model):
    """
    Kikao ndani ya siku fulani ya mkutano — muda, mada, mzungumzaji, ukumbi.
    Hii ndiyo "ratiba kamili" (full schedule) roadmap iliyoainisha.
    """

    day = models.ForeignKey(ConferenceDay, on_delete=models.CASCADE, related_name="sessions")

    title = models.CharField(_("Tittle/Topic"), max_length=300)
    description = models.TextField(_("Description"), blank=True)
    session_type = models.CharField(
        max_length=20, choices=SessionType.choices, default=SessionType.PRESENTATION
    )

    start_time = models.TimeField(_("Starting time"))
    end_time = models.TimeField(_("Ending time"))

    speaker_name = models.CharField(_("Name of the speaker"), max_length=200, blank=True)
    speaker_title = models.CharField(
        _("Occupation/Institution of the speaker"), max_length=255, blank=True
    )
    speaker_bio = models.TextField(_("Speaker's profile"), blank=True)
    speaker_photo = models.ImageField(
        upload_to="conferences/speakers/", blank=True, null=True,
        validators=validate_image_max_8mb,
    )

    venue_hall = models.CharField(_("Venue/Hall"), max_length=150, blank=True)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = _("Conference meeting")
        verbose_name_plural = _("Conference meetings")
        ordering = ["display_order", "start_time"]

    def __str__(self):
        return f"{self.title} ({self.start_time}-{self.end_time})"


class ConferenceTicketType(models.Model):
    """
    Aina ya Tiketi/Ada ya Usajili — kila mkutano unaweza kuwa na tiers
    tofauti (Mwanachama, Asiye Mwanachama, Mwanafunzi, Early Bird, n.k.),
    zinazosimamiwa na Admin bila kugusa code.
    """

    conference = models.ForeignKey(
        Conference, on_delete=models.CASCADE, related_name="ticket_types"
    )
    name = models.CharField(_("ticket_types"), max_length=100)
    description = models.CharField(max_length=255, blank=True)

    price = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default="TZS")

    max_quantity = models.PositiveIntegerField(
        _("Maximum quantity (Optional)"), null=True, blank=True,
        help_text=_("Acha wazi kama hakuna ukomo."),
    )
    sales_start = models.DateTimeField(null=True, blank=True)
    sales_end = models.DateTimeField(null=True, blank=True)

    is_active = models.BooleanField(default=True)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = _("ticket_type")
        verbose_name_plural = _("ticket_types")
        ordering = ["display_order", "price"]

    def __str__(self):
        return f"{self.conference.title} - {self.name} ({self.price} {self.currency})"

    @property
    def sold_count(self):
        return self.registrations.exclude(
            batch__status=RegistrationBatchStatus.CANCELLED
        ).count()

    @property
    def is_available(self):
        if not self.is_active:
            return False
        now = timezone.now()
        if self.sales_start and now < self.sales_start:
            return False
        if self.sales_end and now > self.sales_end:
            return False
        if self.max_quantity and self.sold_count >= self.max_quantity:
            return False
        return True


class RegistrationBatchStatus(models.TextChoices):
    PENDING_PAYMENT = "pending_payment", _("Is Pending")
    CONFIRMED = "confirmed", _("Confirmed/Imethibitishwa")
    CANCELLED = "cancelled", _("cancelled/Imefutwa")


class ConferenceRegistrationBatch(models.Model):
    """
    "Order" ya usajili — inaweza kuwa mtu 1 (self-registration) au watu
    wengi (organization/bulk registration) waliolipiwa kwa malipo moja.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    conference = models.ForeignKey(
        Conference, on_delete=models.CASCADE, related_name="registration_batches"
    )
    registered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="conference_batches"
    )

    is_self_registration = models.BooleanField(default=True)
    organization_name = models.CharField(max_length=255, blank=True)

    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default="TZS")

    status = models.CharField(
        max_length=20,
        choices=RegistrationBatchStatus.choices,
        default=RegistrationBatchStatus.PENDING_PAYMENT,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Usajili (Batch)")
        verbose_name_plural = _("Usajili (Batches)")
        ordering = ["-created_at"]
        constraints = [
            # Akaunti moja inaweza ku-self-register mara moja tu kwa conference.
            # Bulk/organization batches (is_self_registration=False) hazina ukomo huu.
            models.UniqueConstraint(
                fields=["conference", "registered_by"],
                condition=models.Q(is_self_registration=True),
                name="unique_self_registration_per_conference",
            )
        ]

    def __str__(self):
        kind = "Self" if self.is_self_registration else f"Bulk ({self.organization_name})"
        return f"{self.conference.title} - {kind} - {self.registered_by.email}"

    def recalculate_total(self):
        total = sum(
            (r.ticket_type.price for r in self.attendees.select_related("ticket_type").all()),
            start=0,
        )
        self.total_amount = total
        self.save(update_fields=["total_amount", "updated_at"])

    def confirm(self):
        self.status = RegistrationBatchStatus.CONFIRMED
        self.save(update_fields=["status", "updated_at"])
        # Risiti ya mshiriki mmoja ikishindwa, usiwazuie wengine. Makosa yanakusanywa
        # na kupandishwa MWISHONI ili yarekodiwe kwenye malipo (na kurudiwa baadaye -
        # mark_confirmed inarukwa kwa waliokwisha pata risiti).
        failures = []
        for attendee in self.attendees.all():
            try:
                attendee.mark_confirmed()
            except Exception as exc:
                failures.append(f"{attendee.full_name}: {exc!r}")
        if failures:
            raise RuntimeError("Risiti hazikutengenezwa kwa: " + "; ".join(failures))


class ConferenceRegistration(models.Model):
    """
    Mshiriki mmoja (attendee) ndani ya batch fulani. Kila mshiriki ana
    QR/verification code yake ya kipekee kwa ajili ya e-receipt na check-in
    — hata kama alilipiwa pamoja na wengine (bulk).
    """

    batch = models.ForeignKey(
        ConferenceRegistrationBatch, on_delete=models.CASCADE, related_name="attendees"
    )
    ticket_type = models.ForeignKey(
        ConferenceTicketType, on_delete=models.PROTECT, related_name="registrations"
    )

    full_name = models.CharField(max_length=200)
    email = models.EmailField()
    phone_number = models.CharField(max_length=20, blank=True)
    organization_name = models.CharField(max_length=255, blank=True)

    verification_code = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    e_receipt_image = models.ImageField(
        upload_to="conferences/receipts/", blank=True, null=True
    )

    checked_in = models.BooleanField(default=False)
    checked_in_at = models.DateTimeField(null=True, blank=True)
    checked_in_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="conference_checkins_performed",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("Conference Attendee")
        verbose_name_plural = _("Conference Attendees")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.full_name} - {self.batch.conference.title}"

    @property
    def is_valid_for_entry(self):
        return (
            self.batch.status == RegistrationBatchStatus.CONFIRMED and not self.checked_in
        )

    def mark_confirmed(self):
        # Inaitwa na batch.confirm() baada ya malipo kufanikiwa — hapa ndipo
        # tunazalisha e-receipt yenye QR (angalia services/receipt_generator.py)
        from .services.receipt_generator import generate_e_receipt

        if not self.e_receipt_image:
            generate_e_receipt(self)

    def perform_check_in(self, performed_by=None):
        self.checked_in = True
        self.checked_in_at = timezone.now()
        self.checked_in_by = performed_by
        self.save(update_fields=["checked_in", "checked_in_at", "checked_in_by"])
