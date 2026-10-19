from rest_framework import serializers

from .models import GalleryAlbum, GalleryImage


class GalleryImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = GalleryImage
        fields = ("id", "image", "video", "caption", "display_order")


class GalleryAlbumListSerializer(serializers.ModelSerializer):
    """Public: orodha ya albamu (bila picha zote — kwa haraka)."""

    # Inasoma kutoka "_annotated_image_count" (angalia maelezo kwenye
    # gallery/views.py) - JSON ya API inabaki "image_count" kama kawaida.
    image_count = serializers.IntegerField(source="_annotated_image_count", read_only=True)

    class Meta:
        model = GalleryAlbum
        fields = (
            "id",
            "title",
            "slug",
            "cover_image",
            "event_year",
            "event_date",
            "image_count",
        )


class GalleryAlbumDetailSerializer(serializers.ModelSerializer):
    """Public: albamu na picha zake zote (kwa lightbox)."""

    images = GalleryImageSerializer(many=True, read_only=True)

    class Meta:
        model = GalleryAlbum
        fields = (
            "id",
            "title",
            "slug",
            "description",
            "cover_image",
            "event_year",
            "event_date",
            "images",
        )


class AdminGalleryAlbumSerializer(serializers.ModelSerializer):
    """Kwa Content Editor/Board/Super Admin kuunda/kuhariri albamu."""

    images = GalleryImageSerializer(many=True, read_only=True)

    class Meta:
        model = GalleryAlbum
        fields = (
            "id",
            "title",
            "slug",
            "description",
            "cover_image",
            "event_year",
            "event_date",
            "is_published",
            "display_order",
            "images",
        )
        read_only_fields = ("id", "slug")


class AdminGalleryImageUploadSerializer(serializers.ModelSerializer):
    """Kwa kupakia picha au video ndani ya albamu fulani."""

    def validate(self, attrs):
        image = attrs.get("image", getattr(self.instance, "image", None))
        video = attrs.get("video", getattr(self.instance, "video", None))
        if not image and not video:
            raise serializers.ValidationError("Weka picha au video.")
        if image and video:
            raise serializers.ValidationError("Pakia picha au video moja kwa rekodi, si vyote kwa pamoja.")
        return attrs

    class Meta:
        model = GalleryImage
        fields = ("id", "album", "image", "video", "caption", "display_order")
        read_only_fields = ("id",)
