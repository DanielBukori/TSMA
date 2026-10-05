from django.db import models
from django.utils import timezone
from django.utils.text import slugify
from django.utils.translation import gettext_lazy as _

from common.validators import validate_image_max_8mb


class NewsCategory(models.Model):
    """
    Kategoria za habari — inasimamiwa na Admin, siyo hardcoded, ili
    Content Editor aweze kuongeza kategoria mpya wakati wowote.
    """

    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=110, unique=True, blank=True)

    class Meta:
        verbose_name = _("Kategoria ya Habari")
        verbose_name_plural = _("Kategoria za Habari")
        ordering = ["name"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class News(models.Model):
    """
    Chapisho la Taarifa (News Post) — muundo wake ni kama "post" ya
    YouTube Community au Instagram: maelezo (text) ndiyo msingi, kichwa
    cha habari na picha ni HIARI (optional), na chapisho linaweza kuwa
    na picha kadhaa (carousel) kupitia NewsImage.
    """

    title = models.CharField(
        _("Kichwa (Hiari)"), max_length=255, blank=True,
        help_text=_("Hiari — kama post ya kawaida (bila kichwa), acha wazi."),
    )
    slug = models.SlugField(max_length=280, unique=True, blank=True)

    category = models.ForeignKey(
        NewsCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name="news"
    )

    excerpt = models.CharField(
        _("Muhtasari Mfupi (Hiari)"), max_length=300, blank=True,
        help_text=_("Hiari — kama haipo, mfumo utatumia maneno ya kwanza ya maelezo."),
    )
    content = models.TextField(
        _("Maelezo ya Chapisho"),
        help_text=_("Maandishi ya post — kama caption ya Instagram/YouTube Community."),
    )

    author = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, related_name="news_authored"
    )

    is_published = models.BooleanField(_("Imechapishwa"), default=False)
    published_at = models.DateTimeField(_("Tarehe ya Kuchapishwa"), null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Chapisho la Taarifa")
        verbose_name_plural = _("Chapisho za Taarifa")
        ordering = ["-published_at", "-created_at"]
        indexes = [models.Index(fields=["is_published", "published_at"])]

    def __str__(self):
        return self.title or self.content[:50]

    def save(self, *args, **kwargs):
        if not self.slug:
            base_text = self.title or self.content[:50] or "post"
            base_slug = slugify(base_text) or "post"
            slug = base_slug
            counter = 1
            while News.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug

        if self.is_published and not self.published_at:
            self.published_at = timezone.now()

        super().save(*args, **kwargs)

    @property
    def has_images(self):
        return self.images.exists()

    @property
    def image_count(self):
        return self.images.count()


class NewsImage(models.Model):
    """
    Picha za chapisho — hiari, na zinaweza kuwa nyingi (kama carousel ya
    Instagram post yenye picha kadhaa) au picha moja tu, au bila picha kabisa.
    """

    news = models.ForeignKey(News, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(
        _("Picha"), upload_to="news/images/", validators=validate_image_max_8mb,
    )
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = _("Picha ya Chapisho")
        verbose_name_plural = _("Picha za Chapisho")
        ordering = ["display_order", "id"]

    def __str__(self):
        return f"Picha #{self.pk} - {self.news}"
