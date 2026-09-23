from django.db import models
from django.utils.translation import gettext_lazy as _

from common.validators import validate_image_max_8mb


class Partner(models.Model):
    """
    Mshirika wa Kimkakati wa TSMA (mfano ASMA, WASM) — logo + link ya
    tovuti yao. Inaonyeshwa kwenye Home page ("Washirika Wetu") NA About
    page (uamuzi wa Sunga: zote mbili), kutoka data hii hii moja.
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
