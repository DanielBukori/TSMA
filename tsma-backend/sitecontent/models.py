from django.db import models
from django.utils.translation import gettext_lazy as _

from common.validators import validate_image_max_8mb


class SiteBackgroundImage(models.Model):
    """
    Picha halisi za taasisi (matukio, mikutano, ofisi, wanachama) —
    zinatumika kama "background" ya animation (Ken Burns slideshow)
    kwenye hero ya Home NA sehemu za "banner" za kurasa zingine (Board,
    Management, Careers, Directory, n.k.) — zote zinatumia bwawa hili
    hili moja la picha (Admin anapakia hapa, kila mahali panasasishwa
    kiotomatiki, hakuna code inayohitaji kubadilika).

    Ukiwa na picha chache tu, ni sawa — slideshow itazizungusha zilizopo.
    Ukiwa huna picha yoyote bado, sehemu husika inabaki na rangi ya
    kawaida ya navy (haivunjiki - angalia PageBanner.jsx/HeroSlideshow.jsx
    upande wa frontend).
    """

    image = models.ImageField(
        _("Picha"), upload_to="site_backgrounds/", validators=validate_image_max_8mb
    )
    caption = models.CharField(
        _("Maelezo Mafupi (hiari)"), max_length=200, blank=True,
        help_text=_("Kwa alt text - si lazima ionekane kwenye ukurasa."),
    )
    is_active = models.BooleanField(_("Itumike Sasa"), default=True)
    display_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("Picha ya Background")
        verbose_name_plural = _("Picha za Background (Home + Kurasa Zote)")
        ordering = ["display_order", "-created_at"]

    def __str__(self):
        return self.caption or f"Background #{self.pk}"


class SiteSettings(models.Model):
    """
    Mipangilio ya jumla ya "brand" ya tovuti — SINGLETON kama AboutContent.
    Hapa ndipo Admin anapakia LOGO na FAVICON kupitia Django Admin, bila
    kugusa code wala kufanya deployment mpya, mara TSMA itakapopata logo
    rasmi (kabla ya hapo, fields hizi zinabaki tupu na frontend inatumia
    "T"/"TSMA" kama fallback ya maandishi).

    Kuna aina mbili za logo kwa sababu logo moja mara nyingi haionekani
    vizuri kwenye background zote mbili tunazotumia kwenye tovuti:
      - `logo_image`   -> kwa background nyeupe/rangi hafifu (Navbar)
      - `logo_on_dark` -> kwa background ya navy iliyokoza (Footer)
    Kama TSMA itakuwa na toleo moja tu la logo (mfano PNG yenye
    background wazi), inaweza kuwekwa kwenye fields zote mbili.
    """

    logo_image = models.ImageField(
        _("Logo (background nyeupe — Navbar)"),
        upload_to="branding/", blank=True, null=True,
        validators=validate_image_max_8mb,
        help_text=_("PNG yenye background wazi (transparent) inapendekezwa."),
    )
    logo_on_dark = models.ImageField(
        _("Logo (background iliyokoza — Footer)"),
        upload_to="branding/", blank=True, null=True,
        validators=validate_image_max_8mb,
        help_text=_(
            "Hiari — toleo la logo linalosomeka vizuri juu ya rangi ya navy. "
            "Kama halijawekwa, Footer itatumia 'logo_image' badala yake."
        ),
    )
    favicon = models.ImageField(
        _("Favicon"),
        upload_to="branding/", blank=True, null=True,
        validators=validate_image_max_8mb,
        help_text=_("Picha ya mraba (mfano 512x512px), PNG."),
    )

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Mipangilio ya Tovuti (Logo/Branding)")
        verbose_name_plural = _("Mipangilio ya Tovuti (Logo/Branding)")

    def __str__(self):
        return "Site Settings (TSMA)"

    def save(self, *args, **kwargs):
        # Hakikisha ni rekodi MOJA tu inayotumika (singleton pattern)
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, _created = cls.objects.get_or_create(pk=1)
        return obj


