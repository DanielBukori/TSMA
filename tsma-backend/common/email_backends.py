"""
Email backend ya Brevo (HTTPS API) - inatumika pale SMTP imezuiwa.

Kwa nini: Render ya bure inazuia ports za SMTP (25, 465, 587), kwa hiyo
Django SMTP haiwezi kutuma barua pepe huko. API ya Brevo inatumia HTTPS
(port 443) ambayo haizuiwi. Plan ya bure ya Brevo: barua pepe 300 kwa siku.

Weka kwenye environment:
    EMAIL_PROVIDER=brevo
    BREVO_API_KEY=xkeysib-...
    DEFAULT_FROM_EMAIL=anwani-uliyoithibitisha-kwenye-Brevo@example.com
"""

from email.utils import parseaddr

import requests
from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend


class BrevoEmailBackend(BaseEmailBackend):
    API_URL = "https://api.brevo.com/v3/smtp/email"
    TIMEOUT_SECONDS = 15

    def send_messages(self, email_messages):
        if not email_messages:
            return 0

        api_key = getattr(settings, "BREVO_API_KEY", "")
        if not api_key:
            if self.fail_silently:
                return 0
            raise ValueError("BREVO_API_KEY haijawekwa kwenye environment.")

        sent = 0
        for message in email_messages:
            try:
                name, address = parseaddr(message.from_email or settings.DEFAULT_FROM_EMAIL)
                payload = {
                    "sender": {"email": address, "name": name or "TSMA"},
                    "to": [{"email": recipient} for recipient in message.to],
                    "subject": message.subject,
                    "textContent": message.body,
                }
                for content, mimetype in getattr(message, "alternatives", []):
                    if mimetype == "text/html":
                        payload["htmlContent"] = content
                response = requests.post(
                    self.API_URL,
                    json=payload,
                    headers={"api-key": api_key, "accept": "application/json"},
                    timeout=self.TIMEOUT_SECONDS,
                )
                response.raise_for_status()
                sent += 1
            except Exception:
                if not self.fail_silently:
                    raise
        return sent
