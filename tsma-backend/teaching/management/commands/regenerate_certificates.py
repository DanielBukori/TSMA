from django.core.management.base import BaseCommand
from django.db.models import Q

from teaching.models import Certificate
from teaching.services.certificate_generator import generate_certificate_image


class Command(BaseCommand):
    help = "Tengeneza picha za vyeti ambazo hazikutengenezwa (picha tupu). Salama kurudia."

    def handle(self, *args, **options):
        missing = Certificate.objects.filter(Q(certificate_image="") | Q(certificate_image__isnull=True))
        done = failed = 0
        for certificate in missing:
            try:
                generate_certificate_image(certificate)
                done += 1
            except Exception as exc:
                failed += 1
                self.stdout.write(self.style.ERROR(f"{certificate.certificate_number}: {exc!r}"))
        self.stdout.write(f"Zimetengenezwa: {done} | Zimeshindwa: {failed}")
