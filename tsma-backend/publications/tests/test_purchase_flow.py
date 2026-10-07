from decimal import Decimal

from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from payments.models import PaymentPurpose, PaymentStatus, PaymentTransaction
from payments.services import dispatch_payment_succeeded
from publications.models import (
    Publication,
    PublicationAccessType,
    PublicationPurchase,
    PublicationPurchaseStatus,
)


@override_settings(SECURE_SSL_REDIRECT=False)
class PublicationPurchaseFlowTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            email="buyer@example.com",
            password="test-password",
            first_name="Test",
            last_name="Buyer",
        )
        self.publication = Publication.objects.create(
            title="Paid publication",
            authors="Test Author",
            abstract="Test abstract",
            publication_year=2026,
            access_type=PublicationAccessType.PAID,
            price=Decimal("1000.00"),
            file="",
        )
        self.purchase = PublicationPurchase.objects.create(
            publication=self.publication,
            buyer=self.user,
            amount_paid=Decimal("1000.00"),
            currency="TZS",
            commission_percent_snapshot=Decimal("20.00"),
            tsma_commission_amount=Decimal("0.00"),
            author_payout_amount=Decimal("0.00"),
        )
        self.transaction = PaymentTransaction.objects.create(
            user=self.user,
            purpose=PaymentPurpose.PUBLICATION_PURCHASE,
            content_type=ContentType.objects.get_for_model(PublicationPurchase),
            object_id=str(self.purchase.pk),
            gateway="manual",
            payment_method="bank_transfer",
            amount=Decimal("1000.00"),
            currency="TZS",
            internal_reference="TSMA-TEST-PURCHASE",
            status=PaymentStatus.PROCESSING,
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_detail_shows_manual_payment_as_pending(self):
        response = self.client.get(
            reverse("publications:detail", kwargs={"slug": self.publication.slug})
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data["pending_payment"],
            {
                "gateway": "manual",
                "status": PaymentStatus.PROCESSING,
                "internal_reference": self.transaction.internal_reference,
                "expires_at": None,
            },
        )
        self.assertFalse(response.data["has_purchased"])

    def test_pending_payment_cannot_be_started_again(self):
        response = self.client.post(
            reverse("publications:purchase", kwargs={"slug": self.publication.slug}),
            {"gateway": "manual", "payment_method": "bank_transfer"},
            format="json",
        )

        self.assertEqual(response.status_code, 409)
        self.assertEqual(
            response.data["payment"]["internal_reference"],
            self.transaction.internal_reference,
        )
        self.assertEqual(PaymentTransaction.objects.count(), 1)

    def test_completed_purchase_is_reported_as_owned(self):
        self.transaction.mark_success()
        errors = dispatch_payment_succeeded(self.transaction)
        self.purchase.refresh_from_db()

        self.assertEqual(errors, [])
        self.assertEqual(self.purchase.status, PublicationPurchaseStatus.COMPLETED)

        response = self.client.get(
            reverse("publications:detail", kwargs={"slug": self.publication.slug})
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["has_purchased"])
        self.assertIsNone(response.data["pending_payment"])
