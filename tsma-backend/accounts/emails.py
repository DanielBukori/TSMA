import logging

from django.conf import settings
from django.core.mail import send_mail

from .models import EmailOTP
from .otp import OTP_TTL_MINUTES

logger = logging.getLogger(__name__)


def send_otp_email(user, purpose, code):
    """
    Tuma OTP kwa barua pepe. Inarudisha True/False.

    HAIFICHI makosa tena (fail_silently=False): kosa lolote la SMTP/Brevo
    linaandikwa kwenye logs (Render -> Logs, au `journalctl -u tsma-gunicorn`)
    ili ujue SABABU kama barua pepe haikutumwa.
    """
    if purpose == EmailOTP.Purpose.VERIFY_EMAIL:
        subject = "TSMA - Namba ya uthibitisho wa barua pepe / Email verification code"
        reason_sw = "kuthibitisha barua pepe yako"
        reason_en = "verify your email"
    else:
        subject = "TSMA - Namba ya kubadili password / Password reset code"
        reason_sw = "kubadili password yako"
        reason_en = "reset your password"

    message = (
        f"Habari {user.first_name},\n\n"
        f"Namba yako ya {reason_sw} ni:\n\n"
        f"    {code}\n\n"
        f"Inaisha ndani ya dakika {OTP_TTL_MINUTES}. Usimpe mtu yeyote namba hii - "
        "TSMA hawatakuomba kamwe. Kama hukuomba, puuza barua pepe hii.\n\n"
        "----\n"
        f"Hello {user.first_name},\n\n"
        f"Your code to {reason_en} is: {code}\n"
        f"It expires in {OTP_TTL_MINUTES} minutes. Never share this code. "
        "If you did not request it, ignore this email.\n\n"
        "TSMA Team"
    )
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        return True
    except Exception:
        logger.exception("OTP email haikutumwa kwa %s (purpose=%s)", user.email, purpose)
        return False