class AboutContent(models.Model):
    """
    Maudhui ya ukurasa wa About — SINGLETON (kipande kimoja tu kinachotumika
    kwenye tovuti kwa wakati mmoja). Admin anahariri haya YOTE kupitia
    Django Admin bila kugusa code — historia, dira, dhamira, imani.

    Kila field ina toleo la Kiswahili (_sw) na Kiingereza (_en) ili
    frontend iweze kubadilisha lugha bila kuchanganya (i18next inachagua
    field sahihi kulingana na lugha ya sasa).
    """

    # ---- Historia ----
    history_title_sw = models.CharField(max_length=200, default="Historia Yetu")
    history_title_en = models.CharField(max_length=200, default="Our History")
    history_body_sw = models.TextField(
        default=(
            "Tanzania Sports Management Association (TSMA) ilianzishwa kwa lengo la "
            "kuunganisha wataalamu, wasomi, na wadau wa sekta ya michezo nchini Tanzania, "
            "kwa ajili ya kujenga uchumi wa michezo wenye tija na endelevu. [Hariri maandishi "
            "haya kwenye Django Admin kuweka historia halisi ya TSMA.]"
        )
    )
    history_body_en = models.TextField(
        default=(
            "The Tanzania Sports Management Association (TSMA) was founded to connect "
            "professionals, academics, and stakeholders in Tanzania's sports sector to build "
            "a productive and sustainable sports economy. [Edit this text in Django Admin "
            "to add TSMA's real history.]"
        )
    )

    # ---- Dira (Vision) ----
    vision_sw = models.TextField(
        default=(
            "Kuwa taasisi inayoongoza kwa uwezeshaji wa uchumi wa michezo Tanzania, "
            "inayotambulika kikanda na kimataifa kwa taaluma na uwazi."
        )
    )
    vision_en = models.TextField(
        default=(
            "To be the leading institution empowering Tanzania's sports economy, recognized "
            "regionally and internationally for professionalism and transparency."
        )
    )

    # ---- Dhamira (Mission) ----
    mission_sw = models.TextField(
        default=(
            "Kuunganisha wataalamu, wanachama, wadhamini na wawekezaji kujenga mfumo wa "
            "michezo unaojiendesha wenyewe, wenye kutengeneza ajira na fursa za kiuchumi kwa Watanzania."
        )
    )
    mission_en = models.TextField(
        default=(
            "To connect professionals, members, sponsors and investors in building a "
            "self-sustaining sports ecosystem that creates jobs and economic opportunities for Tanzanians."
        )
    )

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Maudhui ya About")
        verbose_name_plural = _("Maudhui ya About")

    def __str__(self):
        return "About Content (TSMA)"

    def save(self, *args, **kwargs):
        # Hakikisha ni rekodi MOJA tu inayotumika (singleton pattern)
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, _created = cls.objects.get_or_create(pk=1)
        return obj


class CoreValue(models.Model):
    """
    Imani/Maadili (Core Values) — orodha inayosimamiwa na Admin (ongeza/
    ondoa/hariri thamani yoyote wakati wowote bila kugusa code).
    """

    title_sw = models.CharField(max_length=150)
    title_en = models.CharField(max_length=150)
    description_sw = models.CharField(max_length=300, blank=True)
    description_en = models.CharField(max_length=300, blank=True)
    icon = models.CharField(
        max_length=10, blank=True,
        help_text=_("Emoji au herufi fupi ya kuwakilisha thamani hii, mfano: 🤝"),
    )
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = _("Imani/Thamani (Core Value)")
        verbose_name_plural = _("Imani/Thamani (Core Values)")
        ordering = ["display_order"]

    def __str__(self):
        return self.title_sw


class Milestone(models.Model):
    """
    Hatua muhimu za kihistoria (mfano: '2020 — Kuanzishwa kwa TSMA') —
    zinaonekana kwenye timeline ya ukurasa wa About. Admin anaongeza
    milestone mpya kila mwaka bila kugusa code.
    """

    year = models.PositiveIntegerField()
    title_sw = models.CharField(max_length=200)
    title_en = models.CharField(max_length=200)
    description_sw = models.TextField(blank=True)
    description_en = models.TextField(blank=True)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = _("Hatua ya Kihistoria (Milestone)")
        verbose_name_plural = _("Hatua za Kihistoria (Milestones)")
        ordering = ["year", "display_order"]

    def __str__(self):
        return f"{self.year} — {self.title_sw}"


