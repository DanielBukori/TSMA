from django.db import models
from django.utils.translation import gettext_lazy as _

from common.validators import validate_image_max_8mb


class Partner(models.Model):
    """
    A strategic partner of TSMA (ASMA, WASM, ...) - logo plus a link to their
    site. Shown on both the home page and the about page from one record.
    """

    name = models.CharField(_("Jina la Mshirika"), max_length=200)
    logo = models.ImageField(
        _("Logo"), upload_to="partners/logos/", validators=validate_image_max_8mb
    )
    website_url = models.URLField(_("Tovuti"), blank=True)
    description = models.CharField(
        _("Maelezo Mafupi"), max_length=255, blank=True,
        help_text=_("Mfano: 'Africa Sports Management Association'"),
    )

    is_active = models.BooleanField(_("Ionekane Sasa"), default=True)
    display_order = models.PositiveIntegerField(_("Mpangilio wa Kuonekana"), default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Mshirika")
        verbose_name_plural = _("Washirika")
        ordering = ["display_order", "name"]

    def __str__(self):
        return self.name


class PartnerVoice(models.Model):
    """
    Sauti ya mshirika ("What our partners say").

    Sehemu hii ya tovuti haionekani isijazwe: hakuna mauzo ya maneno
    yanayotengenezwa kiotomatiki — Admin/Editor anaandika kauli halisi
    aliyopokea kutoka kwa mshirika, kisha hutanguliza (`is_published`).
    """

    quote_sw = models.TextField(_("Maneno (Kiswahili)"))
    quote_en = models.TextField(_("Maneno (Kiingereza)"))
    speaker_name = models.CharField(_("Jina la msemaji"), max_length=150)
    speaker_title = models.CharField(
        _("Cheo"), max_length=150, blank=True,
        help_text=_("Mfano: 'Mkurugenzi Mtendaji, ASMA'"),
    )
    partner = models.ForeignKey(
        Partner,
        on_delete=models.CASCADE,
        related_name="voices",
        null=True,
        blank=True,
        verbose_name=_("Mshirika"),
    )
    photo = models.ImageField(
        _("Picha ya msemaji (hiari)"),
        upload_to="partners/voices/",
        blank=True,
        null=True,
        validators=validate_image_max_8mb,
    )
    is_published = models.BooleanField(_("Itangulizwe"), default=False)
    display_order = models.PositiveIntegerField(_("Mpangilio"), default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Sauti ya Mshirika")
        verbose_name_plural = _("Sauti za Washirika")
        ordering = ["display_order", "-created_at"]

    def __str__(self):
        return f"{self.speaker_name}: {self.quote_sw[:40]}"
