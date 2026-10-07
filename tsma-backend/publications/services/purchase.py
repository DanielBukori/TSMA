from django.contrib.contenttypes.models import ContentType

from payments.models import PaymentPurpose, PaymentStatus, PaymentTransaction
from payments.services import initiate_payment

from ..models import (
    Publication,
    PublicationAccessType,
    PublicationPurchase,
    PublicationPurchaseStatus,
)


def get_pending_publication_payment(*, user, publication):
    """Return the user's active payment for this publication, if any."""
    if not user or not user.is_authenticated:
        return None

    purchase_ids = [
        str(purchase_id)
        for purchase_id in publication.purchases.filter(
            buyer=user,
            status=PublicationPurchaseStatus.PENDING_PAYMENT,
        ).values_list("pk", flat=True)
    ]
    if not purchase_ids:
        return None

    return (
        PaymentTransaction.objects.filter(
            user=user,
            purpose=PaymentPurpose.PUBLICATION_PURCHASE,
            content_type=ContentType.objects.get_for_model(PublicationPurchase),
            object_id__in=purchase_ids,
            status__in=(
                PaymentStatus.PENDING,
                PaymentStatus.PROCESSING,
                PaymentStatus.SUCCESS,
            ),
        )
        .order_by("-created_at")
        .first()
    )


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
