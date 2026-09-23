"""
Tengeneza SecurityAdminUser wa kwanza. HAKUNA fomu ya usajili ya umma
kwa akaunti hizi kwa makusudi (self-registration ingekuwa security hole
kubwa kwa dashibodi ya usalama yenyewe) — operator mpya anaongezwa TU na
mtu mwenye ufikiaji wa server (amana hii command) au kupitia Django Admin.

Matumizi:
    python manage.py create_security_operator \\
        --email security@tsma.or.tz --name "Jina Lako" --superuser
"""

import getpass

from django.core.management.base import BaseCommand, CommandError

from security.models import SecurityAdminUser


class Command(BaseCommand):
    help = "Tengeneza akaunti mpya ya Security Operator (dashibodi ya usalama)."

    def add_arguments(self, parser):
        parser.add_argument("--email", required=True)
        parser.add_argument("--name", required=True)
        parser.add_argument(
            "--superuser", action="store_true",
            help="Mpe ruhusa ya kuidhinisha PendingApprovalAction (permanent blocks, n.k.)",
        )

    def handle(self, *args, **options):
        email = options["email"].lower().strip()

        if SecurityAdminUser.objects.filter(email__iexact=email).exists():
            raise CommandError(f"Operator mwenye email '{email}' tayari yupo.")

        password = getpass.getpass("Weka password (haitaonekana): ")
        password_confirm = getpass.getpass("Rudia password: ")

        if password != password_confirm:
            raise CommandError("Password hazifanani.")
        if len(password) < 12:
            raise CommandError("Password ya security operator lazima iwe angalau herufi 12.")

        operator = SecurityAdminUser(email=email, full_name=options["name"], is_superuser_operator=options["superuser"])
        operator.set_password(password)
        operator.save()

        self.stdout.write(
            self.style.SUCCESS(
                f"\nSecurity Operator '{operator.full_name}' ({operator.email}) ameundwa.\n"
                "Ataombwa kusanidi 2FA (scan QR na Google Authenticator/Authy) mara ya "
                "kwanza atakapoingia kupitia /api/security/auth/login/step1/.\n"
            )
        )
