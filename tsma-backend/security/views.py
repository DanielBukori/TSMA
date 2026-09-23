from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from . import auth_tokens, totp
from .authentication import SecurityAdminAuthentication
from .models import (
    BlockedIP,
    PendingApprovalAction,
    SecurityAdminUser,
    SecurityEvent,
    SecurityEventType,
    SecuritySeverity,
)
from .permissions import IsSecurityOperator, IsSecuritySuperOperator
from .serializers import (
    ApprovalDecisionSerializer,
    BlockedIPSerializer,
    ConfirmTotpSetupSerializer,
    LoginStep1Serializer,
    LoginStep2Serializer,
    PendingApprovalActionSerializer,
    SecurityEventSerializer,
)
from .services import get_client_ip, log_event


# ----------------------------------------------------------------------
# AUTH — hatua 2 (password -> TOTP). Login ya dashibodi hii ni TOFAUTI
# kabisa na /api/auth/ ya accounts.User.
# ----------------------------------------------------------------------

class LoginStep1View(APIView):
    """
    POST /api/security/auth/login/step1/
    Thibitisha email+password. Ikiwa 2FA bado haijasanidiwa, inarudisha
    `needs_totp_setup=True` + QR provisioning URI. Vinginevyo inarudisha
    `pre_2fa_token` ya muda mfupi kwa hatua ya pili (TOTP).
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = LoginStep1Serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].lower().strip()
        password = serializer.validated_data["password"]
        ip = get_client_ip(request)

        operator = SecurityAdminUser.objects.filter(email__iexact=email).first()

        # Generic error message kwa email isiyopo (usalama: epuka user
        # enumeration), lakini bado tunarekodi tukio.
        if not operator or not operator.is_active:
            log_event(
                event_type=SecurityEventType.UNAUTHORIZED_ACCESS_ATTEMPT,
                severity=SecuritySeverity.MEDIUM,
                ip_address=ip,
                path=request.path,
                description=f"Security dashboard login attempt - email haijulikani: {email}",
            )
            return Response({"detail": "Email au password si sahihi."}, status=status.HTTP_401_UNAUTHORIZED)

        if operator.is_locked:
            log_event(
                event_type=SecurityEventType.UNAUTHORIZED_ACCESS_ATTEMPT,
                severity=SecuritySeverity.HIGH,
                ip_address=ip,
                user=None,
                path=request.path,
                description=f"Jaribio la login kwenye akaunti iliyofungwa: {email}",
            )
            return Response(
                {"detail": "Akaunti hii imefungwa kwa muda kutokana na majaribio mengi yasiyofanikiwa."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not operator.check_password(password):
            operator.register_failed_attempt()
            log_event(
                event_type=SecurityEventType.FAILED_LOGIN,
                severity=SecuritySeverity.MEDIUM,
                ip_address=ip,
                path=request.path,
                description=f"Password isiyo sahihi kwa security dashboard: {email}",
            )
            return Response({"detail": "Email au password si sahihi."}, status=status.HTTP_401_UNAUTHORIZED)

        pre_token = auth_tokens.issue_pre_2fa_token(operator)

        if not operator.totp_confirmed:
            if not operator.totp_secret:
                operator.totp_secret = totp.generate_totp_secret()
                operator.save(update_fields=["totp_secret"])
            uri = totp.get_provisioning_uri(operator.totp_secret, operator.email)
            qr_svg = totp.generate_qr_code_svg(uri)
            return Response(
                {
                    "needs_totp_setup": True,
                    "pre_2fa_token": pre_token,
                    "qr_code_svg": qr_svg,
                    "manual_entry_secret": operator.totp_secret,
                    "detail": "2FA ni ya lazima. Scan QR kwa Google Authenticator/Authy kisha wasilisha code ya kwanza.",
                }
            )

        return Response({"needs_totp_setup": False, "pre_2fa_token": pre_token})


class ConfirmTotpSetupView(APIView):
    """POST /api/security/auth/setup-totp/confirm/ - Thibitisha 2FA mara ya kwanza."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = ConfirmTotpSetupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        operator_id = auth_tokens.verify_pre_2fa_token(serializer.validated_data["pre_2fa_token"])
        if not operator_id:
            return Response({"detail": "Token imeisha muda. Ingia tena."}, status=status.HTTP_401_UNAUTHORIZED)

        operator = SecurityAdminUser.objects.filter(pk=operator_id).first()
        if not operator:
            return Response({"detail": "Operator haipatikani."}, status=status.HTTP_404_NOT_FOUND)

        if not totp.verify_totp_code(operator.totp_secret, serializer.validated_data["totp_code"]):
            log_event(
                event_type=SecurityEventType.FAILED_LOGIN,
                severity=SecuritySeverity.HIGH,
                ip_address=get_client_ip(request),
                description=f"2FA setup code isiyo sahihi: {operator.email}",
            )
            return Response({"detail": "Code ya 2FA si sahihi."}, status=status.HTTP_400_BAD_REQUEST)

        operator.totp_confirmed = True
        operator.save(update_fields=["totp_confirmed"])
        operator.register_successful_login(get_client_ip(request))

        token = auth_tokens.issue_full_session(operator, get_client_ip(request))
        return Response({"token": token, "detail": "2FA imewekwa. Umeingia."})


