"""
2FA (TOTP) — Time-based One-Time Password, sawa na Google
Authenticator/Authy. Inahitaji `pyotp` (angalia requirements.txt).

2FA ni YA LAZIMA kwa SecurityAdminUser yote — hakuna njia ya kuipita.
"""

import pyotp
import qrcode
import qrcode.image.svg


def generate_totp_secret():
    return pyotp.random_base32()


def get_provisioning_uri(secret, email, issuer="TSMA Security"):
    """URI itakayosomwa na Google Authenticator/Authy kama QR code."""
    return pyotp.totp.TOTP(secret).provisioning_uri(name=email, issuer_name=issuer)


def generate_qr_code_svg(provisioning_uri):
    """Zalisha QR code kama SVG (text) — frontend inaweza kuionyesha moja kwa moja."""
    import io

    factory = qrcode.image.svg.SvgImage
    img = qrcode.make(provisioning_uri, image_factory=factory, box_size=8)
    buffer = io.BytesIO()
    img.save(buffer)
    return buffer.getvalue().decode("utf-8")


def verify_totp_code(secret, code):
    if not secret or not code:
        return False
    totp = pyotp.TOTP(secret)
    # valid_window=1: ruhusu kodi ya sekunde 30 zilizopita (clock drift ya
    # kawaida kati ya simu na server) bila kupunguza usalama kwa kiasi kikubwa.
    return totp.verify(code, valid_window=1)
