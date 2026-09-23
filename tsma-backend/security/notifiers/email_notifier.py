from django.conf import settings
from django.core.mail import send_mail

from .base import NotifierBase


class EmailNotifier(NotifierBase):
    channel_code = "email"

    def send_alert(self, *, subject, message, severity, recipients):
        if not recipients:
            return
        try:
            send_mail(
                subject=f"[TSMA SECURITY - {severity.upper()}] {subject}",
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=recipients,
                fail_silently=True,
            )
        except Exception:
            # Arifa isiwahi kuvunja mtiririko mkuu wa app — kushindwa
            # kutuma email hakupaswi kuzuia hatua za self-healing.
            pass