class LoginStep2View(APIView):
    """POST /api/security/auth/login/step2/ - Wasilisha TOTP code baada ya password."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = LoginStep2Serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ip = get_client_ip(request)

        operator_id = auth_tokens.verify_pre_2fa_token(serializer.validated_data["pre_2fa_token"])
        if not operator_id:
            return Response({"detail": "Token imeisha muda. Ingia tena."}, status=status.HTTP_401_UNAUTHORIZED)

        operator = SecurityAdminUser.objects.filter(pk=operator_id).first()
        if not operator or not operator.is_active:
            return Response({"detail": "Operator haipatikani."}, status=status.HTTP_404_NOT_FOUND)

        if not totp.verify_totp_code(operator.totp_secret, serializer.validated_data["totp_code"]):
            operator.register_failed_attempt()
            log_event(
                event_type=SecurityEventType.FAILED_LOGIN,
                severity=SecuritySeverity.HIGH,
                ip_address=ip,
                description=f"2FA code isiyo sahihi kwa security dashboard: {operator.email}",
            )
            return Response({"detail": "Code ya 2FA si sahihi."}, status=status.HTTP_401_UNAUTHORIZED)

        operator.register_successful_login(ip)
        token = auth_tokens.issue_full_session(operator, ip)

        return Response(
            {
                "token": token,
                "operator": {
                    "email": operator.email,
                    "full_name": operator.full_name,
                    "is_superuser_operator": operator.is_superuser_operator,
                },
            }
        )


class LogoutView(APIView):
    authentication_classes = [SecurityAdminAuthentication]
    permission_classes = [IsSecurityOperator]

    def post(self, request):
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")
        raw_token = auth_header.replace("Operator ", "").strip()
        auth_tokens.revoke_session(raw_token)
        return Response({"detail": "Umetoka."})


# ----------------------------------------------------------------------
# DASHBOARD DATA
# ----------------------------------------------------------------------

class SecurityEventListView(generics.ListAPIView):
    """GET /api/security/events/?severity=critical&reviewed=false"""

    authentication_classes = [SecurityAdminAuthentication]
    permission_classes = [IsSecurityOperator]
    serializer_class = SecurityEventSerializer

    def get_queryset(self):
        qs = SecurityEvent.objects.all()
        severity = self.request.query_params.get("severity")
        if severity:
            qs = qs.filter(severity=severity)
        reviewed = self.request.query_params.get("reviewed")
        if reviewed is not None:
            qs = qs.filter(is_reviewed=reviewed.lower() == "true")
        return qs[:200]


class SecurityDashboardSummaryView(APIView):
    """GET /api/security/summary/ - namba za haraka kwa dashboard cards."""

    authentication_classes = [SecurityAdminAuthentication]
    permission_classes = [IsSecurityOperator]

    def get(self, request):
        last_24h = timezone.now() - timezone.timedelta(hours=24)
        return Response(
            {
                "events_last_24h": SecurityEvent.objects.filter(created_at__gte=last_24h).count(),
                "critical_unreviewed": SecurityEvent.objects.filter(
                    severity=SecuritySeverity.CRITICAL, is_reviewed=False
                ).count(),
                "active_blocks": sum(1 for b in BlockedIP.objects.all() if b.is_active),
                "pending_approvals": PendingApprovalAction.objects.filter(
                    status=PendingApprovalAction.Status.PENDING
                ).count(),
            }
        )


class BlockedIPListView(generics.ListAPIView):
    authentication_classes = [SecurityAdminAuthentication]
    permission_classes = [IsSecurityOperator]
    serializer_class = BlockedIPSerializer
    queryset = BlockedIP.objects.all()


class UnblockIPView(APIView):
    """POST /api/security/blocked-ips/<id>/unblock/ - Fungua IP kabla ya muda (Admin override)."""

    authentication_classes = [SecurityAdminAuthentication]
    permission_classes = [IsSecurityOperator]

    def post(self, request, pk):
        BlockedIP.objects.filter(pk=pk).delete()
        return Response({"detail": "IP imefunguliwa."})


class PendingApprovalListView(generics.ListAPIView):
    authentication_classes = [SecurityAdminAuthentication]
    permission_classes = [IsSecurityOperator]
    serializer_class = PendingApprovalActionSerializer

    def get_queryset(self):
        return PendingApprovalAction.objects.filter(status=PendingApprovalAction.Status.PENDING)


class DecideApprovalView(APIView):
    """
    POST /api/security/pending-actions/<id>/decide/
    {"approve": true/false, "notes": "..."}
    HII NDIYO HATUA YA IDHINI YA BINADAMU uliyoiomba — hatua za kudumu
    (mfano permanent IP block) hazitokei bila operator kubonyeza hapa.
    Ni `IsSecuritySuperOperator` pekee wanaoruhusiwa.
    """

    authentication_classes = [SecurityAdminAuthentication]
    permission_classes = [IsSecuritySuperOperator]

    def post(self, request, pk):
        action = PendingApprovalAction.objects.filter(
            pk=pk, status=PendingApprovalAction.Status.PENDING
        ).first()
        if not action:
            return Response({"detail": "Hatua haipatikani au tayari imeamuliwa."}, status=404)

        serializer = ApprovalDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        approve = serializer.validated_data["approve"]

        if approve and action.action_type == PendingApprovalAction.ActionType.PERMANENT_IP_BLOCK:
            ip = action.target_description.replace("IP ", "").strip()
            BlockedIP.objects.update_or_create(
                ip_address=ip,
                defaults={
                    "is_permanent": True,
                    "blocked_until": None,
                    "reason": f"Imeidhinishwa kudumu na {request.user.email}: {action.reason}",
                    "approved_by": request.user,
                },
            )
        elif not approve and action.action_type == PendingApprovalAction.ActionType.PERMANENT_IP_BLOCK:
            ip = action.target_description.replace("IP ", "").strip()
            BlockedIP.objects.filter(ip_address=ip, is_permanent=False).delete()

        action.status = (
            PendingApprovalAction.Status.APPROVED if approve else PendingApprovalAction.Status.REJECTED
        )
        action.decided_at = timezone.now()
        action.decided_by = request.user
        action.save(update_fields=["status", "decided_at", "decided_by"])

        return Response(PendingApprovalActionSerializer(action).data)
