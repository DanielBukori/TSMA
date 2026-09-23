from django.contrib import admin

from .models import AboutContent, CoreValue, Milestone, SiteBackgroundImage, SiteSettings


@admin.register(SiteBackgroundImage)
class SiteBackgroundImageAdmin(admin.ModelAdmin):
    """
    Pakia picha halisi za TSMA hapa (matukio, mikutano, ofisi, n.k.) —
    zinaonekana kiotomatiki kwenye Home hero NA "banner" za kurasa
    zingine (Board, Management, Careers, Directory...) - ukurasa mzima
    hauitaji kuguswa tena baada ya kupakia.
    """

    list_display = ("caption", "is_active", "display_order", "created_at")
    list_editable = ("is_active", "display_order")
    ordering = ("display_order", "-created_at")


@admin.register(SiteSettings)
class SiteSettingsAdmin(admin.ModelAdmin):
    """
    Hapa ndipo Admin anapakia LOGO na FAVICON ya TSMA pindi zitakapokuwa
    tayari — hakuna deployment mpya inayohitajika, mabadiliko yanaonekana
    papo hapo kwenye tovuti (Navbar/Footer zinasoma kutoka API hii).
    """

    fieldsets = (
        (
            "Logo",
            {
                "fields": ("logo_image", "logo_on_dark"),
                "description": (
                    "'Logo' ni kwa Navbar (background nyeupe). 'Logo (background "
                    "iliyokoza)' ni hiari, kwa Footer — ukiiacha wazi, Footer "
                    "itatumia 'Logo' ile ile."
                ),
            },
        ),
        ("Favicon", {"fields": ("favicon",)}),
    )
    readonly_fields = ("updated_at",)

    def has_add_permission(self, request):
        # Singleton — usiruhusu kuongeza rekodi ya pili
        return not SiteSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(AboutContent)
class AboutContentAdmin(admin.ModelAdmin):
    """
    Hapa ndipo Admin anahariri Historia, Dira na Dhamira ya TSMA
    zinazoonekana kwenye ukurasa wa About — kwa Kiswahili na Kiingereza
    pande zote mbili, bila kugusa code.
    """

    fieldsets = (
        ("Historia (History)", {
            "fields": (
                "history_title_sw", "history_title_en",
                "history_body_sw", "history_body_en",
            )
        }),
        ("Dira (Vision)", {"fields": ("vision_sw", "vision_en")}),
        ("Dhamira (Mission)", {"fields": ("mission_sw", "mission_en")}),
    )

    def has_add_permission(self, request):
        # Singleton — usiruhusu kuongeza rekodi ya pili
        return not AboutContent.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(CoreValue)
class CoreValueAdmin(admin.ModelAdmin):
    list_display = ("title_sw", "title_en", "icon", "display_order")
    list_editable = ("display_order",)
    ordering = ("display_order",)


@admin.register(Milestone)
class MilestoneAdmin(admin.ModelAdmin):
    list_display = ("year", "title_sw", "title_en", "display_order")
    list_editable = ("display_order",)
    ordering = ("year", "display_order")
