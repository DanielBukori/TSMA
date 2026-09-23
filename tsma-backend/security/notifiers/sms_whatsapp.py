"""
SMS/WhatsApp Notifier — HIARI, imezimwa kwa default (default channel ni
'email' pekee, angalia security/services.py NOTIFICATION_CHANNELS).

Africa's Talking ndiyo maarufu zaidi Tanzania kwa SMS API. Kuwasha:
1. Sajili akaunti https://africastalking.com/ , pata API key.
2. `pip install africastalking`
3. Weka AFRICASTALKING_USERNAME/AFRICASTALKING_API_KEY kwenye .env
4. Ongeza "sms" kwenye settings.SECURITY_NOTIFICATION_CHANNELS

MUHIMU: sina uwezo wa kuthibitisha endpoint/response format real-time —
thibitisha dhidi ya nyaraka za sasa za Africa's Talking kabla ya kutumia
live.
"""

from django.conf import settings

from .base import NotifierBase


class AfricasTalkingSMSNotifier(NotifierBase):
    channel_code = "sms"

    def send_alert(self, *, subject, message, severity, recipients):
        api_key = getattr(settings, "AFRICASTALKING_API_KEY", "")
        username = getattr(settings, "AFRICASTALKING_USERNAME", "")
        if not api_key or not username:
            return  # haijawashwa — ruka kimya kimya (email bado inatumika)

        try:
            import africastalking

            africastalking.initialize(username, api_key)
            sms = africastalking.SMS
            sms.send(f"[TSMA {severity.upper()}] {subject}: {message[:120]}", recipients)
        except Exception:
            pass


class WhatsAppNotifier(NotifierBase):
    """
    Placeholder kwa WhatsApp Business API (mfano Meta Cloud API au
    Twilio WhatsApp). Sawa na Selcom/Zoom adapters — muundo upo tayari,
    unahitaji tu kujaza credentials na kutekeleza `send_alert` mara
    utakapochagua mtoa huduma.
    """

    channel_code = "whatsapp"

    def send_alert(self, *, subject, message, severity, recipients):
        # HAIJATEKELEZWA BADO — angalia docstring hapo juu.
        return
