"""
Fonts za documents zinazozalishwa na mfumo (kadi ya uanachama, e-receipt ya
conference, certificate ya teaching).

Zamani generators zilitafuta "DejaVuSans.ttf" kwenye fonts za mfumo wa
uendeshaji. Render (Docker slim) mara nyingi HAINA font hiyo, na Pillow
ilirudi kwenye font ndogo ya default - maandishi ya kadi/risiti yalikuwa
madogo sana. Sasa tunatumia font iliyo ndani ya repo (common/fonts/)
kwanza; fonts za mfumo ni fallback tu.

DejaVu Sans ni free (leseni: common/fonts/LICENSE-DejaVu.txt).
"""

from pathlib import Path

from PIL import ImageFont

_FONT_DIR = Path(__file__).resolve().parent / "fonts"


def get_font(size, bold=False):
    name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    for candidate in (str(_FONT_DIR / name), name):
        try:
            return ImageFont.truetype(candidate, size)
        except OSError:
            continue
    try:
        return ImageFont.load_default(size=size)  # Pillow >= 10.1
    except TypeError:
        return ImageFont.load_default()
