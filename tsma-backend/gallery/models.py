from django.db import models
from django.core.validators import FileExtensionValidator
from django.utils.text import slugify
from django.utils.translation import gettext_lazy as _

from common.validators import validate_image_max_8mb


class GalleryAlbum(models.Model):
    """
    Albamu ya picha — inapangwa kwa mwaka/tukio (mfano: "Conference 2026",
    "Ofisi za TSMA", "Mkutano wa Bodi - Januari 2026").
    """

    title = models.CharField(_("Jina la Albamu"), max_length=200)
    slug = models.SlugField(max_length=220, unique=True, blank=True)
    description = models.TextField(_("Maelezo"), blank=True)

    cover_image = models.ImageField(
        _("Picha ya Jalada"), upload_to="gallery/covers/", blank=True, null=True,
        validators=validate_image_max_8mb,
    )

    event_year = models.PositiveIntegerField(_("Mwaka wa Tukio"), db_index=True)
    event_date = models.DateField(_("Tarehe ya Tukio"), null=True, blank=True)

    is_published = models.BooleanField(default=True)
    display_order = models.PositiveIntegerField(default=0)

    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="gallery_albums_created",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Albamu ya Picha")
        verbose_name_plural = _("Albamu za Picha")
        ordering = ["-event_year", "display_order", "-created_at"]

    def __str__(self):
        return f"{self.title} ({self.event_year})"

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.title)
            slug = base_slug
            counter = 1
            while GalleryAlbum.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    @property
    def image_count(self):
        return self.images.count()


class GalleryImage(models.Model):
    """Picha moja ndani ya albamu — inatumika kwa lightbox ya kuangalia kwa ukubwa."""

    album = models.ForeignKey(
        GalleryAlbum, on_delete=models.CASCADE, related_name="images"
    )
    image = models.ImageField(
        _("Picha"), upload_to="gallery/images/", validators=validate_image_max_8mb,
        blank=True, null=True,
    )
    video = models.FileField(
        _("Video"), upload_to="gallery/videos/", blank=True, null=True,
        validators=[FileExtensionValidator(allowed_extensions=["mp4", "webm", "mov", "m4v"])],
    )
    caption = models.CharField(_("Maelezo Mafupi"), max_length=255, blank=True)
    display_order = models.PositiveIntegerField(default=0)

    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("Picha ya Albamu")
        verbose_name_plural = _("Picha za Albamu")
        ordering = ["display_order", "uploaded_at"]

    def __str__(self):
        return f"{self.album.title} - Picha #{self.pk}"
