import uuid
from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.text import slugify
from django.utils.translation import gettext_lazy as _

from common.validators import validate_document_max_15mb, validate_image_max_8mb


class MembershipTier(models.Model):
    """
    Daraja la Uanachama — LINASIMAMIWA NA ADMIN, siyo hardcoded kwenye code.

    Bosi/Super Admin anaweza kuongeza, kuhariri (kubadili bei/ada), kuzima
    (is_active=False), au kufuta daraja lolote kupitia Django Admin bila
    mtu yeyote kugusa code. Guest, Institution, Lecturer, Entrepreneur,
    Sponsor, Investor ni DATA ya awali (seed) tu — angalia management
    command `seed_membership_tiers`.
    """

    name = models.CharField(_("Jina la Daraja"), max_length=100, unique=True)
    slug = models.SlugField(max_length=110, unique=True, blank=True)
    description = models.TextField(_("Maelezo"), blank=True)

    annual_fee = models.DecimalField(
        _("Ada ya Mwaka"), max_digits=12, decimal_places=2, default=0
    )
    currency = models.CharField(max_length=3, default="TZS")

    # Guest ndiye pekee anayeweza kuwa na ada ya bure (0) na bado kuonekana
    # kwenye mfumo bila kuhitaji malipo kuwa "active member".
    requires_payment = models.BooleanField(
        _("Inahitaji Malipo Kuwa Active"), default=True
    )

    benefits = models.JSONField(
        _("Faida za Daraja Hili"), default=list, blank=True,
        help_text=_("Orodha ya faida, mfano: ['Kupakua machapisho', 'Punguzo la conference']"),
    )

    is_active = models.BooleanField(_("Inapatikana kwa Usajili"), default=True)
    display_order = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Daraja la Uanachama")
        verbose_name_plural = _("Madaraja ya Uanachama")
        ordering = ["display_order", "annual_fee"]

    def __str__(self):
        return f"{self.name} — {self.annual_fee} {self.currency}"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class MembershipStatus(models.TextChoices):
    PENDING_PAYMENT = "pending_payment", _("Inasubiri Malipo")
    ACTIVE = "active", _("Active")
    EXPIRED = "expired", _("Imeisha Muda")
    SUSPENDED = "suspended", _("Imesimamishwa")
    CANCELLED = "cancelled", _("Imefutwa")


class Member(models.Model):
    """
    Wasifu wa Uanachama — unaunganishwa OneToOne na User (accounts app).
    Hii inatenganisha "role ya mfumo" (User.role) na "hali ya uanachama"
    (Member.status + tier), kama tulivyopanga awali.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="membership"
    )

    membership_number = models.CharField(
        max_length=20, unique=True, editable=False, db_index=True
    )

    tier = models.ForeignKey(
        MembershipTier, on_delete=models.PROTECT, related_name="members"
    )

    status = models.CharField(
        max_length=20,
        choices=MembershipStatus.choices,
        default=MembershipStatus.PENDING_PAYMENT,
    )

    joined_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)

    # Taasisi/Kampuni (kwa tier za Institution/Sponsor/Investor)
    organization_name = models.CharField(max_length=255, blank=True)

    digital_card_image = models.ImageField(
        upload_to="membership_cards/", blank=True, null=True
    )
    card_verification_code = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Mwanachama")
        verbose_name_plural = _("Wanachama")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.membership_number} - {self.user.get_full_name()} ({self.tier.name})"

    def save(self, *args, **kwargs):
        if not self.membership_number:
            self.membership_number = self._generate_membership_number()
        super().save(*args, **kwargs)

    def _generate_membership_number(self):
        year = timezone.now().year
        prefix = f"TSMA-{year}-"
        last = (
            Member.objects.filter(membership_number__startswith=prefix)
            .order_by("-membership_number")
            .first()
        )
        next_seq = 1
        if last:
            try:
                next_seq = int(last.membership_number.split("-")[-1]) + 1
            except (ValueError, IndexError):
                next_seq = Member.objects.count() + 1
        return f"{prefix}{next_seq:05d}"

    @property
    def is_active_member(self):
        if self.status != MembershipStatus.ACTIVE:
            return False
        if self.expiry_date and self.expiry_date < timezone.now().date():
            return False
        return True

    def activate(self, duration_days=365):
        """Inaitwa baada ya malipo kufanikiwa (au na admin kwa manual activation)."""
        today = timezone.now().date()
        self.status = MembershipStatus.ACTIVE
        self.joined_date = self.joined_date or today
        self.expiry_date = today + timedelta(days=duration_days)
        self.save(update_fields=["status", "joined_date", "expiry_date", "updated_at"])


class MemberProfile(models.Model):
    """
    Profaili ya Kitaaluma ya Mwanachama — CV, elimu, uzoefu, LinkedIn, n.k.
    Imetenganishwa na Member (siyo field za moja kwa moja kwenye Member)
    kwa sababu hii ni taarifa ya HIARI mwanachama anayoongeza mwenyewe
    baada ya kujiunga, tofauti na Member (uanachama/malipo) inayosimamiwa
    zaidi na mfumo/Admin.

    `is_public` -> DEFAULT True (Sunga alithibitisha: wanachama wanaonekana
    kwenye "Professionals Directory" ya umma kwa default), lakini
    mwanachama anaweza kuizima mwenyewe wakati wowote kwenye Dashboard
    yake ili profaili yake (pamoja na CV) isionekane hadharani tena.
    """

    member = models.OneToOneField(
        Member, on_delete=models.CASCADE, related_name="profile"
    )

    professional_title = models.CharField(
        _("Cheo/Taaluma"), max_length=200, blank=True,
        help_text=_("Mfano: Sports Administrator, Club Manager, Lecturer"),
    )
    current_organization = models.CharField(_("Mwajiri wa Sasa"), max_length=255, blank=True)
    years_of_experience = models.PositiveIntegerField(_("Miaka ya Uzoefu"), null=True, blank=True)
    specialization = models.CharField(
        _("Eneo la Utaalamu"), max_length=255, blank=True,
        help_text=_("Mfano: Usimamizi wa Vilabu, Uchumi wa Michezo, Masoko ya Michezo"),
    )

    bio = models.TextField(_("Kuhusu Mimi"), blank=True)
    education = models.TextField(_("Elimu"), blank=True)
    experience = models.TextField(_("Uzoefu wa Kazi"), blank=True)
    certifications = models.TextField(_("Vyeti/Certifications"), blank=True)

    linkedin_url = models.URLField(blank=True)
    public_email = models.EmailField(
        blank=True, help_text=_("Hiari - email itakayoonekana kwenye directory (tofauti na email ya akaunti)")
    )
    photo = models.ImageField(
        upload_to="member_profiles/photos/", blank=True, null=True,
        validators=validate_image_max_8mb,
    )
    cv_file = models.FileField(
        _("CV"), upload_to="member_profiles/cvs/", blank=True, null=True,
        validators=validate_document_max_15mb,
    )

    # DEFAULT True kwa uamuzi wa Sunga - mwanachama anaweza kuzima mwenyewe.
    is_public = models.BooleanField(_("Ionekane Hadharani (Directory)"), default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Profaili ya Kitaaluma")
        verbose_name_plural = _("Profaili za Kitaaluma")

    def __str__(self):
        return f"Profaili ya {self.member.user.get_full_name()}"
