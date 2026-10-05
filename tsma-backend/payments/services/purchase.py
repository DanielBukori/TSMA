from payments.models import PaymentPurpose
from payments.payment_services import initiate_payment

from publications.models import PublicationAccessType, PublicationPurchase


def initiate_publication_purchase(*, user, publication, phone_number="", gateway="manual", payment_method="mobile_money"):
    """
    Anzisha ununuzi wa chapisho la PAID. Inatengeneza PublicationPurchase
    (pending) + PaymentTransaction, kisha inaanzisha checkout na gateway.
    """
    if publication.access_type != PublicationAccessType.PAID:
        raise ValueError("Chapisho hili si la kununuliwa (PAID).")

    purchase = PublicationPurchase.objects.create(
        publication=publication,
        buyer=user,
        amount_paid=publication.price,
        currency=publication.currency,
        commission_percent_snapshot=publication.commission_percent,
        tsma_commission_amount=0,
        author_payout_amount=0,
    )

    txn, checkout_info = initiate_payment(
        user=user,
        purpose=PaymentPurpose.PUBLICATION_PURCHASE,
        amount=publication.price,
        currency=publication.currency,
        gateway_code=gateway,
        payment_method=payment_method,
        phone_number=phone_number,
        content_object=purchase,
        buyer_name=user.get_full_name(),
        buyer_email=user.email,
    )

    return purchase, txn, checkout_info
