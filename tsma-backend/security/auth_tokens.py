"""
Token za SecurityAdminUser — MAKUSUDI TOFAUTI na simplejwt inayotumika na
accounts.User. Hutumia key YAKE MWENYEWE (settings.SECURITY_ADMIN_SECRET_KEY
— SIYO SECRET_KEY ya kawaida) ili kompromisi ya token za mfumo mmoja
isiathiri mwingine (isolation kamili kati ya 'akaunti za kawaida' na
'dashibodi ya usalama').
"""

import hashlib
import secrets
from datetime import timedelta

import jwt
from django.conf import settings
from django.utils import timezone

from .models import SecurityAdminSession

TOKEN_LIFETIME_MINUTES = 20  # session fupi kimakusudi kwa dashibodi ya usalama
PRE_2FA_TOKEN_LIFETIME_MINUTES = 5  # muda wa kujaza TOTP code baada ya password


def _get_secret():
    # Fallback kwa SECRET_KEY kuu ENDAPO SECURITY_ADMIN_SECRET_KEY
    # haijawekwa — lakini kwa PRODUCTION halisi, weka key TOFAUTI kabisa
    # kwenye .env (angalia .env.example).
    return getattr(settings, "SECURITY_ADMIN_SECRET_KEY", None) or settings.SECRET_KEY


def issue_pre_2fa_token(operator):
    """
    Baada ya password kuthibitishwa lakini KABLA ya TOTP — token hii YA
    MUDA MFUPI SANA (dakika 5) HAIRUHUSU ufikiaji wa dashibodi, inaruhusu
    TU kuwasilisha TOTP code kwenye hatua ya pili.
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
