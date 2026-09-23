from django.core.management.base import BaseCommand

from members.models import MembershipTier


class Command(BaseCommand):
    """
    Madaraja haya sasa yanafuata Article 10 (Categories of Membership) ya
    Katiba rasmi ya TSMA (Constitution_of_TSMA_-_DRAFT_0NE.pdf), badala
    ya majina ya awali ya mfano (Institution/College Lecturer/
    Entrepreneur/Sponsor/Investor).

    Ada (annual_fee) hazikuwekwa kwenye Katiba - Article 15.1 inasema
    wazi ada zinaamuliwa na General Assembly. Kwa hiyo namba hapa chini
    ni MFANO/PENDEKEZO tu - Bosi/Uongozi lazima uzithibitishe rasmi na
    General Assembly, kisha uzibadilishe kwenye Django Admin (Madaraja
    ya Uanachama) - hakuna code inayohitaji kubadilika kufanya hivyo.

    is_active=False kwa Founding/Honorary/Fellows kwa MAKUSUDI: hizi SI
    madaraja ya kujisajili mwenyewe (public self-registration) - Katiba
    inasema wazi zinatolewa na General Assembly kwa mapendekezo
    (Founding = tayari kihistoria, Honorary/Fellows = kutambuliwa na
    Executive Committee/General Assembly). Admin anaweza kuyawasha
    (is_active=True) au kumpa mwanachama mmoja moja daraja hilo moja kwa
    moja kupitia Django Admin, bila kupitia fomu ya umma ya "Jiunge Nasi".
    """

    help = "Weka madaraja ya uanachama kulingana na Article 10 ya Katiba ya TSMA (seed data)."

    def handle(self, *args, **options):
        tiers = [
            {
                "name": "Guest",
                "annual_fee": 0,
                "currency": "TZS",
                "requires_payment": False,
                "is_active": True,
                "description": "Ufikiaji wa kurasa za umma pekee, bila malipo (si daraja la Katiba).",
                "benefits": ["Kuona kurasa za umma (Home, About, News, Gallery)"],
                "display_order": 0,
            },
            {
                # Article 10.2 - daraja kuu, kura kamili, wanaweza kugombea uongozi
                "name": "Ordinary Member",
                "annual_fee": 150000,
                "currency": "TZS",
                "requires_payment": True,
                "is_active": True,
                "description": (
                    "Article 10.2 - Wanachama wenye sifa/uzoefu/maslahi katika usimamizi wa "
                    "michezo. Kura kamili na wanaweza kugombea uongozi."
                ),
                "benefits": ["Kura kamili", "Kugombea uongozi", "Kadi ya kidijitali", "Punguzo la machapisho/conference"],
                "display_order": 1,
            },
            {
                # Article 10.3 - hakuna kura/kugombea
                "name": "Student Member",
                "annual_fee": 30000,
                "currency": "TZS",
                "requires_payment": True,
                "is_active": True,
                "description": (
                    "Article 10.3 - Wanafunzi wa vyuo vikuu/vyuo wanaosoma masomo yanayohusiana "
                    "na usimamizi wa michezo. Hawana kura wala kugombea uongozi."
                ),
                "benefits": ["Fursa za maendeleo ya kitaaluma", "Kuhudhuria mikutano"],
                "display_order": 2,
            },
            {
                # Article 10.4 - mwakilishi mmoja aliyeidhinishwa
                "name": "Institutional Member",
                "annual_fee": 500000,
                "currency": "TZS",
                "requires_payment": True,
                "is_active": True,
                "description": (
                    "Article 10.4 - Vyuo vikuu, vyuo, mashirikisho/vyama/vilabu vya michezo, "
                    "taasisi za serikali, NGOs n.k. Huteua mwakilishi mmoja aliyeidhinishwa."
                ),
                "benefits": ["Mwakilishi mmoja aliyeidhinishwa", "Ushirikiano wa kitaasisi"],
                "display_order": 3,
            },
            {
                # Article 10.5 - hawagombei uongozi moja kwa moja
                "name": "Corporate Member",
                "annual_fee": 1000000,
                "currency": "TZS",
                "requires_payment": True,
                "is_active": True,
                "description": (
                    "Article 10.5 - Makampuni/mashirika ya kibiashara yanayotaka kusaidia malengo "
                    "ya TSMA kupitia udhamini/ushirikiano. Hawagombei uongozi moja kwa moja."
                ),
                "benefits": ["Fursa za udhamini", "Kutaja wawakilishi kwenye kamati (kwa idhini ya Executive Committee)"],
                "display_order": 4,
            },
            {
                # Article 10.1 - kihistoria pekee, si self-registration
                "name": "Founding Member",
                "annual_fee": 150000,
                "currency": "TZS",
                "requires_payment": True,
                "is_active": False,
                "description": (
                    "Article 10.1 - Waliohusika kuanzisha/kusajili TSMA. Wana haki zote za "
                    "Ordinary Member. HAIONEKANI kwenye usajili wa umma - Admin anaweka mwenyewe."
                ),
                "benefits": ["Haki zote za Ordinary Member", "Kutambuliwa kihistoria kama muanzilishi"],
                "display_order": 5,
            },
            {
                # Article 10.6 - inatolewa na General Assembly, si self-registration
                "name": "Honorary Member",
                "annual_fee": 0,
                "currency": "TZS",
                "requires_payment": False,
                "is_active": False,
                "description": (
                    "Article 10.6 - Inatolewa na General Assembly (pendekezo la Executive "
                    "Committee) kwa mchango bora kwa michezo. Hakuna ada. HAIONEKANI kwenye "
                    "usajili wa umma - Admin anaweka mwenyewe."
                ),
                "benefits": ["Msamaha wa ada ya mwaka", "Heshima maalum kutoka General Assembly"],
                "display_order": 6,
            },
            {
                # Article 10.7 - FTSMA, cheo cha juu cha kitaaluma, si self-registration
                "name": "Fellow (FTSMA)",
                "annual_fee": 0,
                "currency": "TZS",
                "requires_payment": False,
                "is_active": False,
                "description": (
                    "Article 10.7 - Fellow of TSMA - cheo cha juu cha kitaaluma kwa mchango wa "
                    "kipekee. Vigezo vinaamuliwa na kanuni za General Assembly. HAIONEKANI "
                    "kwenye usajili wa umma - Admin anaweka mwenyewe."
                ),
                "benefits": ["Jina la 'FTSMA' baada ya jina", "Heshima ya juu kabisa ya kitaaluma TSMA"],
                "display_order": 7,
            },
        ]

        for tier_data in tiers:
            tier, created = MembershipTier.objects.update_or_create(
                name=tier_data["name"], defaults=tier_data
            )
            action = "Imeundwa" if created else "Imesasishwa"
            self.stdout.write(self.style.SUCCESS(f"{action}: {tier.name}"))

        self.stdout.write(
            self.style.WARNING(
                "\nKUMBUKA: Ada (annual_fee) ni MAPENDEKEZO ya mfano tu - Article 15.1 ya "
                "Katiba inasema ada zinaamuliwa na General Assembly. Baada ya uongozi "
                "kuthibitisha ada rasmi, zibadilishe kwenye Django Admin -> Madaraja ya "
                "Uanachama (hakuna code inayohitaji kubadilika).\n"
                "Founding/Honorary/Fellow (FTSMA) zimewekwa is_active=False kwa makusudi - "
                "si za kujisajili mwenyewe, Admin anazitoa moja kwa moja."
            )
        )
