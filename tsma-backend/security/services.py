"""
Kiini cha mfumo wa Security Monitoring.

Jinsi apps nyingine zinavyotumia hii (mfano payments/services.py
inapokataa webhook isiyo na signature sahihi):

    from security.services import log_event
    log_event(
        event_type=SecurityEventType.WEBHOOK_SIGNATURE_INVALID,
        severity=SecuritySeverity.HIGH,
        ip_address=get_client_ip(request),
        description="Selcom webhook missing Digest/Signed-Fields",
    )

`log_event()` ndiyo hufanya KILA KITU: kuhifadhi tukio, kuangalia kama
kimefikia kiwango cha "auto-block" (self-healing — inazuia MARA MOJA kwa
muda), kutengeneza PendingApprovalAction endapo hatua ya kudumu
inahitajika, na kutuma arifa (dashboard + email/SMS).
"""

from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from .models import (
    BlockedIP,
    PendingApprovalAction,
    SecurityEvent,
    SecurityEventType,
    SecuritySeverity,
)
from .notifiers.email_notifier import EmailNotifier
from .notifiers.sms_whatsapp import AfricasTalkingSMSNotifier, WhatsAppNotifier

_NOTIFIERS = {
    "email": EmailNotifier,
    "sms": AfricasTalkingSMSNotifier,
    "whatsapp": WhatsAppNotifier,
}

# Matukio gani (ndani ya dirisha la muda gani, kiwango gani) husababisha
# self-healing auto-block ya IP. Hii ndiyo "izuie kiotomatiki" uliyoomba.
_AUTO_BLOCK_RULES = {
    SecurityEventType.FAILED_LOGIN: {"threshold": 8, "window_minutes": 10},
    SecurityEventType.WEBHOOK_SIGNATURE_INVALID: {"threshold": 3, "window_minutes": 15},
    SecurityEventType.RATE_LIMIT_EXCEEDED: {"threshold": 5, "window_minutes": 10},
    SecurityEventType.UNAUTHORIZED_ACCESS_ATTEMPT: {"threshold": 5, "window_minutes": 10},
}

_AUTO_BLOCK_DURATION_HOURS = 1  # temporary block — inajifungua yenyewe (self-healing)


def get_client_ip(request):
    """Chukua IP halisi ya mtumiaji, ukizingatia proxy/load-balancer (X-Forwarded-For)."""
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def log_event(
    *,
    event_type,
    severity=SecuritySeverity.LOW,
    ip_address=None,
    user=None,
    path="",
    description="",
    metadata=None,
):
    """Sehemu KUU — apps zote zinapaswa kuita hii pekee, siyo model moja kwa moja."""
    event = SecurityEvent.objects.create(
        event_type=event_type,
        severity=severity,
        ip_address=ip_address,
        user=user,
        path=path,
        description=description,
        metadata=metadata or {},
    )

    _maybe_auto_block(event)
    _notify(event)

    return event


def _maybe_auto_block(event):
    """
    Once an event type crosses its threshold, block the IP for a short while
    straight away instead of waiting for someone to notice, then record a
    PendingApprovalAction so an admin decides whether the block becomes
    permanent.
    """
    rule = _AUTO_BLOCK_RULES.get(event.event_type)
    if not rule or not event.ip_address:
        return

    window_start = timezone.now() - timedelta(minutes=rule["window_minutes"])
    recent_count = SecurityEvent.objects.filter(
        event_type=event.event_type,
        ip_address=event.ip_address,
        created_at__gte=window_start,
    ).count()

    if recent_count < rule["threshold"]:
        return

    # A block for this IP may already exist; don't stack a second one.
    if BlockedIP.objects.filter(ip_address=event.ip_address).exists():
        return

    blocked_until = timezone.now() + timedelta(hours=_AUTO_BLOCK_DURATION_HOURS)
    BlockedIP.objects.create(
        ip_address=event.ip_address,
        reason=(
            f"Auto-block: {event.get_event_type_display()} x{recent_count} "
            f"ndani ya dakika {rule['window_minutes']}."
        ),
        is_permanent=False,
        blocked_until=blocked_until,
        blocked_by_system=True,
    )

    event.auto_action_taken = f"IP {event.ip_address} imezuiwa kwa saa {_AUTO_BLOCK_DURATION_HOURS} (auto)."
    event.severity = SecuritySeverity.CRITICAL
    event.save(update_fields=["auto_action_taken", "severity"])

    PendingApprovalAction.objects.create(
        action_type=PendingApprovalAction.ActionType.PERMANENT_IP_BLOCK,
        related_event=event,
        target_description=f"IP {event.ip_address}",
        reason=(
            f"IP hii imezuiwa kwa muda wa saa {_AUTO_BLOCK_DURATION_HOURS} baada ya "
            f"{event.get_event_type_display()} kurudiwa mara {recent_count}. "
            f"Idhinisha kuifanya ya kudumu, au kataa ili ifunguliwe sasa."
        ),
    )

    log_event(
        event_type=SecurityEventType.SUSPICIOUS_IP_BLOCKED,
        severity=SecuritySeverity.CRITICAL,
        ip_address=event.ip_address,
        description="IP imezuiwa kiotomatiki kwa muda; inasubiri idhini ya kuifanya ya kudumu.",
    )


def _notify(event):
    """Send notifications on the channels enabled in settings.SECURITY_NOTIFICATION_CHANNELS."""
    if event.severity not in (SecuritySeverity.HIGH, SecuritySeverity.CRITICAL):
        return  # small events stay on the dashboard; don't page the admin for them

    channels = getattr(settings, "SECURITY_NOTIFICATION_CHANNELS", ["email"])
    recipients_email = getattr(settings, "SECURITY_ALERT_RECIPIENTS", [])

    subject = event.get_event_type_display()
    message = (
        f"Tukio: {event.get_event_type_display()}\n"
        f"Ukali: {event.severity}\n"
        f"IP: {event.ip_address or '-'}\n"
        f"Maelezo: {event.description}\n"
        f"Hatua ya kiotomatiki: {event.auto_action_taken or 'Hakuna'}\n"
        f"Muda: {event.created_at}\n\n"
        f"Angalia dashibodi ya usalama kuchukua hatua."
    )

    for channel_code in channels:
        notifier_class = _NOTIFIERS.get(channel_code)
        if not notifier_class:
            continue
        notifier_class().send_alert(
            subject=subject, message=message, severity=event.severity, recipients=recipients_email
        )


def is_ip_blocked(ip_address):
    if not ip_address:
        return False
    blocked = BlockedIP.objects.filter(ip_address=ip_address).first()
    if not blocked:
        return False
    if blocked.is_active:
        return True
    # Muda umeisha na siyo ya kudumu — self-healing: ifute yenyewe.
    blocked.delete()
    return False
