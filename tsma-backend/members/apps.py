from django.apps import AppConfig


class MembersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "members"
    verbose_name = "Members (Uanachama)"

    def ready(self):
        from payments.signals import payment_succeeded

        from .services.membership import handle_payment_succeeded

        payment_succeeded.connect(handle_payment_succeeded, dispatch_uid="members_activate")
