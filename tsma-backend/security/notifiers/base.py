"""
Notifier Adapter Pattern — sawa kabisa na muundo wa payments/gateways/base.py.
Hii ndiyo sehemu itakayowezesha kuongeza SMS/WhatsApp baadaye (au
kuhamisha app hii kwenda bidhaa tofauti) bila kubadili logic ya
kutambua matukio ya hatari.
"""

from abc import ABC, abstractmethod


class NotifierBase(ABC):
    channel_code = None

    @abstractmethod
    def send_alert(self, *, subject, message, severity, recipients):
        """Tuma arifa. Lazima isitupe exception kwa kushindwa kimya (log tu)."""
        raise NotImplementedError
