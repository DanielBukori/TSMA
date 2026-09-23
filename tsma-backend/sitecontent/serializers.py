from rest_framework import serializers

from .models import AboutContent, CoreValue, Milestone, SiteBackgroundImage, SiteSettings


class SiteBackgroundImageSerializer(serializers.ModelSerializer):
    """Public - kwa slideshow ya background (Home hero + kurasa zingine)."""

    class Meta:
        model = SiteBackgroundImage
        fields = ("id", "image", "caption")


class SiteSettingsSerializer(serializers.ModelSerializer):
    """
    Public — inatumiwa na Navbar/Footer kupata URL za logo/favicon.
    Kama field haina picha bado, DRF inarudisha `null` na frontend
    inatumia fallback yake ya maandishi ("T"/"TSMA").
    """

    class Meta:
        model = SiteSettings
        fields = ("logo_image", "logo_on_dark", "favicon", "updated_at")


class AdminSiteSettingsSerializer(serializers.ModelSerializer):
    """Board/Super Admin — kupakia/kubadilisha logo na favicon."""

    class Meta:
        model = SiteSettings
        fields = ("logo_image", "logo_on_dark", "favicon", "updated_at")
        read_only_fields = ("updated_at",)


class CoreValueSerializer(serializers.ModelSerializer):
    class Meta:
        model = CoreValue
        fields = (
            "id", "title_sw", "title_en", "description_sw", "description_en", "icon",
        )


class MilestoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = Milestone
        fields = ("id", "year", "title_sw", "title_en", "description_sw", "description_en")


class AboutContentSerializer(serializers.ModelSerializer):
    values = serializers.SerializerMethodField()
    milestones = serializers.SerializerMethodField()

    class Meta:
        model = AboutContent
        fields = (
            "history_title_sw", "history_title_en", "history_body_sw", "history_body_en",
            "vision_sw", "vision_en", "mission_sw", "mission_en",
            "values", "milestones", "updated_at",
        )

    def get_values(self, obj):
        return CoreValueSerializer(CoreValue.objects.all(), many=True).data

    def get_milestones(self, obj):
        return MilestoneSerializer(Milestone.objects.all(), many=True).data


class AdminAboutContentSerializer(serializers.ModelSerializer):
    class Meta:
        model = AboutContent
        fields = (
            "history_title_sw", "history_title_en", "history_body_sw", "history_body_en",
            "vision_sw", "vision_en", "mission_sw", "mission_en", "updated_at",
        )
        read_only_fields = ("updated_at",)


class AdminCoreValueSerializer(serializers.ModelSerializer):
    class Meta:
        model = CoreValue
        fields = (
            "id", "title_sw", "title_en", "description_sw", "description_en",
            "icon", "display_order",
        )
        read_only_fields = ("id",)


class AdminMilestoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = Milestone
        fields = (
            "id", "year", "title_sw", "title_en", "description_sw", "description_en",
            "display_order",
        )
        read_only_fields = ("id",)
