from django.conf import settings
from django.core.mail import send_mail
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Tuma barua pepe ya majaribio ili kuthibitisha kwamba mipangilio ya email inafanya kazi."

    def add_arguments(self, parser):
        parser.add_argument("to", help="Barua pepe ya kupokea (mfano: wewe@gmail.com)")

    def handle(self, *args, **options):
        self.stdout.write(
            f"Backend: {settings.EMAIL_BACKEND}\n"
            f"Provider: {getattr(settings, 'EMAIL_PROVIDER', '-')}\n"
            f"From: {settings.DEFAULT_FROM_EMAIL}"
        )
        try:
            sent = send_mail(
                "TSMA - barua pepe ya majaribio",
                "Kama unaisoma hii, mipangilio ya barua pepe ya TSMA inafanya kazi.",
                settings.DEFAULT_FROM_EMAIL,
                [options["to"]],
                fail_silently=False,
            )
        except Exception as exc:  # onyesha kosa halisi, usilifiche
            raise CommandError(f"Imeshindikana: {exc!r}") from exc
        if not sent:
            raise CommandError("Hakuna barua pepe iliyotumwa (angalia mipangilio).")
        self.stdout.write(self.style.SUCCESS(f"Imetumwa kwa {options['to']}. Angalia inbox (na spam)."))
