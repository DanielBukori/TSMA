from django.apps import AppConfig


class ConferencesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "conferences"
    verbose_name = "Conferences (Mikutano)"

    def ready(self):
        from payments.signals import payment_succeeded

        from .services.payment_handler import handle_payment_succeeded

        payment_succeeded.connect(
            handle_payment_succeeded, dispatch_uid="conferences_confirm_batch"
        )
