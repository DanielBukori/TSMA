"""
Inashughulikia kuwezesha (activate) uanachama baada ya malipo kufanikiwa.
Inaunganishwa (connected) kwenye payments.signals.payment_succeeded ndani ya
members/apps.py -> ready(), ili payments app isijue chochote kuhusu members
app (kuepuka circular imports).
"""

from payments.models import PaymentPurpose

from .card_generator import generate_membership_card


def handle_payment_succeeded(sender, transaction, **kwargs):
    if transaction.purpose != PaymentPurpose.MEMBERSHIP:
        return  # siyo malipo ya uanachama (mfano ni ya conference) — puuza

    member = transaction.content_object
    if member is None:
        return

    member.activate()
    generate_membership_card(member)
