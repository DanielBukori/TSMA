from django.apps import AppConfig


class PublicationsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "publications"
    verbose_name = "Publications (Machapisho ya Kitaaluma)"

    def ready(self):
        from payments.signals import payment_succeeded

        from .services.payout_handler import handle_payment_succeeded

        payment_succeeded.connect(
            handle_payment_succeeded, dispatch_uid="publications_purchase_payout"
        )
