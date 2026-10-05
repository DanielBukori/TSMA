from django.core.management.base import BaseCommand

from members.models import MembershipTier


class Command(BaseCommand):
    """
    Madaraja ya uanachama kulingana na ARTICLE 10 ya Katiba ya TSMA
    (Constitution of TSMA - DRAFT ONE):

      10.1 Founding Members   10.2 Ordinary Members   10.3 Student Members
      10.4 Institutional      10.5 Corporate          10.6 Honorary Members
      10.7 Fellows of TSMA (FTSMA)

    "Guest" HAIMO kwenye Katiba (mgeni anaona kurasa za umma bila kuwa
    mwanachama), kwa hiyo haipo tena. Tumia `--retire-old` kuondoa madaraja
    ya zamani yasiyo ya Katiba (Guest, Institution, College Lecturer,
    Entrepreneur, Sponsor, Investor).

    ADA: Article 15.1 inasema ada zinaamuliwa na General Assembly - hazimo
    kwenye Katiba. Namba hapa chini ni PENDEKEZO TU. Zinawekwa mara ya
    KWANZA (wakati daraja linaundwa); ukirudia command hii HAZIBADILISHWI
    tena - badilisha ada kupitia Django Admin -> Madaraja ya Uanachama.

    Founding/Honorary/Fellow zinaundwa is_active=False kwa MAKUSUDI: si za
    kujisajili mwenyewe (Katiba inasema zinatolewa na uongozi/General
    Assembly). Admin anampa mwanachama daraja hilo kupitia Django Admin.
    """

    help = "Weka madaraja ya uanachama kulingana na Article 10 ya Katiba ya TSMA."

    def add_arguments(self, parser):
        parser.add_argument(
            "--retire-old",
            action="store_true",
            help=(
                "Ondoa madaraja yasiyo ya Katiba: yasiyo na wanachama yanafutwa, "
                "yenye wanachama yanazimwa (is_active=False) ili wanachama wasipotee."
            ),
        )

    TIERS = [
        {
            "name": "Ordinary Member",  # Art 10.2
            "annual_fee": 150000,
            "requires_payment": True,
            "is_active": True,
            "display_order": 1,
            "description": (
                "Article 10.2 - Mtu mwenye sifa, uzoefu au maslahi katika usimamizi wa "
                "michezo. Ana kura kamili na anaweza kugombea nafasi za uongozi."
            ),
            "benefits": [
                "Kura kamili kwenye General Assembly",
                "Kugombea nafasi za uongozi",
                "Kadi ya kidijitali ya uanachama",
                "Programu za maendeleo ya kitaaluma",
            ],
        },
        {
            "name": "Student Member",  # Art 10.3
            "annual_fee": 30000,
            "requires_payment": True,
            "is_active": True,
            "display_order": 2,
            "description": (
                "Article 10.3 - Mwanafunzi wa chuo cha elimu ya juu anayesoma usimamizi wa "
                "michezo, elimu ya viungo, sayansi ya michezo, biashara, menejimenti, "
                "burudani au fani zinazohusiana. Hana kura wala haruhusiwi kugombea uongozi."
            ),
            "benefits": [
                "Kushiriki programu za TSMA",
                "Fursa za maendeleo ya kitaaluma",
                "Kuhudhuria mikutano",
                "Kuhudumu kwenye kamati (inapofaa)",
            ],
        },
        {
            "name": "Institutional Member",  # Art 10.4
            "annual_fee": 500000,
            "requires_payment": True,
            "is_active": True,
            "display_order": 3,
            "description": (
                "Article 10.4 - Chuo, chuo kikuu, shirikisho/chama/klabu ya michezo, taasisi ya "
                "serikali, kampuni binafsi, NGO, CBO au taasisi yoyote iliyosajiliwa kisheria. "
                "Huteua mwakilishi MMOJA aliyeidhinishwa kutumia haki za uanachama."
            ),
            "benefits": [
                "Mwakilishi mmoja aliyeidhinishwa",
                "Ushirikiano wa kitaasisi na TSMA",
                "Programu za kujenga uwezo wa uongozi",
            ],
        },
        {
            "name": "Corporate Member",  # Art 10.5
            "annual_fee": 1000000,
            "requires_payment": True,
            "is_active": True,
            "display_order": 4,
            "description": (
                "Article 10.5 - Kampuni au shirika la kibiashara linalotaka kusaidia malengo ya "
                "TSMA kupitia ushirikiano, udhamini au ushiriki wa kitaaluma. Halichagui "
                "viongozi moja kwa moja; linaweza kuteua wawakilishi kwenye kamati kwa idhini "
                "ya Executive Committee."
            ),
            "benefits": [
                "Fursa za udhamini na ushirikiano",
                "Wawakilishi kwenye kamati (kwa idhini ya Executive Committee)",
            ],
        },
        {
            "name": "Founding Member",  # Art 10.1 - si self-registration
            "annual_fee": 150000,
            "requires_payment": True,
            "is_active": False,
            "display_order": 5,
            "description": (
                "Article 10.1 - Waliohusika kuanzisha na kusajili TSMA (majina yao yapo kwenye "
                "kumbukumbu rasmi za usajili). Wana haki zote za Ordinary Member. Admin "
                "huwapa daraja hili moja kwa moja."
            ),
            "benefits": ["Haki zote za Ordinary Member", "Utambulisho kama mwanzilishi"],
        },
        {
            "name": "Honorary Member",  # Art 10.6 - si self-registration
            "annual_fee": 0,
            "requires_payment": False,
            "is_active": False,
            "display_order": 6,
            "description": (
                "Article 10.6 - Hutolewa na General Assembly kwa pendekezo la Executive "
                "Committee kwa mtu aliyetoa huduma bora kwa usimamizi wa michezo. Hana ada "
                "ya mwaka na hana kura (isipokuwa pia ana daraja jingine). Admin humpa mwenyewe."
            ),
            "benefits": ["Msamaha wa ada ya mwaka", "Heshima kutoka General Assembly"],
        },
        {
            "name": "Fellow (FTSMA)",  # Art 10.7 - si self-registration
            "annual_fee": 0,
            "requires_payment": False,
            "is_active": False,
            "display_order": 7,
            "description": (
                "Article 10.7 - Fellow of TSMA (FTSMA): mwanachama mashuhuri mwenye mafanikio "
                "ya kipekee ya kitaaluma, uongozi au usomi. Vigezo vinawekwa kwenye kanuni "
                "zinazopitishwa na General Assembly. Admin humpa mwenyewe."
            ),
            "benefits": ["Cheo cha FTSMA", "Utambulisho wa juu wa kitaaluma ndani ya TSMA"],
        },
    ]

    # Fields zinazosawazishwa kila command inapoendeshwa (maelezo tu).
    # annual_fee na is_active HAZIGUSWI baada ya daraja kuundwa (Admin anazisimamia).
    SYNCED_FIELDS = ("requires_payment", "display_order", "description", "benefits")

    def handle(self, *args, **options):
        constitution_names = []

        for data in self.TIERS:
            constitution_names.append(data["name"])
            defaults = {k: v for k, v in data.items() if k != "name"}
            defaults["currency"] = "TZS"
            tier, created = MembershipTier.objects.get_or_create(
                name=data["name"], defaults=defaults
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"Imeundwa: {tier.name}"))
            else:
                for field in self.SYNCED_FIELDS:
                    setattr(tier, field, data[field])
                tier.save()
                self.stdout.write(f"Imesasishwa maelezo (ada/hali havikuguswa): {tier.name}")

        old_tiers = MembershipTier.objects.exclude(name__in=constitution_names)

        if options["retire_old"]:
            for tier in old_tiers:
                if tier.members.exists():
                    tier.is_active = False
                    tier.save(update_fields=["is_active", "updated_at"])
                    self.stdout.write(
                        self.style.WARNING(
                            f"Imezimwa (ina wanachama, haiwezi kufutwa): {tier.name}"
                        )
                    )
                else:
                    name = tier.name
                    tier.delete()
                    self.stdout.write(self.style.WARNING(f"Imefutwa: {name}"))
        elif old_tiers.exists():
            names = ", ".join(t.name for t in old_tiers)
            self.stdout.write(
                self.style.WARNING(
                    f"\nMadaraja ya zamani (si ya Katiba) bado yapo: {names}\n"
                    "Yaondoe kwa: python manage.py seed_membership_tiers --retire-old"
                )
            )

        self.stdout.write(
            self.style.WARNING(
                "\nKUMBUKA: ada ni MAPENDEKEZO tu - Article 15.1 ya Katiba inasema General "
                "Assembly ndiyo inaamua. Zibadilishe kwenye Django Admin -> Madaraja ya "
                "Uanachama baada ya kuthibitishwa."
            )
        )