class PageBannerContent(models.Model):
    """
    Maandishi ya "banner" ya juu (badge + title + subtitle + CTA hiari) ya
    kila ukurasa unaotumia PageBanner.jsx — Admin anahariri haya YOTE
    kupitia Django Admin bila kugusa code, kwa Kiswahili na Kiingereza.

    Kuna rekodi MOJA kwa kila ukurasa (page_key ni ya kipekee/unique) —
    zinatengenezwa mara moja na `seed_page_banners` management command
    (zikiwa na maandishi yaliyokuwepo kwenye code kabla ya mfumo huu),
    kisha Admin anaendelea kuzihariri tu (haongezi wala kufuta rekodi
    mpya — orodha ya kurasa ni fasta/fixed kwenye code ya frontend).
    """

    class PageKey(models.TextChoices):
        ABOUT = "about", _("About")
        BOARD = "board", _("Board")
        MANAGEMENT = "management", _("Management")
        MEMBERS = "members", _("Members")
        CONFERENCES = "conferences", _("Conferences")
        PUBLICATIONS = "publications", _("Publications")
        TEACHING = "teaching", _("Teaching / Courses and Training")
        NEWS = "news", _("News")
        GALLERY = "gallery", _("Gallery")
        CONTACT = "contact", _("Contact")
        FOUNDERS = "founders", _("Founders")
        CAREERS = "careers", _("Careers")
        DIRECTORY = "directory", _("Professionals Directory")

    page_key = models.CharField(
        _("Ukurasa"), max_length=30, choices=PageKey.choices, unique=True,
    )

    badge_sw = models.CharField(_("Badge (Kiswahili)"), max_length=80, blank=True)
    badge_en = models.CharField(_("Badge (Kiingereza)"), max_length=80, blank=True)

    title_sw = models.CharField(_("Kichwa (Kiswahili)"), max_length=200)
    title_en = models.CharField(_("Kichwa (Kiingereza)"), max_length=200)

    subtitle_sw = models.TextField(_("Maelezo Mafupi (Kiswahili)"), blank=True)
    subtitle_en = models.TextField(_("Maelezo Mafupi (Kiingereza)"), blank=True)

    cta_text_sw = models.CharField(
        _("Kitufe cha Wito (CTA) — Kiswahili"), max_length=80, blank=True,
        help_text=_("Hiari — mfano 'Wasilisha Utafiti →'. Acha wazi kama ukurasa hauna kitufe."),
    )
    cta_text_en = models.CharField(
        _("Kitufe cha Wito (CTA) — Kiingereza"), max_length=80, blank=True,
    )
    cta_url = models.CharField(
        _("Kiungo cha CTA (URL ndani ya tovuti)"), max_length=200, blank=True,
        help_text=_("Mfano: /publications/submit-abstract"),
    )

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Maudhui ya Banner (Ukurasa)")
        verbose_name_plural = _("Maudhui ya Banner (Kurasa Zote)")
        ordering = ["page_key"]

    def __str__(self):
        return self.get_page_key_display()


class HomeStat(models.Model):
    """
    Takwimu za "InfoBox" kwenye Home (namba kubwa katikati + tiles nne chini
    yake — mfano idadi ya wanachama, mikoa, n.k.). Orodha huru kabisa
    inayosimamiwa na Admin (ongeza/ondoa/hariri wakati wowote, si idadi
    fasta ya 4) — `value` ni maandishi huru (si namba tu) ili kubeba vitu
    kama "1,200+", "TZS 5M" au "Dar es Salaam".

    `kind = "big"` inaonyesha kama namba kubwa iliyo katikati (moja tu
    ndiyo inayotumika — ya kwanza kwa display_order). `kind = "tile"`
    zinaonyesha kwenye gridi ya chini (nne za kwanza tu zinaonekana).
    """

    class Kind(models.TextChoices):
        BIG = "big", _("Namba Kuu (katikati)")
        TILE = "tile", _("Tile (gridi ya chini)")

    kind = models.CharField(_("Aina"), max_length=10, choices=Kind.choices, default=Kind.TILE)
    value = models.CharField(
        _("Thamani"), max_length=50,
        help_text=_("Maandishi huru — mfano '1,200+', 'TZS 5M', '18', 'Dar es Salaam'."),
    )
    label_sw = models.CharField(_("Maelezo (Kiswahili)"), max_length=100)
    label_en = models.CharField(_("Maelezo (Kiingereza)"), max_length=100)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = _("Takwimu ya Home (Stat)")
        verbose_name_plural = _("Takwimu za Home (Stats)")
        ordering = ["display_order", "id"]

    def __str__(self):
        return f"{self.value} — {self.label_sw}"
