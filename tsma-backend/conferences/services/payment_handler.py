"""
Inashughulikia kuthibitisha (confirm) usajili wa mkutano baada ya malipo
kufanikiwa. Inaunganishwa kwenye payments.signals.payment_succeeded ndani
ya conferences/apps.py -> ready().
"""

from payments.models import PaymentPurpose


def handle_payment_succeeded(sender, transaction, **kwargs):
    if transaction.purpose != PaymentPurpose.CONFERENCE:
        return  # siyo malipo ya conference — puuza

    batch = transaction.content_object
    if batch is None:
        return

    batch.confirm()  # inathibitisha batch + inazalisha e-receipt kwa kila mshiriki
