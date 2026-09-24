from django.core.management.base import BaseCommand

from sitecontent.models import PageBannerContent

# Maandishi haya ni yale yale yaliyokuwa yamewekwa moja kwa moja (hardcoded)
# ndani ya kila ukurasa kabla ya mfumo huu wa PageBannerContent — amri hii
# inayahamishia kwenye database ili Admin aweze kuyahariri kupitia Django
# Admin bila kugusa code tena. Ni SALAMA kuiendesha mara nyingi (get_or_create
# - haiandiki tena juu ya mabadiliko ya Admin yaliyokwishafanyika).
BANNERS = [
    dict(
        page_key="about",
        badge_sw="KUHUSU SISI", badge_en="ABOUT US",
        title_sw="TSMA — Tunaowajibika Kwako", title_en="TSMA — Committed to You",
    ),
    dict(
        page_key="board",
        badge_sw="UONGOZI WETU", badge_en="OUR LEADERSHIP",
        title_sw="Wanabodi wa TSMA", title_en="TSMA Board Members",
        subtitle_sw="Bofya kadi ya mjumbe kuona wasifu wake kamili.",
        subtitle_en="Tap a member's card to view their full profile.",
    ),
    dict(
        page_key="management",
        badge_sw="UONGOZI WA UTENDAJI", badge_en="EXECUTIVE MANAGEMENT",
        title_sw="Management ya TSMA", title_en="TSMA Management",
        subtitle_sw="Timu inayoendesha shughuli za kila siku za TSMA. Bofya kadi kuona wasifu kamili.",
        subtitle_en="The team running TSMA's day-to-day operations. Tap a card to view their full profile.",
    ),
    dict(
        page_key="members",
        badge_sw="UANACHAMA", badge_en="MEMBERSHIP",
        title_sw="Jiunge na TSMA", title_en="Join TSMA",
        subtitle_sw="Chagua daraja linalokufaa — lipia moja kwa moja kupitia simu au kadi.",
        subtitle_en="Choose the tier that fits you — pay directly via mobile money or card.",
    ),
    dict(
        page_key="conferences",
        badge_sw="MIKUTANO", badge_en="CONFERENCES",
        title_sw="Mikutano ya TSMA", title_en="TSMA Conferences",
    ),
    dict(
        page_key="publications",
        badge_sw="MAKTABA", badge_en="LIBRARY",
        title_sw="Machapisho ya Kitaaluma", title_en="Academic Publications",
        subtitle_sw="Bure, za wanachama, au za kununua — tafiti na ripoti za sekta ya michezo.",
        subtitle_en="Free, member-only, or purchasable — research and reports from the sports sector.",
        cta_text_sw="Wasilisha Utafiti →", cta_text_en="Submit Research →",
        cta_url="/publications/submit-abstract",
    ),
    dict(
        page_key="teaching",
        badge_sw="KOZI NA MAFUNZO", badge_en="COURSES AND TRAINING",
        title_sw="Jifunze na TSMA", title_en="Learn with TSMA",
        subtitle_sw="Kozi, vikao vya moja kwa moja, na video zilizorekodiwa kwa wataalamu wa usimamizi wa michezo.",
        subtitle_en="Courses, live sessions, and recorded videos for sports management professionals.",
    ),
    dict(
        page_key="news",
        badge_sw="HABARI", badge_en="NEWS",
        title_sw="Habari na Matukio", title_en="News & Updates",
    ),
    dict(
        page_key="gallery",
        badge_sw="PICHA", badge_en="GALLERY",
        title_sw="Kumbukumbu za Picha", title_en="Photo Gallery",
        subtitle_sw="Matukio, mikutano na shughuli za TSMA kwa miaka.",
        subtitle_en="TSMA's events, conferences, and activities over the years.",
    ),
    dict(
        page_key="contact",
        badge_sw="MAWASILIANO", badge_en="CONTACT",
        title_sw="Wasiliana Nasi", title_en="Get In Touch",
        subtitle_sw="Tuko tayari kukusaidia — piga simu, tuma ujumbe, au jaza fomu hapa chini.",
        subtitle_en="We're here to help — call, message, or fill the form below.",
    ),
    dict(
        page_key="founders",
        badge_sw="★ WAANZILISHI", badge_en="★ FOUNDERS",
        title_sw="Waanzilishi wa TSMA", title_en="Founders of TSMA",
        subtitle_sw="Watu waliobeba dira ya kuanzisha TSMA na kuiongoza hadi hapa ilipofika.",
        subtitle_en="The people who carried the vision to found TSMA and led it to where it stands today.",
    ),
    dict(
        page_key="careers",
        badge_sw="NAFASI ZA AJIRA", badge_en="CAREERS",
        title_sw="Jiunge na Timu ya TSMA", title_en="Join the TSMA Team",
    ),
    dict(
        page_key="directory",
        badge_sw="MTANDAO WA WATAALAMU", badge_en="PROFESSIONALS NETWORK",
        title_sw="Wataalamu wa TSMA", title_en="TSMA Professionals",
        subtitle_sw="Tafuta na uunganishwe na wataalamu wa usimamizi wa michezo Tanzania.",
        subtitle_en="Find and connect with sports management professionals across Tanzania.",
    ),
]


class Command(BaseCommand):
    help = "Seed PageBannerContent na maandishi yaliyokuwepo kabla (bilingual, kurasa 13)."

    def handle(self, *args, **options):
        created, updated_skipped = 0, 0
        for data in BANNERS:
            obj, was_created = PageBannerContent.objects.get_or_create(
                page_key=data["page_key"], defaults=data,
            )
            if was_created:
                created += 1
            else:
                updated_skipped += 1

        self.stdout.write(self.style.SUCCESS(
            f"PageBannerContent: {created} zimetengenezwa mpya, "
            f"{updated_skipped} tayari zilikuwepo (haikuguswa - Admin "
            f"anaweza kuwa amekwisha zihariri)."
        ))
