"""
Card Generator — inazalisha Kadi ya Kidijitali ya Uanachama (PNG) inayofanana
na muundo wa kadi za benki za mtandaoni (mfano CRDB Simbanking virtual card):
mstatili wa rangi (gradient), logo halisi ya TSMA, jina la mmiliki, namba ya
uanachama na namba ya kadi ZIKIWA KATIKATI (kama kadi za benki), tarehe ya
kuisha muda, na QR code ya uthibitisho upande wa kulia.

Logo: inasomwa moja kwa moja kutoka SiteSettings (Admin anaipakia Django
Admin -> "Mipangilio ya Tovuti"). Kama bado haijapakiwa, kadi inabaki na
maandishi "TSMA" kama ilivyokuwa awali (haivunjiki).

Inahitaji: Pillow, qrcode
    pip install Pillow qrcode --break-system-packages
"""

import io

import qrcode
from django.conf import settings
from django.core.files.base import ContentFile
from PIL import Image, ImageDraw, ImageFont

from common.branding import get_logo_image, paste_logo
from common.fonts import get_font

CARD_WIDTH = 1013  # px (sawa na kadi halisi 3.375in @ 300dpi)
CARD_HEIGHT = 638  # px (sawa na kadi halisi 2.125in @ 300dpi)

# Rangi za taasisi
COLOR_PRIMARY_TOP = (10, 35, 66)      # bluu iliyokoza (TSMA navy)
COLOR_PRIMARY_BOTTOM = (21, 71, 52)   # kijani kikoza (sports green)
COLOR_GOLD = (201, 162, 39)           # gold accent
COLOR_WHITE = (255, 255, 255)


# Font sasa inatoka common/fonts.py (font iko ndani ya repo, haitegemei Render)
_get_font = get_font


def _vertical_gradient(width, height, top_color, bottom_color):
    base = Image.new("RGB", (width, height), top_color)
    top_r, top_g, top_b = top_color
    bot_r, bot_g, bot_b = bottom_color
    for y in range(height):
        ratio = y / height
        r = int(top_r + (bot_r - top_r) * ratio)
        g = int(top_g + (bot_g - top_g) * ratio)
        b = int(top_b + (bot_b - top_b) * ratio)
        ImageDraw.Draw(base).line([(0, y), (width, y)], fill=(r, g, b))
    return base


def _generate_qr(data, box_size=6):
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=box_size,
        border=1,
    )
    qr.add_data(data)
    qr.make(fit=True)
    return qr.make_image(fill_color="black", back_color="white").convert("RGB")


def _draw_centered_text(draw, y, text, font, fill):
    """Chora `text` ikiwa imekaa katikati ya upana wa kadi (x-axis)."""
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    x = (CARD_WIDTH - text_width) / 2
    draw.text((x, y), text, font=font, fill=fill)


def generate_membership_card(member):
    """
    Tengeneza kadi ya kidijitali kwa `member` (Member instance) na uihifadhi
    kwenye member.digital_card_image. Inarudisha django ContentFile.
    """
    card = _vertical_gradient(
        CARD_WIDTH, CARD_HEIGHT, COLOR_PRIMARY_TOP, COLOR_PRIMARY_BOTTOM
    )
    draw = ImageDraw.Draw(card)

    # -- Muundo wa mapambo (mfano wa michirizi ya "brand pattern") --
    for i in range(0, CARD_WIDTH, 90):
        draw.line([(i, 0), (i + 300, CARD_HEIGHT)], fill=(255, 255, 255, 10), width=1)

    # -- Logo halisi (Admin -> Mipangilio ya Tovuti) juu kushoto, au
    #    "TSMA" ya maandishi kama fallback kama logo bado haijapakiwa --
    logo_image = get_logo_image(prefer_dark=True)
    if logo_image:
        paste_logo(card, logo_image, x=50, y=35, max_height=60)
    else:
        draw.text((50, 45), "TSMA", font=_get_font(46, bold=True), fill=COLOR_WHITE)

    draw.text(
        (50, 105),
        "Tanzania Sports Management Association",
        font=_get_font(15),
        fill=(220, 220, 220),
    )

    # -- Golden strip (kama "chip" nafasi ya kadi za benki) --
    draw.rounded_rectangle((50, 140, 160, 190), radius=8, fill=COLOR_GOLD)

    # -- KATIKATI YA KADI: Namba ya Uanachama + Namba ya Kadi (kama kadi
    #    za benki - namba kubwa katikati) --
    center_y = CARD_HEIGHT // 2
    card_number = str(member.card_verification_code)[:8].upper()

    _draw_centered_text(
        draw, center_y - 55, "NAMBA YA UANACHAMA / MEMBERSHIP NO.",
        _get_font(13), (210, 210, 210),
    )
    _draw_centered_text(
        draw, center_y - 32, member.membership_number, _get_font(40, bold=True), COLOR_WHITE
    )
    _draw_centered_text(
        draw, center_y + 22, f"KADI NA. / CARD NO.  {card_number}",
        _get_font(16, bold=True), COLOR_GOLD,
    )

    # -- Jina la Mwanachama --
    draw.text(
        (50, 440),
        member.user.get_full_name().upper(),
        font=_get_font(26, bold=True),
        fill=COLOR_WHITE,
    )

    # -- Daraja la Uanachama --
    draw.text(
        (50, 480),
        member.tier.name.upper(),
        font=_get_font(18),
        fill=COLOR_GOLD,
    )

    # -- Tarehe (Member Since / Valid Thru) kama kadi za benki --
    joined = member.joined_date.strftime("%m/%y") if member.joined_date else "--/--"
    expiry = member.expiry_date.strftime("%m/%y") if member.expiry_date else "--/--"
    draw.text((50, 540), "MEMBER SINCE", font=_get_font(13), fill=(200, 200, 200))
    draw.text((50, 560), joined, font=_get_font(20, bold=True), fill=COLOR_WHITE)
    draw.text((220, 540), "VALID THRU", font=_get_font(13), fill=(200, 200, 200))
    draw.text((220, 560), expiry, font=_get_font(20, bold=True), fill=COLOR_WHITE)

    # -- QR Code ya uthibitisho, upande wa kulia --
    verify_url = f"{settings.FRONTEND_URL}/verify-member/{member.card_verification_code}"
    qr_img = _generate_qr(verify_url, box_size=5)
    qr_img = qr_img.resize((150, 150))
    qr_bg = Image.new("RGB", (170, 170), COLOR_WHITE)
    qr_bg.paste(qr_img, (10, 10))
    card.paste(qr_bg, (CARD_WIDTH - 220, CARD_HEIGHT - 220))

    draw.text(
        (CARD_WIDTH - 220, CARD_HEIGHT - 45),
        "Scan kuthibitisha",
        font=_get_font(14),
        fill=(220, 220, 220),
    )

    # -- Save kwenye buffer --
    buffer = io.BytesIO()
    card.save(buffer, format="PNG", quality=95)
    buffer.seek(0)

    filename = f"{member.membership_number}.png"
    content_file = ContentFile(buffer.read(), name=filename)

    member.digital_card_image.save(filename, content_file, save=True)
    return content_file
