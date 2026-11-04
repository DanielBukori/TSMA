from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import User
from accounts.serializers import CustomTokenObtainPairSerializer
from payments.gateways.registry import available_gateways_info, gateway_is_available
from payments.models import Gateway, ManualPaymentSettings, PaymentPurpose, PaymentStatus, PaymentTransaction

PASSWORD = "test-password-1"


def staff_client(user, authenticated=True):
    """API client carrying a token issued through the staff (second factor) login."""
    client = APIClient()
    if not authenticated:
        return client
    token = CustomTokenObtainPairSerializer.get_token(user)
    token["editor_mfa"] = True
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(token.access_token)}")
    return client


@override_settings(
    SECURE_SSL_REDIRECT=False,
    SECURITY_NOTIFICATION_CHANNELS=[],
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
)
class FinanceAccessTests(TestCase):
    """Who may see and move money: the accountant owns it, the editor does not."""

    def setUp(self):
        self.accountant = get_user_model().objects.create_user(
            email="treasurer@example.com",
            password=PASSWORD,
            first_name="Treasurer",
            last_name="Test",
            role=User.Role.ACCOUNTANT,
        )
        self.editor = get_user_model().objects.create_user(
            email="editor@example.com",
            password=PASSWORD,
            first_name="Editor",
            last_name="Test",
            role=User.Role.CONTENT_EDITOR,
        )
        self.board = get_user_model().objects.create_user(
            email="board@example.com",
            password=PASSWORD,
            first_name="Board",
            last_name="Test",
            role=User.Role.BOARD_ADMIN,
        )
        self.member = get_user_model().objects.create_user(
            email="member@example.com",
            password=PASSWORD,
            first_name="Member",
            last_name="Test",
            role=User.Role.MEMBER,
        )
        self.payer = self.member

    def make_manual_transaction(self, status=PaymentStatus.PENDING):
        return PaymentTransaction.objects.create(
            user=self.payer,
            purpose=PaymentPurpose.MEMBERSHIP,
            gateway=Gateway.MANUAL,
            amount=Decimal("50000.00"),
            internal_reference=PaymentTransaction.generate_internal_reference(),
            status=status,
        )

    def test_summary_is_closed_to_editor_and_member(self):
        for user in (self.editor, self.member, self.board):
            response = staff_client(user).get("/api/finance/summary/")
            self.assertEqual(response.status_code, 403, user.role)

    def test_accountant_sees_summary(self):
        transaction = self.make_manual_transaction()
        transaction.mark_success()
        response = staff_client(self.accountant).get("/api/finance/summary/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["collected_total"], "50000.00")
        self.assertEqual(response.data["awaiting_confirmation"]["count"], 0)
        # No bank account has been entered in this test, so manual checkout
        # stays closed until the Treasurer fills it in.
        self.assertFalse(response.data["manual_payments_ready"])

    def test_accountant_confirms_manual_payment(self):
        transaction = self.make_manual_transaction()
        response = staff_client(self.accountant).post(
            f"/api/finance/transactions/{transaction.internal_reference}/confirm/",
            {"gateway_reference": "BNM-1"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        transaction.refresh_from_db()
        self.assertEqual(transaction.status, PaymentStatus.SUCCESS)
        self.assertEqual(transaction.gateway_response["confirmed_by"], self.accountant.email)

    def test_editor_cannot_confirm_payment(self):
        transaction = self.make_manual_transaction()
        response = staff_client(self.editor).post(
            f"/api/finance/transactions/{transaction.internal_reference}/confirm/",
            {},
            format="json",
        )
        self.assertEqual(response.status_code, 403)
        transaction.refresh_from_db()
        self.assertEqual(transaction.status, PaymentStatus.PENDING)

    def test_rejection_needs_a_reason(self):
        transaction = self.make_manual_transaction()
        client = staff_client(self.accountant)
        self.assertEqual(
            client.post(
                f"/api/finance/transactions/{transaction.internal_reference}/reject/",
                {},
                format="json",
            ).status_code,
            400,
        )
        response = client.post(
            f"/api/finance/transactions/{transaction.internal_reference}/reject/",
            {"reason": "Hakuna fedha zilizofika benki."},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        transaction.refresh_from_db()
        self.assertEqual(transaction.status, PaymentStatus.FAILED)

    def test_manual_settings_are_editable_by_accountant(self):
        client = staff_client(self.accountant)
        response = client.patch(
            "/api/finance/manual-settings/",
            {
                "bank_name": "CRDB",
                "account_name": "TSMA",
                "account_number": "0150123456789",
                "confirm_phone": "0700000000",
                "confirm_deadline_hours": 24,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(ManualPaymentSettings.load().is_ready)

    def test_other_users_payment_status_is_not_public(self):
        transaction = self.make_manual_transaction()
        self.assertEqual(
            staff_client(self.editor).get(
                f"/api/payments/status/{transaction.internal_reference}/"
            ).status_code,
            404,
        )
        self.assertEqual(
            staff_client(self.accountant).get(
                f"/api/payments/status/{transaction.internal_reference}/"
            ).status_code,
            200,
        )


@override_settings(
    SECURE_SSL_REDIRECT=False,
    SECURITY_NOTIFICATION_CHANNELS=[],
    SELCOM_VENDOR_ID="",
    SELCOM_API_KEY="",
    SELCOM_API_SECRET="",
    PAYPAL_CLIENT_ID="CHANGE_ME",
)
class GatewayAvailabilityTests(TestCase):
    """Manual is always offered; the rest appear only once real keys exist."""

    def test_manual_available_without_any_keys(self):
        self.assertTrue(gateway_is_available(Gateway.MANUAL))
        codes = [item["code"] for item in available_gateways_info()]
        self.assertEqual(codes, ["manual"])

    def test_placeholder_credentials_do_not_open_a_gateway(self):
        self.assertFalse(gateway_is_available(Gateway.PAYPAL))

    @override_settings(SNIPPE_API_KEY="real-snippe-key", SNIPPE_WEBHOOK_SECRET="real-snippe-secret")
    def test_configured_gateway_appears(self):
        self.assertTrue(gateway_is_available(Gateway.SNIPPE))
        codes = [item["code"] for item in available_gateways_info()]
        self.assertEqual(codes, ["manual", "snippe"])

    def test_unregistered_gateway_is_rejected(self):
        self.assertFalse(gateway_is_available("m-pesa"))

    def test_membership_checkout_rejects_unavailable_gateway(self):
        from members.models import MembershipTier

        user = get_user_model().objects.create_user(
            email="payer@example.com", password=PASSWORD, first_name="Payer"
        )
        tier = MembershipTier.objects.create(
            name="Institution", slug="institution", annual_fee=Decimal("100000")
        )
        response = staff_client(user).post(
            "/api/members/join/",
            {"tier_id": tier.id, "gateway": "paypal"},
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("gateway", response.data)
