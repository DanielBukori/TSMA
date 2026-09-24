from django.contrib.contenttypes.models import ContentType
from django.db import transaction as db_transaction

from .gateways.base import GatewayError
from .gateways.registry import get_gateway
from .models import PaymentStatus, PaymentTransaction
from .signals import payment_failed, payment_succeeded


def initiate_payment(
    *,
    user,
    purpose,
    amount,
    currency="TZS",
    gateway_code,
    payment_method="mobile_money",
    phone_number=None,
    content_object=None,
    buyer_name=None,
    buyer_email=None,
):
    """
    Sehemu KUU ya kuanzisha malipo yoyote kwenye mfumo (membership, conference, n.k).

    Inatengeneza PaymentTransaction (PENDING), kisha inaita gateway husika
    kuanzisha checkout/USSD push, na kusasisha transaction na taarifa
    zinazorudi kutoka gateway.

    Inarudisha tuple: (transaction, checkout_info_dict)
    """
    txn = PaymentTransaction.objects.create(
        user=user,
        purpose=purpose,
        gateway=gateway_code,
        payment_method=payment_method,
        amount=amount,
        currency=currency,
        phone_number=phone_number,
        internal_reference=PaymentTransaction.generate_internal_reference(),
        content_type=(
            ContentType.objects.get_for_model(content_object) if content_object else None
        ),
        object_id=str(content_object.pk) if content_object else None,
    )

    gateway = get_gateway(gateway_code)

    try:
        checkout_info = gateway.create_checkout(
            txn,
            phone_number=phone_number,
            buyer_name=buyer_name,
            buyer_email=buyer_email,
        )
    except GatewayError as exc:
        txn.mark_failed(reason=str(exc), raw_response=exc.raw_response)
        payment_failed.send(sender=PaymentTransaction, transaction=txn)
        raise

    txn.gateway_order_id = checkout_info.get("gateway_order_id")
    txn.gateway_response = checkout_info.get("raw_response")
    txn.status = PaymentStatus.PROCESSING
    update_fields = ["gateway_order_id", "gateway_response", "status", "updated_at"]

    # `expires_at` — kwa sasa gateway 'manual' pekee inairudisha (deadline
    # ya kuthibitisha malipo). Gateway zingine haziitumii, inabaki null.
    if checkout_info.get("expires_at"):
        txn.expires_at = checkout_info["expires_at"]
        update_fields.append("expires_at")

    txn.save(update_fields=update_fields)

    return txn, checkout_info


def verify_and_sync(transaction):
    """
    Uliza gateway hali halisi ya malipo (query/poll), na sasisha transaction.
    Inatumika kama fallback endapo webhook haikufika (mfano network issue).
    """
    if transaction.status == PaymentStatus.SUCCESS:
        return transaction

    gateway = get_gateway(transaction.gateway)

    try:
        result_status, raw_response = gateway.verify_payment(transaction)
    except GatewayError as exc:
        # MUHIMU: hitilafu ya mawasiliano na gateway (network timeout, API
        # down kwa muda, n.k.) SIYO uthibitisho kwamba malipo yameshindwa
        # — inaweza kuwa gateway bado ilipokea/inachakata malipo upande
        # wake. Kubadilisha moja kwa moja kuwa FAILED kunaweza kumnyima
        # mtumiaji ufikiaji aliyeshalipia. Tunabaki PROCESSING na
        # kuruhusu jaribio lijalo la polling/webhook lithibitishe hali
        # halisi badala ya kukisia.
        return transaction

    if result_status == "success":
        with db_transaction.atomic():
            transaction.mark_success(raw_response=raw_response)
        payment_succeeded.send(sender=PaymentTransaction, transaction=transaction)
    elif result_status == "failed":
        transaction.mark_failed(reason="Gateway imeripoti malipo kushindwa.", raw_response=raw_response)
        payment_failed.send(sender=PaymentTransaction, transaction=transaction)
    # "pending" -> hatubadilishi chochote, bado inasubiriwa

    return transaction


def disburse_payout(*, gateway_code, phone_number, amount, currency="TZS", reference, narration=""):
    """
    Sehemu KUU ya kutuma fedha KUTOKA TSMA KWENDA kwa mtu (mfano: kulipa
    mwandishi sehemu yake ya mauzo ya chapisho). Inatumika na apps
    nyingine (mfano `publications`) bila kujua maelezo ya gateway.
    """
    gateway = get_gateway(gateway_code)
    return gateway.disburse_payout(
        phone_number=phone_number,
        amount=amount,
        currency=currency,
        reference=reference,
        narration=narration,
    )


