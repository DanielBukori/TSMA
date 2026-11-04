import base64
import hashlib
import hmac
import json
import time
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from payments.models import Gateway, PaymentPurpose, PaymentStatus, PaymentTransaction
from security.models import SecurityEvent, SecurityEventType

SELCOM_SECRET = "test-selcom-webhook-secret"
SNIPPE_SECRET = "test-snippe-webhook-secret"
SELCON_SIGNED_FIELDS = ["order_id", "amount", "currency", "transid", "payment_status"]


def selcom_digest(payload, signed_fields, secret=SELCOM_SECRET):
    raw = "&".join(f"{field}={payload.get(field, '')}" for field in signed_fields)
    signature = hmac.new(secret.encode("utf-8"), raw.encode("utf-8"), hashlib.sha256).digest()
    return base64.b64encode(signature).decode("utf-8")


@override_settings(
    SECURE_SSL_REDIRECT=False,
    SELCOM_API_SECRET=SELCOM_SECRET,
    SNIPPE_WEBHOOK_SECRET=SNIPPE_SECRET,
    # Arifa za HIGH severity hazitumiki katika majaribio (hakuna SMTP/mtandao).
    SECURITY_NOTIFICATION_CHANNELS=[],
)
class GatewayWebhookTests(TestCase):
    """
    Webhooks zilihishinda kimya: zilikuwa `return Response({"status": "ok"})`
    pekee — gateway zilisaini, lakini hakuna aliyechakata saini hiyo.
    Majaribio haya yanashikilia sasa: utambulisho, uthibitisho wa kiasi,
    idempotency na usalama wa endpoint ya hali ya muamala.
    """

    def setUp(self):
        self.payer = get_user_model().objects.create_user(
            email="payer@example.com", password="test-password", first_name="Payer"
        )
        self.intruder = get_user_model().objects.create_user(
            email="intruder@example.com", password="test-password", first_name="Intruder"
        )
        self.transaction = PaymentTransaction.objects.create(
            user=self.payer,
            purpose=PaymentPurpose.MEMBERSHIP,
            gateway=Gateway.SELCOM,
            amount=Decimal("50000.00"),
            currency="TZS",
            internal_reference="TSMA-WEBHOOKTEST1",
            status=PaymentStatus.PROCESSING,
        )
        self.api = APIClient()

    def post_selcom(self, payload, digest=None, signed_fields=SELCON_SIGNED_FIELDS):
        body = json.dumps(payload).encode("utf-8")
        if digest is None:
            digest = selcom_digest(payload, signed_fields)
        return self.api.post(
            reverse("payments:webhook_selcom"),
            data=body,
            content_type="application/json",
            HTTP_DIGEST=digest,
            HTTP_SIGNED_FIELDS=",".join(signed_fields),
        )

    # ------------------------------------------------------------------ identity

    def test_unsigned_webhook_is_rejected_and_recorded(self):
        payload = {
            "order_id": self.transaction.internal_reference,
            "amount": "50000.00",
            "currency": "TZS",
            "transid": "SEL-1",
            "payment_status": "COMPLETED",
        }

        response = self.api.post(
            reverse("payments:webhook_selcom"),
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.transaction.refresh_from_db()
        self.assertEqual(response.status_code, 400)
        self.assertEqual(self.transaction.status, PaymentStatus.PROCESSING)
        self.assertTrue(
            SecurityEvent.objects.filter(
                event_type=SecurityEventType.WEBHOOK_SIGNATURE_INVALID
            ).exists()
        )

    def test_tampered_digest_is_rejected(self):
        payload = {
            "order_id": self.transaction.internal_reference,
            "amount": "50000.00",
            "currency": "TZS",
            "transid": "SEL-1",
            "payment_status": "COMPLETED",
        }
        # Nipe sha memedharisi baada ya kusaini — saini haipaswi kupita.
        payload["amount"] = "1.00"

        response = self.post_selcom(payload, digest=selcom_digest(payload, SELCON_SIGNED_FIELDS, secret="wrong-secret"))

        self.transaction.refresh_from_db()
        self.assertEqual(response.status_code, 400)
        self.assertEqual(self.transaction.status, PaymentStatus.PROCESSING)

    def test_signed_fields_must_cover_order_id_and_amount(self):
        payload = {
            "order_id": self.transaction.internal_reference,
            "amount": "50000.00",
            "currency": "TZS",
            "transid": "SEL-1",
            "payment_status": "COMPLETED",
        }

        response = self.post_selcom(payload, signed_fields=["transid"])

        self.transaction.refresh_from_db()
        self.assertEqual(response.status_code, 400)
        self.assertEqual(self.transaction.status, PaymentStatus.PROCESSING)

    # ------------------------------------------------------------------- success

    def test_valid_webhook_confirms_payment(self):
        payload = {
            "order_id": self.transaction.internal_reference,
            "amount": "50000.00",
            "currency": "TZS",
            "transid": "SEL-998877",
            "payment_status": "COMPLETED",
        }

        response = self.post_selcom(payload)

        self.transaction.refresh_from_db()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["payment_status"], PaymentStatus.SUCCESS)
        self.assertEqual(self.transaction.status, PaymentStatus.SUCCESS)
        self.assertEqual(self.transaction.gateway_transaction_id, "SEL-998877")
        self.assertIsNotNone(self.transaction.paid_at)

    def test_replayed_webhook_cannot_undo_a_confirmed_payment(self):
        payload = {
            "order_id": self.transaction.internal_reference,
            "amount": "50000.00",
            "currency": "TZS",
            "transid": "SEL-998877",
            "payment_status": "COMPLETED",
        }
        self.post_selcom(payload)

        replay = dict(payload, payment_status="FAILED")
        response = self.post_selcom(replay)

        self.transaction.refresh_from_db()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.transaction.status, PaymentStatus.SUCCESS)

    def test_amount_mismatch_is_rejected_even_with_valid_signature(self):
        payload = {
            "order_id": self.transaction.internal_reference,
            "amount": "1.00",
            "currency": "TZS",
            "transid": "SEL-1",
            "payment_status": "COMPLETED",
        }

        response = self.post_selcom(payload)

        self.transaction.refresh_from_db()
        self.assertEqual(response.status_code, 400)
        self.assertEqual(self.transaction.status, PaymentStatus.PROCESSING)

    def test_webhook_for_unknown_reference_is_rejected(self):
        payload = {
            "order_id": "TSMA-NOTAREALREF",
            "amount": "50000.00",
            "currency": "TZS",
            "transid": "SEL-1",
            "payment_status": "COMPLETED",
        }

        response = self.post_selcom(payload)

        self.assertEqual(response.status_code, 400)

    # ---------------------------------------------------------------- non-payment

    def test_non_payment_event_is_acked_without_security_alert(self):
        timestamp = str(int(time.time()))
        body = json.dumps({"type": "payout.completed", "data": {"reference": "P-1"}}).encode("utf-8")
        signature = hmac.new(
            SNIPPE_SECRET.encode("utf-8"),
            f"{timestamp}.".encode("utf-8") + body,
            hashlib.sha256,
        ).hexdigest()

        response = self.api.post(
            reverse("payments:webhook_snippe"),
            data=body,
            content_type="application/json",
            HTTP_X_WEBHOOK_TIMESTAMP=timestamp,
            HTTP_X_WEBHOOK_SIGNATURE=signature,
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "ignored")
        self.assertFalse(
            SecurityEvent.objects.filter(
                event_type=SecurityEventType.WEBHOOK_SIGNATURE_INVALID
            ).exists()
        )

    # ------------------------------------------------------- transaction status API

    def test_status_endpoint_requires_authentication(self):
        response = self.api.get(
            reverse("payments:transaction_status", kwargs={"internal_reference": self.transaction.internal_reference})
        )

        self.assertEqual(response.status_code, 401)

    def test_status_endpoint_hides_other_peoples_transactions(self):
        self.api.force_authenticate(self.intruder)

        response = self.api.get(
            reverse("payments:transaction_status", kwargs={"internal_reference": self.transaction.internal_reference})
        )

        self.assertEqual(response.status_code, 404)

    def test_owner_can_read_own_transaction_status(self):
        self.api.force_authenticate(self.payer)

        response = self.api.get(
            reverse("payments:transaction_status", kwargs={"internal_reference": self.transaction.internal_reference})
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], PaymentStatus.PROCESSING)
        self.assertEqual(response.data["amount"], "50000.00")
