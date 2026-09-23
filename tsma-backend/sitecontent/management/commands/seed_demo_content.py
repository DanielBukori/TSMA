"""
seed_demo_content — Jaza tovuti na maudhui ya mfano (mock-up) yenye kuonekana
halisi, kwa ajili ya DEMO kwa mteja (SIO data ya production).

Kwa nini hii inahitajika: baada ya `migrate` kwenye database mpya (SQLite
ya demo), tovuti INAKUWA TUPU — hakuna "data iliyopo inayofall-back",
kwa sababu database mpya haina rekodi zozote. Hii command inaunda maudhui
ya mfano (yenye picha/PDF zilizotengenezwa papo hapo, si za kuvuta
mtandaoni) katika apps zote muhimu, ili mteja aone tovuti "ikiwa hai"
badala ya kurasa tupu.

MUHIMU: Hii ni DATA YA MFANO TU. Kabla ya kwenda live kwa umma, futa
maudhui haya (Django Admin, chagua zote zenye alama "[DEMO]" -> Delete)
na uweke maudhui halisi ya TSMA.

Matumizi:
    python manage.py seed_demo_content
"""

import io
import random
from datetime import timedelta

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.models import User
from board.models import BoardMember
from conferences.models import Conference, ConferenceTicketType
from gallery.models import GalleryAlbum, GalleryImage
from management_team.models import ManagementMember
from news.models import News, NewsCategory
from publications.models import Publication, PublicationAccessType, PublicationCategory


TSMA_NAVY = (10, 35, 66)
TSMA_GOLD = (201, 162, 39)
TSMA_CREAM = (245, 241, 230)


def _placeholder_image(label, size=(900, 600), bg=TSMA_NAVY, fg=TSMA_CREAM):
    """Tengeneza picha rahisi ya JPEG (rangi ya brand + maandishi) papo
    kwa papo — hakuna faili la nje linalohitajika. Kwa DEMO pekee."""
    from PIL import Image, ImageDraw, ImageFont

    img = Image.new("RGB", size, bg)
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.load_default(size=36)
    except TypeError:
        font = ImageFont.load_default()
    text = f"TSMA\n[DEMO]\n{label}"
    bbox = draw.multiline_textbbox((0, 0), text, font=font, align="center")
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.multiline_text(
        ((size[0] - w) / 2, (size[1] - h) / 2), text, fill=fg, font=font, align="center"
    )
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return ContentFile(buf.getvalue())


def _placeholder_pdf(title_text):
    """
    Tengeneza PDF halali (moja ya ukurasa) BILA maktaba ya ziada
    (reportlab n.k.) — offsets za xref zinahesabiwa papo kwa papo ili
    faili iwe sahihi kwenye kila kisomaji. Kwa DEMO pekee — mwandishi
    atapakia PDF halisi baadaye.
    """
    safe_text = title_text.replace("(", "").replace(")", "")[:70]
    stream = f"BT /F1 16 Tf 40 250 Td (TSMA - {safe_text}) Tj ET\nBT /F1 11 Tf 40 220 Td (Hiki ni chapisho la MFANO - DEMO pekee.) Tj ET"
    stream_bytes = stream.encode("latin-1", errors="replace")

    objects = [
        b"<</Type/Catalog/Pages 2 0 R>>",
        b"<</Type/Pages/Kids[3 0 R]/Count 1>>",
        b"<</Type/Page/Parent 2 0 R/Resources<</Font<</F1 4 0 R>>>>"
        b"/MediaBox[0 0 400 300]/Contents 5 0 R>>",
        b"<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>",
        b"<</Length " + str(len(stream_bytes)).encode() + b">>stream\n"
        + stream_bytes + b"\nendstream",
    ]

    out = io.BytesIO()
    out.write(b"%PDF-1.4\n")
    offsets = [0]
    for i, obj in enumerate(objects, start=1):
        offsets.append(out.tell())
        out.write(f"{i} 0 obj".encode() + obj + b"endobj\n")

    xref_offset = out.tell()
    out.write(f"xref\n0 {len(objects) + 1}\n".encode())
    out.write(b"0000000000 65535 f \n")
    for off in offsets[1:]:
        out.write(f"{off:010d} 00000 n \n".encode())
    out.write(
        f"trailer<</Size {len(objects) + 1}/Root 1 0 R>>\nstartxref\n{xref_offset}\n%%EOF".encode()
    )
    return ContentFile(out.getvalue())


