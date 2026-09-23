"""
Jaribu tena payouts za waandishi zilizoshindwa/zinazosubiri.

Endesha mara kwa mara (cron kila dakika 10-15, au Celery beat ukiwa nayo):

    python manage.py retry_failed_payouts

Ni SALAMA kuendesha mara nyingi mfululizo (idempotent) — kila purchase
ina lock+status guard (angalia payout_handler.attempt_author_payout),
hivyo haiwezekani kutuma payout ile ile mara mbili hata ukiendesha amri
hii mara kadhaa kwa dakika moja.
"""

from django.core.management.base import BaseCommand

from publications.models import PublicationPayoutStatus, PublicationPurchase
from publications.services.payout_handler import attempt_author_payout


class Command(BaseCommand):
    help = "Jaribu tena payouts za waandishi zenye status PENDING au FAILED (idempotent, salama kurudia)."

    def handle(self, *args, **options):
        retryable = PublicationPurchase.objects.filter(
            payout_status__in=[PublicationPayoutStatus.PENDING, PublicationPayoutStatus.FAILED],
            status="completed",
        ).exclude(publication__author_payout_phone_number="")

        count = retryable.count()
        if count == 0:
            self.stdout.write(self.style.SUCCESS("Hakuna payouts zinazohitaji retry."))
            return

        self.stdout.write(f"Inajaribu payouts {count}...")

        succeeded, still_pending = 0, 0
        for purchase in retryable:
            result = attempt_author_payout(purchase.pk)
            if result.payout_status == PublicationPayoutStatus.PAID:
                succeeded += 1
                self.stdout.write(self.style.SUCCESS(f"  ✓ Purchase #{purchase.pk} — imelipwa"))
            else:
                still_pending += 1
                self.stdout.write(
                    self.style.WARNING(
                        f"  … Purchase #{purchase.pk} — bado {result.payout_status} "
                        f"({result.payout_failure_reason or 'no reason'})"
                    )
                )

        self.stdout.write(
            self.style.SUCCESS(f"\nImekamilika: {succeeded} zimelipwa, {still_pending} bado zinasubiri.")
        )
