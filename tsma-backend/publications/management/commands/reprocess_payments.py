from django.core.management.base import BaseCommand
from django.db.models import Q

from payments.models import PaymentPurpose, PaymentStatus, PaymentTransaction
from payments.services import dispatch_payment_succeeded


class Command(BaseCommand):
    """
    Rekebisha malipo yaliyofanikiwa lakini hatua za baadaye zimekwama:
      - uanachama bado "pending_payment" au kadi haipo
      - conference batch haijathibitishwa au risiti hazipo
      - ununuzi wa chapisho haujakamilika (kitabu hakifunguki)
    Ni salama kuiendesha mara nyingi (cron kila dakika 15 inafaa).
    Tumia --all kurudia malipo YOTE yaliyo SUCCESS.
    """

    help = "Rudia usindikaji baada ya malipo kwa malipo yaliyokwama."

    def add_arguments(self, parser):
        parser.add_argument("--all", action="store_true", help="Rudia malipo yote ya SUCCESS.")

    @staticmethod
    def _needs_repair(txn):
        if txn.post_processing_error:
            return True
        obj = txn.content_object
        if obj is None:
            return False
        if txn.purpose == PaymentPurpose.MEMBERSHIP:
            return obj.status != "active" or not obj.digital_card_image
        if txn.purpose == PaymentPurpose.CONFERENCE:
            return obj.status != "confirmed" or obj.attendees.filter(Q(e_receipt_image="") | Q(e_receipt_image__isnull=True)).exists()
        if txn.purpose == PaymentPurpose.PUBLICATION_PURCHASE:
            return obj.status != "completed"
        return False

    def handle(self, *args, **options):
        qs = PaymentTransaction.objects.filter(status=PaymentStatus.SUCCESS)
        checked = repaired = failing = 0
        for txn in qs.iterator():
            checked += 1
            if not options["all"] and not self._needs_repair(txn):
                continue
            errors = dispatch_payment_succeeded(txn)
            if errors:
                failing += 1
                self.stdout.write(self.style.ERROR(f"{txn.internal_reference}: {errors[0][:200]}"))
            else:
                repaired += 1
                self.stdout.write(self.style.SUCCESS(f"{txn.internal_reference}: imekamilika"))
        self.stdout.write(f"Imekaguliwa: {checked} | Imerekebishwa: {repaired} | Bado inashindwa: {failing}")
