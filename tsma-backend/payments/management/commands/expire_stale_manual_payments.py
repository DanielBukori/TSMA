"""
python manage.py expire_stale_manual_payments

Inatafuta PaymentTransaction za gateway='manual' zilizo bado 'processing'
lakini `expires_at` yake imepita (mwanachama hakutuma ujumbe wa
uthibitisho ndani ya muda uliopangwa) - inazibadilisha kuwa 'expired'.

Endesha hii kila mara (cron/scheduled task, mfano kila saa) ili
transaction za zamani zisibaki 'processing' milele. SUCCESS haiwezi
kamwe kubadilishwa (angalia PaymentTransaction.mark_expired()).
"""

from django.core.management.base import BaseCommand
from django.utils import timezone

from payments.models import Gateway, PaymentStatus, PaymentTransaction


class Command(BaseCommand):
    help = "Badilisha kuwa 'expired' malipo ya manual yaliyopitiliza deadline bila uthibitisho."

    def handle(self, *args, **options):
        stale = PaymentTransaction.objects.filter(
            gateway=Gateway.MANUAL,
            status=PaymentStatus.PROCESSING,
            expires_at__isnull=False,
            expires_at__lt=timezone.now(),
        )

        count = 0
        for txn in stale:
            txn.mark_expired()
            count += 1

        self.stdout.write(self.style.SUCCESS(
            f"{count} transaction za manual zimebadilishwa kuwa 'expired'."
        ))
