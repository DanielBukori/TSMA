"""
Tokens for SecurityAdminUser. Signed with their own key
(settings.SECURITY_ADMIN_SECRET_KEY), not the site SECRET_KEY, and not via
simplejwt used for accounts.User. A token stolen from the member-facing system
therefore cannot open the security dashboard, and vice versa.
"""

import hashlib
import secrets
from datetime import timedelta

import jwt
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.utils import timezone

from .models import SecurityAdminSession

TOKEN_LIFETIME_MINUTES = 20  # short on purpose for the security dashboard
PRE_2FA_TOKEN_LIFETIME_MINUTES = 5  # time allowed to enter the TOTP code after the password


def _get_secret():
    """
    Signing key for security dashboard tokens.

    This has to differ from the main SECRET_KEY - that difference is the
    compromise boundary between normal accounts and the dashboard. Falling
    back to SECRET_KEY would let a token stolen from one system work on the
    other, so outside local development (DEBUG) we refuse to run without it.
    """
    key = getattr(settings, "SECURITY_ADMIN_SECRET_KEY", "")
    if key:
        return key
    if settings.DEBUG:
        return settings.SECRET_KEY
    raise ImproperlyConfigured(
        "SECURITY_ADMIN_SECRET_KEY haijawekwa kwenye .env - dashibodi ya "
        "usalama imezuiwa. Weka funguo tofauti na DJANGO_SECRET_KEY "
        "(random, ndefu); angalia .env.example."
    )


def issue_pre_2fa_token(operator):
    """
    Issued after the password checks out and before the TOTP code. It grants
    nothing except submitting that code to the second step; it expires in five
    minutes.
    """
    payload = {
        "operator_id": str(operator.id),
        "stage": "pre_2fa",
        "exp": timezone.now() + timedelta(minutes=PRE_2FA_TOKEN_LIFETIME_MINUTES),
    }
    return jwt.encode(payload, _get_secret(), algorithm="HS256")


def verify_pre_2fa_token(token):
    try:
        payload = jwt.decode(token, _get_secret(), algorithms=["HS256"])
    except jwt.PyJWTError:
        return None
    if payload.get("stage") != "pre_2fa":
        return None
    return payload.get("operator_id")


def issue_full_session(operator, ip_address):
    """Baada ya TOTP kuthibitishwa — token kamili ya kufikia dashibodi."""
    raw_token = secrets.token_urlsafe(48)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()

    SecurityAdminSession.objects.create(
        operator=operator,
        token_hash=token_hash,
        ip_address=ip_address,
        expires_at=timezone.now() + timedelta(minutes=TOKEN_LIFETIME_MINUTES),
    )

    return raw_token


def verify_full_session(raw_token):
    """Rudisha SecurityAdminUser husika kama token ni sahihi na bado ipo hai, au None."""
    if not raw_token:
        return None
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    session = (
        SecurityAdminSession.objects.select_related("operator")
        .filter(token_hash=token_hash)
        .first()
    )
    if not session or not session.is_valid:
        return None
    if not session.operator.is_active:
        return None
    return session.operator


def revoke_session(raw_token):
    if not raw_token:
        return
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    SecurityAdminSession.objects.filter(token_hash=token_hash).update(revoked=True)
