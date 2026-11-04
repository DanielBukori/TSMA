"""
Find and remove content the site should not be showing as if it were real:

- placeholder text written by the old seed commands ("[Hariri ...]",
  "[Edit ...]", "[Weka ...]"),
- records the old demo seed left behind: `[DEMO]` marker in the title or any
  body field, or a `demo-` slug prefix,
- emoji icons on core values.

Default is a dry run. `--delete` writes a JSON backup under
`media/_content_purge/` first, then applies the changes.
"""

import json
from datetime import datetime
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from conferences.models import Conference
from gallery.models import GalleryAlbum
from news.models import News
from publications.models import Publication
from sitecontent.models import AboutContent, CoreValue, HomeStat, Milestone

PLACEHOLDER_MARKERS = ("[hariri", "[edit", "[weka")
DEMO_PREFIX = "[demo]"
DEMO_SLUG_PREFIX = "demo-"

# Text fields the seed commands wrote demo copy into. A record counts as a demo
# record when its title or slug still shows it, or when any of these fields
# carries the [DEMO] marker left behind by an earlier title cleanup.
DEMO_TEXT_FIELDS = {
    "conference": ("description", "theme", "venue_name", "physical_address"),
    "news": ("excerpt", "content"),
    "publication": ("abstract", "authors"),
    "galleryalbum": ("description",),
}


def is_placeholder(value):
    text = str(value or "").strip().lower()
    return text.startswith(PLACEHOLDER_MARKERS)


def has_demo_marker(value):
    return DEMO_PREFIX in str(value or "").lower()


def is_demo_record(obj):
    model = obj._meta.model_name
    if has_demo_marker(obj.title):
        return True
    if str(obj.slug or "").lower().startswith(DEMO_SLUG_PREFIX):
        return True
    return any(has_demo_marker(getattr(obj, field, "")) for field in DEMO_TEXT_FIELDS.get(model, ()))


def demo_text_fields(obj):
    """Fields on this record that hold invented [DEMO] copy."""
    return [
        field
        for field in DEMO_TEXT_FIELDS.get(obj._meta.model_name, ())
        if has_demo_marker(getattr(obj, field, ""))
    ]


def has_emoji(value):
    """Dingbats and pictographs (U+2190 and above) are not valid icon glyphs."""
    return any(ord(char) >= 0x2190 for char in str(value or ""))


class Command(BaseCommand):
    help = "Ondoa maudhui ya mfano/placeholder yaliyobaki kwenye hifadhi ya data."

    def add_arguments(self, parser):
        parser.add_argument(
            "--delete",
            action="store_true",
            help="Futa/badilisha kilichopatikana (kwanza andika nakala ya JSON).",
        )

    def handle(self, *args, **options):
        delete = options["delete"]

        findings = self.collect()
        self.report(findings, delete)
        if not delete:
            self.stdout.write(
                self.style.WARNING("Hakuna kilichobadilishwa. Tumia --delete kutekeleza.")
            )
            return

        if any(items for items in findings.values()):
            backup = self.write_backup(findings)
            self.stdout.write(f"Nakala ya data iliyobadilishwa: {backup}")
        self.apply(findings)

    def collect(self):
        about = AboutContent.objects.first()
        return {
            "home_stats": [
                stat
                for stat in HomeStat.objects.all()
                if is_placeholder(stat.label_sw) or is_placeholder(stat.label_en)
            ],
            "about": [about] if about and self.about_is_invented(about) else [],
            "core_values": [c for c in CoreValue.objects.all() if has_emoji(c.icon)],
            "milestones": [
                m
                for m in Milestone.objects.all()
                if is_placeholder(m.description_sw) or is_placeholder(m.description_en)
            ],
            "demo_news": [n for n in News.objects.all() if is_demo_record(n)],
            "demo_publications": [
                p for p in Publication.objects.all() if is_demo_record(p)
            ],
            "demo_conferences": [
                c for c in Conference.objects.all() if is_demo_record(c)
            ],
            "demo_albums": [
                a for a in GalleryAlbum.objects.all() if is_demo_record(a)
            ],
        }

    def about_is_invented(self, about):
        return (
            is_placeholder(about.history_body_sw)
            or is_placeholder(about.history_body_en)
            or "ilianzishwa kwa lengo la kuunganisha wataalamu" in about.history_body_sw
        )

    def report(self, findings, delete):
        verb = "FUTA" if delete else "TAFUTA"
        for label, items in findings.items():
            if not items:
                continue
            self.stdout.write(f"{verb} {label}: {len(items)}")
            for item in items:
                self.stdout.write(f"   - {item}")
        if not any(items for items in findings.values()):
            self.stdout.write(self.style.SUCCESS("Hakuna maudhui ya mfano yaliyobaki."))

    def write_backup(self, findings):
        folder = Path(settings.MEDIA_ROOT) / "_content_purge"
        folder.mkdir(parents=True, exist_ok=True)
        path = folder / f"purge_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        payload = {
            label: [json.loads(json.dumps(self.serialize(item), default=str)) for item in items]
            for label, items in findings.items()
            if items
        }
        path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
        return path

    def serialize(self, obj):
        from django.forms.models import model_to_dict

        data = model_to_dict(obj)
        data["_model"] = f"{obj._meta.app_label}.{obj._meta.model_name}"
        return data

    def apply(self, findings):
        for stat in findings["home_stats"]:
            stat.delete()
        for value in findings["core_values"]:
            value.icon = ""
            value.save(update_fields=["icon"])
        for milestone in findings["milestones"]:
            milestone.delete()
        for about in findings["about"]:
            about.history_title_sw = about.history_title_en = ""
            about.history_body_sw = about.history_body_en = ""
            about.vision_sw = about.vision_en = ""
            about.mission_sw = about.mission_en = ""
            about.save()

        # Demo records often hold files a member already uploaded, so they are
        # unpublished instead of deleted.
        for group in ("demo_news", "demo_publications", "demo_conferences", "demo_albums"):
            for record in findings[group]:
                self.hide_demo_record(record)

        self.stdout.write(self.style.SUCCESS("Maudhui ya mfano yameondolewa/yamefichwa."))

    def hide_demo_record(self, record):
        """Unpublish, and blank the [DEMO] sentences so a later publish cannot show them."""
        fields = ["title", "is_published"]
        record.title = clean_title(record.title)
        record.is_published = False
        for field in demo_text_fields(record):
            setattr(record, field, "")
            fields.append(field)
        record.save(update_fields=fields)


def clean_title(title):
    return title.replace("[DEMO] ", "").replace("[DEMO]", "").strip()
