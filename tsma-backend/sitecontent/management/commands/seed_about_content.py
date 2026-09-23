from django.core.management.base import BaseCommand

from sitecontent.models import CoreValue, Milestone


class Command(BaseCommand):
    help = "Weka data ya awali (seed) ya Core Values na Milestones za mfano - Admin anaweza kuhariri baadaye."

    def handle(self, *args, **options):
        values = [
            {
                "title_sw": "Weledi", "title_en": "Professionalism",
                "description_sw": "Tunatekeleza majukumu yetu kwa uadilifu na taaluma ya hali ya juu.",
                "description_en": "We carry out our work with integrity and the highest professional standards.",
                "icon": "🎯", "display_order": 1,
            },
            {
                "title_sw": "Uwazi", "title_en": "Transparency",
                "description_sw": "Uwazi katika uongozi, fedha na maamuzi yote ya kitaasisi.",
                "description_en": "Transparency in leadership, finances, and all institutional decisions.",
                "icon": "🔍", "display_order": 2,
            },
            {
                "title_sw": "Ushirikiano", "title_en": "Collaboration",
                "description_sw": "Tunaunganisha wadau mbalimbali kufikia malengo ya pamoja.",
                "description_en": "We bring together diverse stakeholders to achieve shared goals.",
                "icon": "🤝", "display_order": 3,
            },
            {
                "title_sw": "Ubunifu", "title_en": "Innovation",
                "description_sw": "Tunatafuta suluhisho mpya kuchochea ukuaji wa uchumi wa michezo.",
                "description_en": "We seek innovative solutions to drive growth in the sports economy.",
                "icon": "💡", "display_order": 4,
            },
        ]

        for v in values:
            obj, created = CoreValue.objects.get_or_create(title_sw=v["title_sw"], defaults=v)
            self.stdout.write(
                self.style.SUCCESS(f"{'Imeundwa' if created else 'Tayari ipo'}: {obj.title_sw}")
            )

        milestones = [
            {
                "year": 2020, "title_sw": "Kuanzishwa kwa TSMA", "title_en": "TSMA Founded",
                "description_sw": "[Hariri: Eleza jinsi TSMA ilivyoanzishwa na waanzilishi wake.]",
                "description_en": "[Edit: Describe how TSMA was founded and by whom.]",
                "display_order": 1,
            },
            {
                "year": 2023, "title_sw": "Mkutano wa Kwanza wa Kitaifa",
                "title_en": "First National Conference",
                "description_sw": "[Hariri: Eleza mkutano wa kwanza na mafanikio yake.]",
                "description_en": "[Edit: Describe the first conference and its outcomes.]",
                "display_order": 2,
            },
            {
                "year": 2026, "title_sw": "Uzinduzi wa Jukwaa la Kidijitali",
                "title_en": "Digital Platform Launch",
                "description_sw": "[Hariri: Eleza uzinduzi wa tovuti na huduma za kidijitali.]",
                "description_en": "[Edit: Describe the launch of the website and digital services.]",
                "display_order": 3,
            },
        ]

        for m in milestones:
            obj, created = Milestone.objects.get_or_create(
                year=m["year"], title_sw=m["title_sw"], defaults=m
            )
            self.stdout.write(
                self.style.SUCCESS(f"{'Imeundwa' if created else 'Tayari ipo'}: {obj.year} - {obj.title_sw}")
            )

        self.stdout.write(
            self.style.WARNING(
                "\nKumbuka: Milestones hizi ni MFANO tu (placeholder) - hariri kupitia "
                "Django Admin -> Site Content -> Hatua za Kihistoria, kuweka taarifa halisi za TSMA."
            )
        )
