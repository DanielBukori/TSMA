"""
Inashughulikia kuwezesha (activate) uanachama baada ya malipo kufanikiwa.
Inaunganishwa (connected) kwenye payments.signals.payment_succeeded ndani ya
members/apps.py -> ready(), ili payments app isijue chochote kuhusu members
app (kuepuka circular imports).
"""

from payments.models import PaymentPurpose

from ..models import MembershipStatus
from .card_generator import generate_membership_card


def handle_payment_succeeded(sender, transaction, **kwargs):
    if transaction.purpose != PaymentPurpose.MEMBERSHIP:
        return  # siyo malipo ya uanachama (mfano ni ya conference) — puuza

    member = transaction.content_object
    if member is None:
        return

    # IDEMPOTENT (salama kurudia): usiweke upya tarehe ya kuisha kwa mwanachama
    # aliyeshawezeshwa, na usitengeneze kadi upya kama ipo. Uanachama unawezeshwa
    # KWANZA (unahifadhiwa mara moja) - kadi ikishindwa, uanachama unabaki ACTIVE
    # na kosa linarekodiwa kwenye malipo ili lirudiwe baadaye.
    if member.status != MembershipStatus.ACTIVE:
        member.activate()
    if not member.digital_card_image:
        generate_membership_card(member)
