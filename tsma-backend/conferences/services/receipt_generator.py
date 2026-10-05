"""
E-Receipt Generator — inazalisha risiti ya kidijitali (PNG) kwa kila
mshiriki wa mkutano, ikiwa na QR code ya kipekee ya check-in.
"""

import io

import qrcode
from django.conf import settings
from django.core.files.base import ContentFile
from PIL import Image, ImageDraw, ImageFont

from common.branding import get_logo_image, paste_logo
from common.fonts import get_font

RECEIPT_WIDTH = 800
# 1000 ilikuwa fupi mno: QR (y=680..960) ilikatwa na footer (y=940) na maandishi
# ya chini yalifichwa. Hesabu: QR inaishia y=960, maandishi y~980-1000, footer y>=1030.
RECEIPT_HEIGHT = 1100

COLOR_HEADER = (10, 35, 66)
COLOR_ACCENT = (201, 162, 39)
COLOR_TEXT = (30, 30, 30)
COLOR_MUTED = (120, 120, 120)
COLOR_WHITE = (255, 255, 255)


# Font sasa inatoka common/fonts.py (font iko ndani ya repo, haitegemei Render)
_get_font = get_font


def generate_e_receipt(registration):
    """
    Tengeneza risiti ya `registration` (ConferenceRegistration instance)
    na uihifadhi kwenye registration.e_receipt_image.
    """
    conference = registration.batch.conference

    img = Image.new("RGB", (RECEIPT_WIDTH, RECEIPT_HEIGHT), COLOR_WHITE)
    draw = ImageDraw.Draw(img)

    # -- Header --
    draw.rectangle((0, 0, RECEIPT_WIDTH, 140), fill=COLOR_HEADER)
    logo_image = get_logo_image(prefer_dark=True)
    if logo_image:
        paste_logo(img, logo_image, x=40, y=25, max_height=50)
    else:
        draw.text((40, 30), "TSMA", font=_get_font(36, bold=True), fill=COLOR_WHITE)
    draw.text(
        (40, 90),
        "E-Receipt ya Usajili wa Mkutano",
        font=_get_font(18),
        fill=(220, 220, 220),
    )

    y = 175
    line_gap = 45

    def draw_row(label, value):
        nonlocal y
        draw.text((40, y), label, font=_get_font(14), fill=COLOR_MUTED)
        draw.text((40, y + 20), str(value), font=_get_font(20, bold=True), fill=COLOR_TEXT)
        y += line_gap + 20

    draw_row("Mkutano", conference.title)
    draw_row("Tarehe", f"{conference.start_date} - {conference.end_date}")
    draw_row("Eneo", f"{conference.venue_name}, {conference.city}")
    draw_row("Jina la Mshiriki", registration.full_name)
    draw_row("Aina ya Tiketi", registration.ticket_type.name)
    draw_row(
        "Ada Iliyolipwa",
        f"{registration.ticket_type.price} {registration.ticket_type.currency}",
    )
    draw_row("Namba ya Risiti", str(registration.verification_code)[:8].upper())

    # -- Golden divider --
    y += 10
    draw.rectangle((40, y, RECEIPT_WIDTH - 40, y + 3), fill=COLOR_ACCENT)
    y += 40

    # -- QR Code (kwa check-in kwenye mlango wa tukio) --
    verify_payload = str(registration.verification_code)
    qr = qrcode.QRCode(
        version=1, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=8, border=2
    )
    qr.add_data(verify_payload)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
    qr_img = qr_img.resize((280, 280))

    qr_x = (RECEIPT_WIDTH - 280) // 2
    img.paste(qr_img, (qr_x, y))
    y += 300

    caption = "Onyesha QR hii mlangoni kuthibitisha uingiaji"
    caption_font = _get_font(16)
    caption_w = draw.textbbox((0, 0), caption, font=caption_font)[2]
    draw.text(
        ((RECEIPT_WIDTH - caption_w) // 2, y),
        caption,
        font=caption_font,
        fill=COLOR_MUTED,
    )

    # -- Footer --
    footer_y = RECEIPT_HEIGHT - 60
    draw.rectangle((0, footer_y, RECEIPT_WIDTH, RECEIPT_HEIGHT), fill=COLOR_HEADER)
    draw.text(
        (40, footer_y + 18),
        "Tanzania Sports Management Association (TSMA)",
        font=_get_font(13),
        fill=COLOR_WHITE,
    )

    buffer = io.BytesIO()
    img.save(buffer, format="PNG", quality=95)
    buffer.seek(0)

    filename = f"receipt-{registration.verification_code}.png"
    content_file = ContentFile(buffer.read(), name=filename)
    registration.e_receipt_image.save(filename, content_file, save=True)
    return content_file
