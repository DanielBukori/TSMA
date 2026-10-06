"""
OTP ya barua pepe (tarakimu 6) - kuthibitisha email na kubadili password.

Ulinzi uliowekwa:
- Namba inatengenezwa kwa `secrets` (si `random`).
- Hatuhifadhi namba yenyewe: tunahifadhi HMAC-SHA256 (salted_hmac, SECRET_KEY).
- Inaisha baada ya OTP_TTL_MINUTES (10).
- Majaribio ya kukisia: OTP_MAX_ATTEMPTS (5) kisha namba inafutwa.
- Kuomba namba mpya: angalau sekunde 60 kati ya maombi, na isizidi
  OTP_MAX_PER_HOUR (5) kwa saa kwa mtumiaji/kusudi.
- Namba mpya inabatilisha zote za awali zisizotumika.
"""

import secrets
from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from django.utils.crypto import constant_time_compare, salted_hmac

from .models import EmailOTP

OTP_LENGTH = 6
OTP_TTL_MINUTES = 10
OTP_MAX_ATTEMPTS = 5
OTP_RESEND_COOLDOWN_SECONDS = 60
OTP_MAX_PER_HOUR = 5


class OTPThrottled(Exception):
    """Mtumiaji ameomba namba mara nyingi mno / mapema mno."""

    def __init__(self, wait_seconds):
        self.wait_seconds = int(wait_seconds)
        super().__init__(f"Subiri sekunde {self.wait_seconds} kabla ya kuomba namba mpya.")


def _hash(user, purpose, code):
    return salted_hmac("tsma.accounts.otp", f"{user.pk}:{purpose}:{code}", algorithm="sha256").hexdigest()


def issue_otp(user, purpose):
    """Tengeneza OTP mpya na urudishe namba (string ya tarakimu 6). Inaweza kutupa OTPThrottled."""
    now = timezone.now()
    with transaction.atomic():
        recent = EmailOTP.objects.filter(user=user, purpose=purpose).order_by("-created_at")

        last = recent.first()
        if last:
            elapsed = (now - last.created_at).total_seconds()
            if elapsed < OTP_RESEND_COOLDOWN_SECONDS:
                raise OTPThrottled(OTP_RESEND_COOLDOWN_SECONDS - elapsed)

        sent_last_hour = recent.filter(created_at__gte=now - timedelta(hours=1)).count()
        if sent_last_hour >= OTP_MAX_PER_HOUR:
            raise OTPThrottled(3600)

        # Batilisha zote za awali ambazo bado hazijatumika
        recent.filter(used=False).update(used=True)

        code = f"{secrets.randbelow(10 ** OTP_LENGTH):0{OTP_LENGTH}d}"
        EmailOTP.objects.create(
            user=user,
            purpose=purpose,
            code_hash=_hash(user, purpose, code),
            expires_at=now + timedelta(minutes=OTP_TTL_MINUTES),
        )
    return code


def verify_otp(user, purpose, code):
    """True tu kama namba ni sahihi, haijaisha muda, na haijazidi majaribio. Inatumika mara moja."""
    code = (code or "").strip()
    with transaction.atomic():
        otp = (
            EmailOTP.objects.select_for_update()
            .filter(user=user, purpose=purpose, used=False)
            .order_by("-created_at")
            .first()
        )
        if otp is None:
            return False

        if otp.is_expired() or otp.attempts >= OTP_MAX_ATTEMPTS:
            otp.used = True
            otp.save(update_fields=["used"])
            return False

        otp.attempts += 1
        if constant_time_compare(otp.code_hash, _hash(user, purpose, code)):
            otp.used = True
            otp.save(update_fields=["attempts", "used"])
            return True

        if otp.attempts >= OTP_MAX_ATTEMPTS:
            otp.used = True
        otp.save(update_fields=["attempts", "used"])
        return False
