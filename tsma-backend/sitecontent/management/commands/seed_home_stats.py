from django.core.management.base import BaseCommand

from sitecontent.models import HomeStat

# Namba/maneno haya ni YALE YALE yaliyokuwa hardcoded kwenye InfoBox.jsx
# kabla ya mfumo huu (demo placeholder data) — sasa yanahamishwa DB ili
# Admin aweze kuyahariri (idadi ya wanachama, mikoa, n.k.) kupitia Django
# Admin bila kugusa code. Maelezo (label) yaliyowekwa hapa ni MAPENDEKEZO
# tu kwa kile maneno ya awali ya i18next (infoBox.bigLabel/tile1..4)
# huenda yalikuwa yanamaanisha — Admin anapaswa kuyathibitisha/kuyahariri
# kwenye Django Admin (sitecontent -> Takwimu za Home) baada ya kuendesha
# amri hii, hasa 'label' za tile — hazikuletwa kwenye faili za awali
# zilizopokelewa (locale JSON haikuwa sehemu ya uhamishaji huu).
STATS = [
    dict(
        kind=HomeStat.Kind.BIG, value="26",
        label_sw="[Hariri: maelezo ya namba hii]",
        label_en="[Edit: description for this number]",
        display_order=0,
    ),
    dict(
        kind=HomeStat.Kind.TILE, value="1,200+",
        label_sw="Wanachama", label_en="Members",
        display_order=1,
    ),
    dict(
        kind=HomeStat.Kind.TILE, value="TZS 5M",
        label_sw="[Hariri: maelezo ya thamani hii]",
        label_en="[Edit: description for this value]",
        display_order=2,
    ),
    dict(
        kind=HomeStat.Kind.TILE, value="18",
        label_sw="Mikoa", label_en="Regions",
        display_order=3,
    ),
    dict(
        kind=HomeStat.Kind.TILE, value="Dar es Salaam",
        label_sw="Makao Makuu", label_en="Headquarters",
        display_order=4,
    ),
]


class Command(BaseCommand):
    help = "Seed HomeStat na takwimu za placeholder zilizokuwepo kwenye InfoBox.jsx (5 entries)."

    def handle(self, *args, **options):
        if HomeStat.objects.exists():
            self.stdout.write(self.style.WARNING(
                "HomeStat tayari ina rekodi - amri hii haiendeshi tena "
                "(ili kuepusha kurudufu). Futa zote kwenye Admin kama "
                "unataka kuanza upya, kisha rudia amri hii."
            ))
            return

        HomeStat.objects.bulk_create([HomeStat(**data) for data in STATS])
        self.stdout.write(self.style.SUCCESS(
            f"HomeStat: rekodi {len(STATS)} zimetengenezwa. NENDA Django "
            f"Admin -> Takwimu za Home kuhakiki/kuhariri maelezo (label) "
            f"kabla ya kuzindua - baadhi ni placeholder tu (tazama alama "
            f"[Hariri: ...])."
        ))