class Command(BaseCommand):
    help = "Jaza tovuti na maudhui ya MFANO (News/Board/Gallery/Publications/Conference) kwa demo ya mteja."

    def handle(self, *args, **options):
        admin = User.objects.filter(is_superuser=True).order_by("id").first()
        if not admin:
            self.stderr.write(self.style.ERROR(
                "Hakuna superuser bado. Fanya 'python manage.py createsuperuser' kwanza."
            ))
            return

        self._seed_news(admin)
        self._seed_board(admin)
        self._seed_management(admin)
        self._seed_gallery(admin)
        self._seed_publications(admin)
        self._seed_conference(admin)

        self.stdout.write(self.style.SUCCESS(
            "\nDemo content imewekwa. Fungua tovuti — News/Board/Gallery/"
            "Publications/Conferences sasa zina maudhui ya mfano.\n"
            "KUMBUKA: haya ni ya DEMO pekee — yafute kwenye Django Admin "
            "(tafuta '[DEMO]') kabla ya kwenda live kwa umma."
        ))

    # ------------------------------------------------------------------
    def _seed_news(self, admin):
        category, _ = NewsCategory.objects.get_or_create(name="Matangazo")
        posts = [
            ("[DEMO] TSMA Yazindua Tovuti Rasmi",
             "Tunayo furaha kuwatangazia uzinduzi wa tovuti rasmi ya TSMA — "
             "jukwaa jipya la kidijitali litakalounganisha wataalamu wa "
             "usimamizi wa michezo kote Tanzania."),
            ("[DEMO] Usajili wa Uanachama Sasa Wazi",
             "Wanachama wapya wanakaribishwa kujiunga na TSMA. Chagua "
             "daraja lako la uanachama na upate kadi yako ya kidijitali "
             "papo hapo baada ya malipo."),
            ("[DEMO] Maandalizi ya Conference ya Mwaka Yaanza",
             "Timu ya TSMA imeanza maandalizi ya mkutano mkuu wa mwaka — "
             "taarifa zaidi za usajili na ajenda zitatolewa hivi karibuni."),
        ]
        for title, content in posts:
            if News.objects.filter(title=title).exists():
                continue
            news = News(
                title=title, category=category, content=content,
                author=admin, is_published=True, published_at=timezone.now(),
            )
            news.save()
            self.stdout.write(f"  + News: {title}")

    def _seed_board(self, admin):
        # Article 106 (Board of Registered Trustees) - watu 3-7, hakuna
        # vyeo vya ndani (Chair/Vice) vilivyoainishwa kwenye Katiba - kila
        # mmoja ni "Registered Trustee" sawa.
        members = [
            ("Dkt. Amani Mwakalinga", "Registered Trustee", True),
            ("Bi. Fatuma Ramadhani", "Registered Trustee", True),
            ("Bw. Yohana Mushi", "Registered Trustee", False),
            ("Bi. Grace Kileo", "Registered Trustee", False),
        ]
        for i, (name, position, is_founder) in enumerate(members):
            if BoardMember.objects.filter(full_name=name).exists():
                continue
            member = BoardMember(
                full_name=name, position=position, is_founder=is_founder,
                bio=f"[DEMO] Wasifu wa mfano wa {name} — {position} wa TSMA.",
                display_order=i, created_by=admin,
            )
            member.photo.save(
                f"demo-board-{i}.jpg", _placeholder_image(name, size=(500, 500)), save=False
            )
            member.save()
            self.stdout.write(f"  + Board: {name}")

    def _seed_management(self, admin):
        # Nafasi kulingana na Article 20.2 (Executive Committee) ya Katiba
        # rasmi ya TSMA - si tena majina ya mfano ya jumla.
        team = [
            ("Bw. Elias Komba", "President"),
            ("Bi. Neema Shirima", "Vice President"),
            ("Bw. Peter Mwakasungura", "Secretary General"),
            ("Bi. Asha Ramadhani", "Deputy Secretary General"),
            ("Bw. Godfrey Mushi", "Treasurer"),
            ("Dkt. Amina Massawe", "Director of Professional Development"),
            ("Bw. Samuel Kimaro", "Director of Research and Publications"),
            ("Bi. Grace Lyimo", "Director of Membership and Regional Development"),
            ("Bw. Yusuf Haruna", "Director of Marketing, Partnerships and Resource Mobilization"),
            ("Bi. Consolata Ngowi", "Director of Events and Conferences"),
            ("Bw. Emmanuel Sawe", "Director of Education and Certification"),
            ("Bi. Fatuma Iddi", "Director of Ethics and Governance"),
        ]
        for i, (name, position) in enumerate(team):
            if ManagementMember.objects.filter(full_name=name, position=position).exists():
                continue
            member = ManagementMember(
                full_name=name, position=position,
                bio=f"[DEMO] Wasifu wa mfano wa {name} — {position} wa Management ya TSMA.",
                display_order=i, created_by=admin,
            )
            member.photo.save(
                f"demo-management-{i}.jpg", _placeholder_image(name, size=(500, 500)), save=False
            )
            member.save()
            self.stdout.write(f"  + Management: {name} ({position})")

    def _seed_gallery(self, admin):
        title = "[DEMO] Shughuli za TSMA"
        album, created = GalleryAlbum.objects.get_or_create(
            title=title, defaults={"event_year": timezone.now().year, "created_by": admin}
        )
        if not created:
            return
        album.cover_image.save(
            "demo-album-cover.jpg", _placeholder_image("Gallery", size=(900, 600)), save=True
        )
        for i in range(1, 4):
            img = GalleryImage(album=album, caption=f"[DEMO] Picha ya mfano {i}", display_order=i)
            img.image.save(
                f"demo-gallery-{i}.jpg", _placeholder_image(f"Picha {i}", size=(900, 600)), save=False
            )
            img.save()
        self.stdout.write(f"  + Gallery: {title} (picha 3)")

    def _seed_publications(self, admin):
        category, _ = PublicationCategory.objects.get_or_create(name="Uchumi wa Michezo")
        pubs = [
            ("[DEMO] Uchumi wa Michezo Tanzania 2026", PublicationAccessType.FREE, None),
            ("[DEMO] Mwongozo wa Uongozi wa Vilabu", PublicationAccessType.MEMBER_ONLY, None),
        ]
        for i, (title, access_type, price) in enumerate(pubs):
            if Publication.objects.filter(title=title).exists():
                continue
            pub = Publication(
                title=title, category=category,
                authors="Timu ya Utafiti ya TSMA (DEMO)",
                abstract=f"[DEMO] Muhtasari wa mfano kwa '{title}'.",
                publication_year=timezone.now().year,
                access_type=access_type, uploaded_by=admin,
            )
            pub.cover_image.save(
                f"demo-pub-cover-{i}.jpg", _placeholder_image(f"Pub {i+1}", size=(600, 800)), save=False
            )
            pub.file.save(f"demo-publication-{i}.pdf", _placeholder_pdf(title), save=False)
            pub.save()
            self.stdout.write(f"  + Publication: {title}")

    def _seed_conference(self, admin):
        title = "[DEMO] TSMA Annual Conference 2026"
        if Conference.objects.filter(title=title).exists():
            return
        start = timezone.now().date() + timedelta(days=45)
        conference = Conference(
            title=title,
            description="[DEMO] Mkutano mkuu wa mwaka wa TSMA - mfano wa demo.",
            theme="Kujenga Uchumi wa Michezo Tanzania",
            venue_name="Mlimani City Conference Centre", city="Dar es Salaam",
            start_date=start, end_date=start + timedelta(days=1),
            registration_deadline=timezone.now() + timedelta(days=30),
            is_published=True, registration_open=True, created_by=admin,
        )
        conference.banner_image.save(
            "demo-conference-banner.jpg", _placeholder_image("Conference", size=(1200, 500)), save=False
        )
        conference.save()

        ConferenceTicketType.objects.create(
            conference=conference, name="Mwanachama", price=50000, currency="TZS", display_order=1,
        )
        ConferenceTicketType.objects.create(
            conference=conference, name="Asiye Mwanachama", price=90000, currency="TZS", display_order=2,
        )
        self.stdout.write(f"  + Conference: {title} (tiketi 2)")
