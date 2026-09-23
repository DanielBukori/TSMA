"""
Certificate Generator — inatoa cheti kiotomatiki mtumiaji anapofaulu quiz
(passed=True), ikiwa na namba ya uthibitisho na QR inayoweza kuhakikiwa
mtandaoni (kama roadmap ilivyoainisha).
"""

import io

import qrcode
from django.conf import settings
from django.core.files.base import ContentFile
from PIL import Image, ImageDraw, ImageFont

from common.branding import get_logo_image, paste_logo

CERT_WIDTH = 1200
CERT_HEIGHT = 850

COLOR_BORDER = (201, 162, 39)
COLOR_HEADER = (10, 35, 66)
COLOR_TEXT = (30, 30, 30)
COLOR_MUTED = (110, 110, 110)
COLOR_WHITE = (255, 255, 255)


def _get_font(size, bold=False):
    font_name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    try:
        return ImageFont.truetype(font_name, size)
    except OSError:
        return ImageFont.load_default()


def issue_certificate_if_needed(quiz_attempt):
    """
    Inaitwa moja kwa moja na QuizAttempt.grade() mara passed=True.
    Haitoi cheti mara ya pili kwa attempt ile ile (OneToOne inazuia).

    USALAMA/UADILIFU WA DATA: kuzuia race condition ya namba za vyeti
    (majaribio mawili yakikamilika kwa wakati mmoja yakijaribu kutumia
    namba ile ile), tunafunga (lock) rekodi za mwaka huu kwa
    select_for_update() ndani ya transaction moja ya atomic kabla ya
    kuhesabu namba inayofuata.
    """
    from django.db import transaction as db_transaction

    from ..models import Certificate

    if hasattr(quiz_attempt, "certificate"):
        return quiz_attempt.certificate

    quiz = quiz_attempt.quiz

    with db_transaction.atomic():
        # select_for_update inafunga rows zinazolingana na prefix ya mwaka
        # huu — request nyingine inayojaribu kuunda cheti la mwaka huo huo
        # kwa wakati mmoja itasubiri hadi transaction hii ikamilike, hivyo
        # haiwezi kuona/kutumia namba ile ile.
        from django.utils import timezone

        year = timezone.now().year
        prefix = f"TSMA-CERT-{year}-"
        list(
            Certificate.objects.select_for_update()
            .filter(certificate_number__startswith=prefix)
        )  # lock tu — hatuhitaji matokeo

        certificate = Certificate.objects.create(
            user=quiz_attempt.user,
            course=quiz.course,
            session=quiz.session,
            quiz_attempt=quiz_attempt,
        )

    generate_certificate_image(certificate)
    return certificate


def generate_certificate_image(certificate):
    img = Image.new("RGB", (CERT_WIDTH, CERT_HEIGHT), COLOR_WHITE)
    draw = ImageDraw.Draw(img)

    # -- Border --
    border_width = 12
    draw.rectangle(
        (0, 0, CERT_WIDTH - 1, CERT_HEIGHT - 1),
        outline=COLOR_BORDER,
        width=border_width,
    )
    inner_margin = 40
    draw.rectangle(
        (inner_margin, inner_margin, CERT_WIDTH - inner_margin, CERT_HEIGHT - inner_margin),
        outline=COLOR_HEADER,
        width=2,
    )

    # -- Header --
    logo_image = get_logo_image(prefer_dark=False)
    if logo_image:
        logo_h = 60
        logo_w = max(1, int(logo_image.width * (logo_h / logo_image.height)))
        paste_logo(img, logo_image, x=int((CERT_WIDTH - logo_w) / 2), y=60, max_height=logo_h)
    else:
        draw.text(
            (CERT_WIDTH / 2, 90),
            "TSMA",
            font=_get_font(42, bold=True),
            fill=COLOR_HEADER,
            anchor="mm",
        )
    draw.text(
        (CERT_WIDTH / 2, 135),
        "Tanzania Sports Management Association",
        font=_get_font(16),
        fill=COLOR_MUTED,
        anchor="mm",
    )

    draw.text(
        (CERT_WIDTH / 2, 210),
        "CHETI CHA KUKAMILISHA MAFUNZO",
        font=_get_font(24, bold=True),
        fill=COLOR_BORDER,
        anchor="mm",
    )
    draw.text(
        (CERT_WIDTH / 2, 245),
        "Certificate of Completion",
        font=_get_font(16),
        fill=COLOR_MUTED,
        anchor="mm",
    )

    # -- Recipient --
    draw.text(
        (CERT_WIDTH / 2, 340),
        "Hiki kinathibitisha kwamba",
        font=_get_font(16),
        fill=COLOR_MUTED,
        anchor="mm",
    )
    draw.text(
        (CERT_WIDTH / 2, 390),
        certificate.user.get_full_name().upper(),
        font=_get_font(38, bold=True),
        fill=COLOR_TEXT,
        anchor="mm",
    )
    draw.text(
        (CERT_WIDTH / 2, 440),
        "amekamilisha kwa mafanikio",
        font=_get_font(16),
        fill=COLOR_MUTED,
        anchor="mm",
    )
    draw.text(
        (CERT_WIDTH / 2, 480),
        certificate.title_earned,
        font=_get_font(26, bold=True),
        fill=COLOR_HEADER,
        anchor="mm",
    )

    # -- Details (namba ya cheti, tarehe) --
    draw.text(
        (150, 700),
        f"Namba ya Cheti: {certificate.certificate_number}",
        font=_get_font(14),
        fill=COLOR_MUTED,
    )
    draw.text(
        (150, 725),
        f"Tarehe: {certificate.issued_at.strftime('%d/%m/%Y')}",
        font=_get_font(14),
        fill=COLOR_MUTED,
    )

    # -- QR ya Uthibitisho --
    verify_url = f"{settings.FRONTEND_URL}/verify-certificate/{certificate.verification_code}"
    qr = qrcode.QRCode(
        version=1, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=5, border=1
    )
    qr.add_data(verify_url)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
    qr_img = qr_img.resize((130, 130))
    img.paste(qr_img, (CERT_WIDTH - 220, CERT_HEIGHT - 210))
    draw.text(
        (CERT_WIDTH - 220, CERT_HEIGHT - 70),
        "Scan kuthibitisha",
        font=_get_font(12),
        fill=COLOR_MUTED,
    )

    buffer = io.BytesIO()
    img.save(buffer, format="PNG", quality=95)
    buffer.seek(0)

    filename = f"{certificate.certificate_number}.png"
    content_file = ContentFile(buffer.read(), name=filename)
    certificate.certificate_image.save(filename, content_file, save=True)
    return content_file