def process_webhook(gateway_code, request):
    """
    Pokea na chakata webhook kutoka gateway yoyote iliyosajiliwa.

    USALAMA (zero-trust): hatuamini "payment_status == COMPLETED" peke
    yake kutoka kwa mwili wa ombi. `gateway.parse_webhook()` LAZIMA
    ithibitishe signature kikamilifu (fail-closed — angalia
    payments/gateways/selcom.py) kabla ya kurudisha result yoyote. Hapa
    tunaongeza pia ulinzi wa PILI: idempotency — webhook ile ile
    (au ya order ile ile) ikirudiwa (replay), hatuchakati mara ya pili.

    Inarudisha PaymentTransaction iliyosasishwa, au inatupa GatewayError.
    """
    gateway = get_gateway(gateway_code)
    result = gateway.parse_webhook(request)

    if not result.get("internal_reference"):
        raise GatewayError("Webhook haina internal_reference sahihi.")

    with db_transaction.atomic():
        try:
            txn = PaymentTransaction.objects.select_for_update().get(
                internal_reference=result["internal_reference"]
            )
        except PaymentTransaction.DoesNotExist:
            raise GatewayError(
                f"Transaction yenye reference '{result['internal_reference']}' haipo."
            )

        # --- IDEMPOTENCY: kama tayari imeshakamilika/kushindwa, usichakate tena ---
        # Hii inazuia webhook replay (au retries za gateway) kusababisha
        # payout/membership-activation zaidi ya mara moja.
        if txn.status in (PaymentStatus.SUCCESS, PaymentStatus.FAILED):
            return txn

        # --- Linganisha maelezo ya webhook na transaction yetu (zero-trust) ---
        # Hatutegemei signature pekee — tunahakikisha order_id/amount/
        # currency zinazorudi kwenye webhook (kama zipo) zinalingana na
        # transaction yetu ya ndani. MUHIMU: amount/currency ikiwepo LAKINI
        # haiwezi kusomwa/kulinganishwa (invalid data), hii ni REJECT —
        # siyo "ruka ukaguzi na uendelee" (zero-trust: invalid -> REJECT,
        # siyo invalid -> PASS).
        raw = result.get("raw_response") or {}

        webhook_order_id = raw.get("order_id")
        if webhook_order_id is not None and str(webhook_order_id) != txn.internal_reference:
            raise GatewayError(
                f"order_id ya webhook ({webhook_order_id}) hailingani na "
                f"transaction ({txn.internal_reference}) — imekataliwa kwa usalama."
            )

        webhook_amount = raw.get("amount")
        if webhook_amount is not None:
            try:
                amount_matches = abs(float(webhook_amount) - float(txn.amount)) <= 0.01
            except (TypeError, ValueError):
                raise GatewayError(
                    f"Kiasi cha webhook ({webhook_amount!r}) si namba sahihi — "
                    f"imekataliwa kwa usalama (zero-trust)."
                )
            if not amount_matches:
                raise GatewayError(
                    f"Kiasi cha webhook ({webhook_amount}) hakilingani na "
                    f"transaction ({txn.amount}) — imekataliwa kwa usalama."
                )

        webhook_currency = raw.get("currency")
        if webhook_currency is not None and str(webhook_currency).upper() != txn.currency.upper():
            raise GatewayError(
                f"Currency ya webhook ({webhook_currency}) hailingani na "
                f"transaction ({txn.currency}) — imekataliwa kwa usalama."
            )

        if result["status"] == "success":
            txn.mark_success(
                gateway_transaction_id=result.get("gateway_transaction_id"),
                raw_response=result.get("raw_response"),
            )
        else:
            txn.mark_failed(
                reason="Gateway webhook imeripoti malipo kushindwa.",
                raw_response=result.get("raw_response"),
            )

    # Signals zinatumwa NJE ya transaction.atomic() ya juu ili receivers
    # (membership activation, payouts, n.k.) zisizuiliwe na row lock, lakini
    # BAADA ya commit ili zisiendeshe endapo save itashindwa.
    if txn.status == PaymentStatus.SUCCESS:
        payment_succeeded.send(sender=PaymentTransaction, transaction=txn)
    elif txn.status == PaymentStatus.FAILED:
        payment_failed.send(sender=PaymentTransaction, transaction=txn)

    return txn
