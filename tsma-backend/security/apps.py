from django.apps import AppConfig


class SecurityConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "security"
    verbose_name = "Security Monitoring (Self-Healing & Alerts)"

    def ready(self):
        # Unganisha na django-axes: kila mara akaunti ya TSMA (accounts.User)
        # inapofungwa (lockout) kwa sababu ya majaribio mengi ya login
        # yasiyofanikiwa, tunarekodi SecurityEvent + kuruhusu auto-block
        # logic ifanye kazi yake (angalia services.py).
        from axes.signals import user_locked_out
        from django.contrib.auth.signals import user_login_failed

        from .models import SecurityEventType, SecuritySeverity
        from .services import get_client_ip, log_event

        def handle_user_locked_out(sender, request, username, ip_address, **kwargs):
            log_event(
                event_type=SecurityEventType.ACCOUNT_LOCKED,
                severity=SecuritySeverity.HIGH,
                ip_address=ip_address,
                description=f"django-axes imefunga akaunti/IP baada ya majaribio mengi: {username}",
            )

        def handle_login_failed(sender, credentials, request, **kwargs):
            if request is None:
                return
            log_event(
                event_type=SecurityEventType.FAILED_LOGIN,
                severity=SecuritySeverity.LOW,
                ip_address=get_client_ip(request),
                path=getattr(request, "path", ""),
                description=f"Login iliyoshindwa: {credentials.get('username', credentials.get('email', '?'))}",
            )

        user_locked_out.connect(handle_user_locked_out, dispatch_uid="security_axes_lockout")
        user_login_failed.connect(handle_login_failed, dispatch_uid="security_login_failed")
