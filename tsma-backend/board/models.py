from django.db import models
from django.utils.translation import gettext_lazy as _

from common.validators import validate_image_max_8mb


class BoardMember(models.Model):
    """
    Mjumbe wa Bodi/Uongozi wa TSMA.

    `is_founder` inatenganisha waanzilishi (founders) na wanabodi wa kawaida
    kwenye ukurasa wa Board, kama roadmap ilivyoainisha ("Sehemu maalum kwa
    waanzilishi"). `display_order` inaruhusu admin kupanga mpangilio wa
    kuonekana (mfano: Chairman kwanza, kisha Vice Chairman, n.k.) bila
    kutegemea tarehe ya kuongezwa.
    """

    full_name = models.CharField(_("Full name"), max_length=200)
    position = models.CharField(
        _("Position"), max_length=150,
        help_text=_("Example: Chairman, Vice Chairman, Secretary General, Board Member"),
    )

    photo = models.ImageField(
        _("Photo"), upload_to="board/photos/", blank=True, null=True,
        validators=validate_image_max_8mb,
    )

    bio = models.TextField(_("Profile (Bio)"), blank=True)
    education = models.TextField(_("Education"), blank=True)
    experience = models.TextField(_("Experience"), blank=True)
    contribution = models.TextField(
        _("Contribution to TSMA"), blank=True,
        help_text=_("Special contributions to Association."),
    )

    email = models.EmailField(blank=True)
    linkedin_url = models.URLField(blank=True)

    is_founder = models.BooleanField(_("Founder"), default=False)
    is_active = models.BooleanField(_("Is board member"), default=True)
    display_order = models.PositiveIntegerField(_("Display order"), default=0)

    joined_board_date = models.DateField(_("Date joined in board"), blank=True, null=True)

    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="board_entries_created",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Bodi Member")
        verbose_name_plural = _("Members")
        ordering = ["display_order", "full_name"]

    def __str__(self):
        founder_tag = " (Founder)" if self.is_founder else ""
        return f"{self.full_name} - {self.position}{founder_tag}"
