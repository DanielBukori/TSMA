from django.contrib import admin

from .models import (
    AboutContent,
    CoreValue,
    HomeStat,
    Milestone,
    PageBannerContent,
    SiteBackgroundImage,
    SiteSettings,
)


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


@admin.register(PageBannerContent)
class PageBannerContentAdmin(admin.ModelAdmin):
    """
    Hariri maandishi ya "banner" ya juu ya kila ukurasa (badge, kichwa,
    maelezo mafupi, na kitufe cha CTA hiari) — kwa Kiswahili na
    Kiingereza. Bofya ukurasa unaotaka kwenye orodha hapa chini kuuhariri.

    Rekodi hizi zinatengenezwa awali na amri `seed_page_banners`
    (python manage.py seed_page_banners) — hazipaswi kuongezwa/kufutwa
    kwa mkono kwa sababu orodha ya kurasa (page_key) ni fasta kwenye code
    ya frontend; ukiifuta, ukurasa husika utaonyesha banner tupu.
    """

    list_display = ("get_page_key_display", "title_sw", "title_en", "updated_at")
    list_display_links = ("get_page_key_display", "title_sw")
    search_fields = ("title_sw", "title_en", "page_key")

    fieldsets = (
        (None, {"fields": ("page_key",)}),
        ("Badge", {"fields": ("badge_sw", "badge_en")}),
        ("Kichwa (Title)", {"fields": ("title_sw", "title_en")}),
        ("Maelezo Mafupi (Subtitle) — hiari", {"fields": ("subtitle_sw", "subtitle_en")}),
        (
            "Kitufe cha Wito (CTA) — hiari, huonekana Publications pekee kwa sasa",
            {"fields": ("cta_text_sw", "cta_text_en", "cta_url")},
        ),
    )
    readonly_fields = ("page_key", "updated_at")

    def has_add_permission(self, request):
        # Zote 13 zinatengenezwa na seed_page_banners - usiruhusu duplicate
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    @admin.display(description="Ukurasa")
    def get_page_key_display(self, obj):
        return obj.get_page_key_display()


@admin.register(HomeStat)
class HomeStatAdmin(admin.ModelAdmin):
    """
    Takwimu za InfoBox kwenye Home (namba kubwa katikati + tiles nne chini
    yake). Ongeza/ondoa/hariri wakati wowote — mfano badilisha idadi ya
    wanachama, mikoa, au ongeza takwimu mpya kabisa. "Aina" = Namba Kuu
    inaonekana MOJA tu (ya kwanza kwa 'Display order'); "Tile" zinaonekana
    nne za kwanza kwenye gridi.
    """

    list_display = ("value", "label_sw", "label_en", "kind", "display_order")
    list_editable = ("kind", "display_order")
    ordering = ("display_order", "id")
