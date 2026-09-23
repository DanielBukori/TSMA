import re

from django.db import models
from django.utils.translation import gettext_lazy as _


def _digits_only(phone):
    """Ondoa nafasi/mabano/dashes, acha namba pekee (na + mwanzoni kama ipo)."""
    if not phone:
        return ""
    cleaned = re.sub(r"[^\d+]", "", phone)
    return cleaned


class ContactInfo(models.Model):
    """
    Taarifa za Mawasiliano za TSMA — inasimamiwa na Admin kwenye Django
    Admin (singleton — chombo kimoja tu ndicho kinachotumika kwenye tovuti,
    lakini tunaruhusu zaidi ya kimoja kwa historia/backup).

    Namba za simu/WhatsApp zinawekwa kwa muundo wa kimataifa (mfano
    +255712345678) ili viungo vya "tel:", "wa.me/", na "mailto:"
    vitengenezwe kiotomatiki na viwe TAYARI KUBOFYWA (clickable) kwenye
    frontend bila usindikaji wowote wa ziada.
    """

    organization_name = models.CharField(max_length=255, default="TSMA")

    # Namba kuu ya simu (kwa kupiga moja kwa moja)
    phone_number = models.CharField(
        _("Phone number"), max_length=20,
        help_text=_("international structure, example: +255712345678"),
    )
    phone_number_secondary = models.CharField(
        _("second number(Optional)"), max_length=20, blank=True
    )

    # WhatsApp (inaweza kuwa tofauti na namba ya kupiga simu)
    whatsapp_number = models.CharField(
        _("WhatsApp number"), max_length=20,
        help_text=_("example: 255712345678"),
    )
    whatsapp_default_message = models.CharField(
        _("Ujumbe wa Awali wa WhatsApp (Hiari)"),
        max_length=255,
        blank=True,
        default="Habari TSMA, ningependa kupata maelezo zaidi kuhusu...",
    )

    email = models.EmailField(_("Barua Pepe Rasmi"))
    email_secondary = models.EmailField(_("Barua Pepe ya Pili (Hiari)"), blank=True)

    physical_address = models.TextField(_("Anwani ya Ofisi"), blank=True)
    postal_address = models.CharField(_("S.L.P (P.O. Box)"), max_length=100, blank=True)

    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)

    facebook_url = models.URLField(blank=True)
    twitter_x_url = models.URLField(blank=True)
    instagram_url = models.URLField(blank=True)
    linkedin_url = models.URLField(blank=True)
    youtube_url = models.URLField(blank=True)
    tiktok_url = models.URLField(blank=True)

    is_active = models.BooleanField(
        _("Ndiyo Inayotumika Sasa"), default=True,
        help_text=_("Kama kuna zaidi ya taarifa moja, hii pekee ndiyo itaonekana kwenye tovuti."),
    )

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Taarifa za Mawasiliano")
        verbose_name_plural = _("Taarifa za Mawasiliano")

    def __str__(self):
        return f"{self.organization_name} - Mawasiliano"

    def save(self, *args, **kwargs):
        if self.is_active:
            # Hakikisha ni kimoja tu kinachokuwa active kwa wakati mmoja
            ContactInfo.objects.exclude(pk=self.pk).update(is_active=False)
        super().save(*args, **kwargs)

    # ------------------------------------------------------------------
    # Viungo vya moja kwa moja (clickable) — tayari kutumika kwenye <a href="">
    # ------------------------------------------------------------------
    @property
    def phone_call_link(self):
        digits = _digits_only(self.phone_number)
        return f"tel:{digits}" if digits else ""

    @property
    def phone_secondary_call_link(self):
        digits = _digits_only(self.phone_number_secondary)
        return f"tel:{digits}" if digits else ""

    @property
    def whatsapp_link(self):
        digits = _digits_only(self.whatsapp_number).lstrip("+")
        if not digits:
            return ""
        base = f"https://wa.me/{digits}"
        if self.whatsapp_default_message:
            from urllib.parse import quote

            return f"{base}?text={quote(self.whatsapp_default_message)}"
        return base

    @property
    def email_mailto_link(self):
        return f"mailto:{self.email}" if self.email else ""

    @property
    def email_secondary_mailto_link(self):
        return f"mailto:{self.email_secondary}" if self.email_secondary else ""

    @property
    def google_maps_link(self):
        if self.latitude and self.longitude:
            return f"https://www.google.com/maps?q={self.latitude},{self.longitude}"
        return ""


class ContactMessage(models.Model):
    """Ujumbe uliotumwa kupitia fomu ya mawasiliano (Contact Form) kwenye tovuti."""

    full_name = models.CharField(max_length=200)
    email = models.EmailField()
    phone_number = models.CharField(max_length=20, blank=True)
    subject = models.CharField(max_length=255, blank=True)
    message = models.TextField()

    is_read = models.BooleanField(default=False)
    is_replied = models.BooleanField(default=False)

    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("Ujumbe wa Mawasiliano")
        verbose_name_plural = _("Ujumbe za Mawasiliano")
        ordering = ["-submitted_at"]

    def __str__(self):
        return f"{self.full_name} - {self.subject or self.message[:40]}"

    @property
    def sender_mailto_link(self):
        return f"mailto:{self.email}" if self.email else ""

    @property
    def sender_call_link(self):
        digits = _digits_only(self.phone_number)
        return f"tel:{digits}" if digits else ""
