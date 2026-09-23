from rest_framework import serializers

from .models import News, NewsCategory, NewsImage


class NewsCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = NewsCategory
        fields = ("id", "name", "slug")


class NewsImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = NewsImage
        fields = ("id", "image", "display_order")


class NewsListSerializer(serializers.ModelSerializer):
    """
    Public: muonekano wa 'feed' (kama YouTube Community/Instagram) —
    maelezo + picha (hiari, moja au nyingi kama carousel).
    """

    category = NewsCategorySerializer(read_only=True)
    author_name = serializers.CharField(source="author.get_full_name", read_only=True)
    images = NewsImageSerializer(many=True, read_only=True)

    class Meta:
        model = News
        fields = (
            "id",
            "title",
            "slug",
            "category",
            "excerpt",
            "content",
            "images",
            "author_name",
            "published_at",
            "views_count",
        )


class NewsDetailSerializer(serializers.ModelSerializer):
    """Public: chapisho kamili + picha zote (kwa lightbox/carousel)."""

    category = NewsCategorySerializer(read_only=True)
    author_name = serializers.CharField(source="author.get_full_name", read_only=True)
    images = NewsImageSerializer(many=True, read_only=True)

    class Meta:
        model = News
        fields = (
            "id",
            "title",
            "slug",
            "category",
            "excerpt",
            "content",
            "images",
            "author_name",
            "published_at",
            "views_count",
        )


class AdminNewsSerializer(serializers.ModelSerializer):
    """
    Kwa Content Editor/Board/Super Admin kuandika post mpya.
    `uploaded_images` inapokea faili nyingi mara moja (multipart/form-data,
    field iliyorudiwa mfano uploaded_images=file1&uploaded_images=file2)
    ili kutengeneza NewsImage kadhaa kwa chapisho moja (kama Instagram carousel).
    """

    images = NewsImageSerializer(many=True, read_only=True)
    uploaded_images = serializers.ListField(
        child=serializers.ImageField(),
        write_only=True,
        required=False,
        allow_empty=True,
        help_text="Picha (hiari) — inaweza kuwa 0, 1, au nyingi.",
    )

    class Meta:
        model = News
        fields = (
            "id",
            "title",
            "slug",
            "category",
            "excerpt",
            "content",
            "images",
            "uploaded_images",
            "is_published",
            "published_at",
            "views_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "slug", "views_count", "created_at", "updated_at")

    def create(self, validated_data):
        uploaded_images = validated_data.pop("uploaded_images", [])
        news = News.objects.create(**validated_data)
        self._save_images(news, uploaded_images)
        return news

    def update(self, instance, validated_data):
        uploaded_images = validated_data.pop("uploaded_images", None)
        instance = super().update(instance, validated_data)
        if uploaded_images:
            self._save_images(instance, uploaded_images)
        return instance

    @staticmethod
    def _save_images(news, uploaded_images):
        for index, image_file in enumerate(uploaded_images):
            NewsImage.objects.create(news=news, image=image_file, display_order=index)


class AdminNewsImageSerializer(serializers.ModelSerializer):
    """Kuhariri mpangilio wa picha moja au kuifuta bila kugusa chapisho zima."""

    class Meta:
        model = NewsImage
        fields = ("id", "news", "image", "display_order")
        read_only_fields = ("id",)
