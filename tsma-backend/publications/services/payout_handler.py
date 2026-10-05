"""
Inashughulikia: (1) kuthibitisha ununuzi wa chapisho baada ya malipo
kufanikiwa, na (2) KUTUMA MOJA KWA MOJA sehemu ya mwandishi (payout) baada
ya kukata commission ya TSMA.

Imeunganishwa kwenye payments.signals.payment_succeeded ndani ya
publications/apps.py -> ready().

USALAMA (idempotency ya payout): tatizo lililopo kwenye toleo la awali —
process mbili (au webhook replay + retry) zikijaribu payout kwa wakati
mmoja zingeweza zote kuona payout_status=PENDING na zote kutuma fedha.
Sasa tunatumia `select_for_update()` ndani ya transaction moja ya atomic
kufunga rekodi KABLA ya kuangalia/kubadilisha payout_status, na
tunaweka status ya kati `PROCESSING` KABLA ya kuita gateway — hivyo
process ya pili (ikija hata milisekunde baadaye) itaona PROCESSING/PAID
na kuacha mara moja badala ya kutuma fedha tena.

Kwa sababu payout inaweza kushindwa kwa sababu za muda (network, gateway
down), tumeweka usanifu unaoruhusu RETRY salama: `retry_failed_payouts`
management command inaweza kuitwa mara kwa mara (cron, au Celery beat
ukiwa nayo) kujaribu tena payouts zenye status PENDING/FAILED — kwa
sababu ya lock+reference ya kipekee, retry haiwezi kusababisha malipo
mara mbili.
"""

import logging

from django.db import IntegrityError
from django.db import transaction as db_transaction
from django.utils import timezone

from payments.gateways.base import GatewayError
from payments.models import PaymentPurpose
from payments.payment_services import disburse_payout

from ..models import (
    PublicationCommissionSettings,
    PublicationPayoutStatus,
    PublicationPurchase,
    PublicationPurchaseStatus,
)

logger = logging.getLogger(__name__)


def handle_payment_succeeded(sender, transaction, **kwargs):
    if transaction.purpose != PaymentPurpose.PUBLICATION_PURCHASE:
        return

    purchase = transaction.content_object
    if purchase is None:
        return

    purchase.complete_and_calculate_payout()
    attempt_author_payout(purchase.pk)


def attempt_author_payout(purchase_id):
    """
    Jaribu kutuma payout ya mwandishi kwa `purchase_id`. Function hii ni
    SALAMA kuitwa mara nyingi (idempotent) — ikiitwa mara mbili kwa
    purchase ile ile (mfano signal + retry job kwa bahati mbaya), ni
    jaribio la PILI pekee litakalozuiwa na lock+status check.
    """
    with db_transaction.atomic():
        # select_for_update: funga rekodi hii MAHUSUSI kabla ya kuangalia/
        # kubadilisha payout_status — process nyingine yoyote inayojaribu
        # payout hii hii itasubiri hadi transaction hii ikamilike.
        purchase = PublicationPurchase.objects.select_for_update().get(pk=purchase_id)

        # IDEMPOTENCY GUARD: kama tayari imelipwa, au tayari inatumwa na
        # process nyingine (PROCESSING), au haihusiki, ACHA MARA MOJA.
        if purchase.payout_status in (
            PublicationPayoutStatus.PAID,
            PublicationPayoutStatus.PROCESSING,
            PublicationPayoutStatus.NOT_APPLICABLE,
        ):
            return purchase

        if purchase.status != PublicationPurchaseStatus.COMPLETED:
            return purchase

        publication = purchase.publication
        if not publication.author_payout_phone_number or purchase.author_payout_amount <= 0:
            purchase.payout_status = PublicationPayoutStatus.NOT_APPLICABLE
            purchase.save(update_fields=["payout_status"])
            return purchase

        # Weka PROCESSING KABLA ya kuita gateway (siyo baada) — hivyo hata
        # kama gateway inachukua muda, process nyingine inayoingia wakati
        # huo huo itaona PROCESSING na kuacha, siyo PENDING.
        reference = f"PAYOUT-{purchase.pk}"
        purchase.payout_status = PublicationPayoutStatus.PROCESSING
        purchase.payout_reference = reference
        purchase.payout_attempted_at = timezone.now()
        try:
            purchase.save(
                update_fields=["payout_status", "payout_reference", "payout_attempted_at"]
            )
        except IntegrityError:
            # payout_reference tayari ipo kwenye rekodi nyingine (haiwezekani
            # kwa uhalisia kwa sababu ya lock hapo juu, lakini ni ulinzi wa
            # ziada wa database-level) — usiendelee kutuma fedha.
            logger.error("Payout reference collision for purchase %s", purchase.pk)
            return purchase

    # --- Ombi kwa gateway LINAFANYIKA NJE ya lock (ili lisisibabishe
    #     database lock ndefu wakati wa network I/O), lakini purchase
    #     tayari iko PROCESSING hivyo hakuna process nyingine itakayojaribu
    #     hii hii wakati huu huu. ---
    payout_gateway = PublicationCommissionSettings.load().payout_gateway
    try:
        result = disburse_payout(
            gateway_code=payout_gateway,
            phone_number=publication.author_payout_phone_number,
            amount=purchase.author_payout_amount,
            currency=purchase.currency,
            reference=reference,
            narration=f"TSMA Publication Payout - {publication.title[:50]}",
        )
    except GatewayError as exc:
        # Rudisha kwenye PENDING (siyo FAILED ya kudumu) ili
        # `retry_failed_payouts` iweze kujaribu tena baadaye — hitilafu ya
        # gateway (timeout, down kwa muda) SIYO uthibitisho wa kushindwa
        # kwa kudumu.
        with db_transaction.atomic():
            purchase = PublicationPurchase.objects.select_for_update().get(pk=purchase_id)
            purchase.payout_status = PublicationPayoutStatus.PENDING
            purchase.payout_failure_reason = str(exc)
            purchase.save(update_fields=["payout_status", "payout_failure_reason"])

        logger.error("Publication payout failed for purchase %s: %s", purchase_id, exc)

        # Fedha za kwenda kwa mwandishi zikishindwa kutumwa ni tukio
        # muhimu la kiuendeshaji/kiusalama — Admin lazima ajue haraka
        # (siyo tu asubiri retry job).
        from security.models import SecurityEventType, SecuritySeverity
        from security.services import log_event

        log_event(
            event_type=SecurityEventType.PAYOUT_FAILED,
            severity=SecuritySeverity.HIGH,
            description=f"Payout ya purchase #{purchase_id} imeshindwa: {exc}",
            metadata={"purchase_id": purchase_id},
        )

        return purchase

    with db_transaction.atomic():
        purchase = PublicationPurchase.objects.select_for_update().get(pk=purchase_id)
        purchase.payout_status = PublicationPayoutStatus.PAID
        purchase.payout_reference = result.get("payout_reference", reference)
        purchase.save(update_fields=["payout_status", "payout_reference"])

    return purchase
