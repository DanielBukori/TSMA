from django.db import models
from django.utils.translation import gettext_lazy as _

from common.validators import validate_image_max_8mb


class ManagementMember(models.Model):
    """
    Mjumbe wa Uongozi wa Utendaji (Management) wa TSMA — watendaji wa kila
    siku (Chair, Makatibu, Wahasibu, n.k.), TOFAUTI na Board (wanabodi
    waliochaguliwa). Hizi ni ORODHA MBILI HURU (hakuna uhusiano wa
    kidata/FK kati yao) — mtu anayekuwa Board NA Management anaongezwa
    kwenye jedwali zote mbili kando kando (angalia BoardMember).

    `position` ni maandishi HURU (sio orodha iliyofungwa/choices) — Admin
    anaandika chochote anachotaka moja kwa moja (Chair, Secretary
    General, Treasurer, Programs Officer, n.k.) bila kuhitaji mabadiliko
    ya code kuongeza cheo kipya.
    """

    full_name = models.CharField(_("Jina Kamili"), max_length=200)
    position = models.CharField(
        _("Nyadhifa"), max_length=150,
        help_text=_("Andika chochote: Chair, Secretary General, Treasurer, n.k."),
    )

    photo = models.ImageField(
        _("Picha"), upload_to="management/photos/", blank=True, null=True,
        validators=validate_image_max_8mb,
    )

    bio = models.TextField(_("Wasifu (Bio)"), blank=True)
    education = models.TextField(_("Elimu"), blank=True)
    experience = models.TextField(_("Uzoefu"), blank=True)
    contribution = models.TextField(
        _("Mchango kwa TSMA"), blank=True,
        help_text=_("Mchango wake maalum kwa taasisi."),
    )

    email = models.EmailField(blank=True)
    linkedin_url = models.URLField(blank=True)

    is_active = models.BooleanField(_("Bado Yupo Kwenye Uongozi"), default=True)
    display_order = models.PositiveIntegerField(_("Mpangilio wa Kuonekana"), default=0)

    joined_date = models.DateField(_("Tarehe ya Kujiunga"), blank=True, null=True)

    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="management_entries_created",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Mjumbe wa Management")
        verbose_name_plural = _("Management")
        ordering = ["display_order", "full_name"]

    def __str__(self):
        return f"{self.full_name} - {self.position}"
