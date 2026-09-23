"""
Branding helper — inatumika na documents zote zinazozalishwa na mfumo
(kadi ya uanachama, e-receipt ya conference, certificate ya teaching)
kusoma LOGO MOJA HALISI aliyopakia Admin (SiteSettings), badala ya kila
generator kuwa na "TSMA" ya maandishi tofauti tofauti.

Ukibadilisha logo kwenye Django Admin -> "Mipangilio ya Tovuti", nyaraka
ZOTE mpya zitakazozalishwa (kadi mpya, risiti mpya, vyeti vipya) zitatumia
logo hiyo mpya moja kwa moja — hakuna code inayohitaji kubadilika.
"""

from PIL import Image


def get_logo_image(prefer_dark=True):
    """
    Inarudisha PIL.Image (RGBA) ya logo ya TSMA kutoka SiteSettings, au
    None kama Admin hajapakia logo bado (generator inayoita hii LAZIMA
    iwe na fallback ya maandishi "TSMA" kama hapo awali).

    `prefer_dark=True` -> jaribu `logo_on_dark` kwanza (kwa background ya
    navy/giza, kama kadi/header za documents hizi), ukirudi kwenye
    `logo_image` kama haipo. `prefer_dark=False` -> kinyume chake (kwa
    documents zenye background nyeupe, kama certificate).
    """
    try:
        from sitecontent.models import SiteSettings

        settings_obj = SiteSettings.load()
    except Exception:
        return None

    primary = settings_obj.logo_on_dark if prefer_dark else settings_obj.logo_image
    fallback = settings_obj.logo_image if prefer_dark else settings_obj.logo_on_dark
    field = primary or fallback
    if not field:
        return None

    try:
        field.open()
        image = Image.open(field).convert("RGBA")
        image.load()  # soma pixels zote kabla ya kufunga faili
        field.close()
        return image
    except Exception:
        # Faili imeharibika/haipatikani - documents ziendelee na fallback
        # ya maandishi badala ya ku-crash zima zima.
        return None


def paste_logo(canvas, logo_image, x, y, max_height):
    """
    Bandika `logo_image` kwenye `canvas` (PIL.Image) ikiwa na urefu wa
    `max_height` (upana unahesabiwa moja kwa moja kutunza proportions),
    ikianzia (x, y) juu-kushoto. Inarudisha upana halisi uliotumika
    (kwa layout ya vitu vinavyofuata karibu na logo).
    """
    ratio = max_height / logo_image.height
    new_width = max(1, int(logo_image.width * ratio))
    resized = logo_image.resize((new_width, max_height))
    canvas.paste(resized, (x, y), resized)  # alpha channel kama mask
    return new_width
