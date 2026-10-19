from django.conf import settings
from django.core.mail import send_mail
from django.core import signing
from django.contrib.auth.hashers import check_password
from django.db import transaction as db_transaction
from django.shortcuts import get_object_or_404
from django.utils.translation import gettext_lazy as _
from rest_framework import generics, status, serializers
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .emails import send_otp_email
from .models import EmailOTP, User
from .otp import OTPThrottled, issue_otp, verify_otp
from .serializers import (
    ChangePasswordSerializer,
    CustomTokenObtainPairSerializer,
    EmailOnlySerializer,
    EmailVerificationConfirmSerializer,
    LogoutSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    UserSerializer,
    UserUpdateSerializer,
)


def _send_otp(user, purpose):
    """Tengeneza na utume OTP. Inarudisha True kama barua pepe imetumwa; False vinginevyo (si kosa kubwa)."""
    try:
        code = issue_otp(user, purpose)
    except OTPThrottled:
        return False
    return send_otp_email(user, purpose, code)


EDITOR_ALLOWED_ROLES = {
    User.Role.CONTENT_EDITOR,
    User.Role.BOARD_ADMIN,
    User.Role.SUPER_ADMIN,
}
EDITOR_MFA_SALT = "tsma.editor-access.mfa.v1"


def _is_editor_allowed(user):
    return bool(user and (user.role in EDITOR_ALLOWED_ROLES or user.is_superuser))
EDITOR_MFA_MAX_AGE_SECONDS = 10 * 60


class EditorLoginStartSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(trim_whitespace=False, write_only=True)


class EditorLoginVerifySerializer(serializers.Serializer):
    challenge = serializers.CharField()
    code = serializers.RegexField(regex=r"^\d{6}$")


class EditorLoginResendSerializer(serializers.Serializer):
    challenge = serializers.CharField()


class EditorLoginStartView(APIView):
    """Password step only issues a short-lived challenge, never a session token."""
    permission_classes = [AllowAny]
    throttle_scope = "editor_login"

    def post(self, request):
        serializer = EditorLoginStartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].strip().lower()
        password = serializer.validated_data["password"]
        user = User.objects.filter(email__iexact=email, is_active=True).first()
        # Keep the same public response for wrong password, missing user and wrong role.
        generic_error = {"detail": "Taarifa za kuingia si sahihi au akaunti haina ruhusa."}
        if not user or not check_password(password, user.password) or not _is_editor_allowed(user):
            return Response(generic_error, status=status.HTTP_400_BAD_REQUEST)
        if not user.is_email_verified and not user.is_super_admin:
            return Response({"detail": "Akaunti lazima ithibitishe barua pepe kabla ya Editor login."}, status=status.HTTP_403_FORBIDDEN)
        try:
            code = issue_otp(user, EmailOTP.Purpose.EDITOR_LOGIN)
        except OTPThrottled as exc:
            return Response({"detail": str(exc), "retry_after": exc.wait_seconds}, status=status.HTTP_429_TOO_MANY_REQUESTS)
        if not send_otp_email(user, EmailOTP.Purpose.EDITOR_LOGIN, code):
            EmailOTP.objects.filter(user=user, purpose=EmailOTP.Purpose.EDITOR_LOGIN, used=False).update(used=True)
            return Response({"detail": "Barua pepe ya uthibitisho haikutumwa. Jaribu tena baada ya muda au wasiliana na msimamizi."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        challenge = signing.dumps({"uid": str(user.pk)}, salt=EDITOR_MFA_SALT)
        return Response({"challenge": challenge, "detail": "Namba ya usalama imetumwa kwenye barua pepe yako.", "masked_email": _mask_email(user.email), "expires_in": 600}, status=status.HTTP_200_OK)


class EditorLoginVerifyView(APIView):
    """The JWT pair is returned only after the email OTP is consumed successfully."""
    permission_classes = [AllowAny]
    throttle_scope = "otp_verify"

    def post(self, request):
        serializer = EditorLoginVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = _editor_user_from_challenge(serializer.validated_data["challenge"])
        if not user:
            return Response({"detail": "Hatua ya kuingia imeisha muda. Anza tena."}, status=status.HTTP_400_BAD_REQUEST)
        if not verify_otp(user, EmailOTP.Purpose.EDITOR_LOGIN, serializer.validated_data["code"]):
            return Response({"detail": "Namba si sahihi au imeisha muda. Jaribu tena au anza upya."}, status=status.HTTP_400_BAD_REQUEST)
        token = CustomTokenObtainPairSerializer.get_token(user)
        token["editor_mfa"] = True
        return Response({"refresh": str(token), "access": str(token.access_token), "user": UserSerializer(user).data}, status=status.HTTP_200_OK)


class EditorLoginResendView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "otp_request"

    def post(self, request):
        serializer = EditorLoginResendSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = _editor_user_from_challenge(serializer.validated_data["challenge"])
        if not user:
            return Response({"detail": "Hatua ya kuingia imeisha muda. Anza tena."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            code = issue_otp(user, EmailOTP.Purpose.EDITOR_LOGIN)
        except OTPThrottled as exc:
            return Response({"detail": str(exc), "retry_after": exc.wait_seconds}, status=status.HTTP_429_TOO_MANY_REQUESTS)
        if not send_otp_email(user, EmailOTP.Purpose.EDITOR_LOGIN, code):
            EmailOTP.objects.filter(user=user, purpose=EmailOTP.Purpose.EDITOR_LOGIN, used=False).update(used=True)
            return Response({"detail": "Barua pepe haikutumwa. Jaribu tena baadaye."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response({"detail": "Namba mpya imetumwa."}, status=status.HTTP_200_OK)


def _editor_user_from_challenge(challenge):
    try:
        payload = signing.loads(challenge, salt=EDITOR_MFA_SALT, max_age=EDITOR_MFA_MAX_AGE_SECONDS)
        user = User.objects.filter(pk=payload.get("uid"), is_active=True).first()
    except (signing.BadSignature, signing.SignatureExpired, TypeError, ValueError):
        return None
    if not user or not _is_editor_allowed(user):
        return None
    return user


def _mask_email(email):
    local, _, domain = email.partition("@")
    visible = local[:1] if local else "*"
    return f"{visible}{'*' * max(2, min(len(local) - 1, 8))}@{domain}"


class RegisterView(generics.CreateAPIView):
    """
    POST /api/auth/register/ - Usajili wa mtumiaji mpya.
    Inatuma OTP (tarakimu 6) kwa barua pepe; mtumiaji lazima aithibitishe
    (POST /api/auth/email/verify/) kabla ya kuingia.
    """

    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]
    throttle_scope = "otp_request"

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        email_sent = _send_otp(user, EmailOTP.Purpose.VERIFY_EMAIL)

        return Response(
            {
                "user": UserSerializer(user).data,
                "requires_email_verification": True,
                "email_sent": email_sent,
                "message": _(
                    "Usajili umefanikiwa. Tumetuma namba ya tarakimu 6 kwenye barua pepe yako - "
                    "iingize kuthibitisha akaunti."
                )
                if email_sent
                else _(
                    "Usajili umefanikiwa, lakini barua pepe haikutumwa. "
                    "Bonyeza 'Tuma namba tena' kwenye skrini ifuatayo."
                ),
            },
            status=status.HTTP_201_CREATED,
        )


class CustomTokenObtainPairView(TokenObtainPairView):
    """POST /api/auth/login/ - Inarudisha access + refresh token pamoja na user data."""

    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]


class CustomTokenRefreshView(TokenRefreshView):
    """POST /api/auth/refresh/ - Kupata access token mpya kutoka refresh token."""

    permission_classes = [AllowAny]


class LogoutView(APIView):
    """
    POST /api/auth/logout/ - Inablacklist refresh token ili isitumike tena.
    Inahitaji SIMPLE_JWT['ROTATE_REFRESH_TOKENS']=True na blacklist app iwe imewashwa.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            token = RefreshToken(serializer.validated_data["refresh"])
            token.blacklist()
        except TokenError:
            return Response(
                {"detail": _("Refresh token si sahihi au tayari imeisha muda.")},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            {"detail": _("Umetoka kwenye mfumo (logout) kwa mafanikio.")},
            status=status.HTTP_200_OK,
        )


class MeView(generics.RetrieveUpdateAPIView):
    """
    GET /api/auth/me/ - Profile ya mtumiaji aliye-login.
    PATCH /api/auth/me/ - Kuhariri profile (first_name, last_name, phone_number).
    """

    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return UserUpdateSerializer
        return UserSerializer

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", True)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(instance).data)


class ChangePasswordView(APIView):
    """POST /api/auth/password/change/ - Kubadili password (mtumiaji akiwa amelogin)."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"detail": _("Password Changed Successifully.")},
            status=status.HTTP_200_OK,
        )


class PasswordResetRequestView(APIView):
    """
    POST /api/auth/password/reset/  {email}
    Inatuma OTP (tarakimu 6) kwa barua pepe kwa ajili ya kubadili password.
    Jibu ni LILELILE hata kama barua pepe haipo (kuzuia user enumeration).
    """

    permission_classes = [AllowAny]
    throttle_scope = "password_reset"

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]

        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if user:
            _send_otp(user, EmailOTP.Purpose.RESET_PASSWORD)

        return Response(
            {
                "detail": _(
                    "Kama barua pepe hiyo ipo kwenye mfumo, tumetuma namba ya tarakimu 6 "
                    "ya kubadili password."
                )
            },
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(APIView):
    """POST /api/auth/password/reset/confirm/  {email, code, new_password, new_password_confirm}"""

    permission_classes = [AllowAny]
    throttle_scope = "otp_verify"

    INVALID_MESSAGE = _("Namba si sahihi au imeisha muda. Omba namba mpya.")

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        user = User.objects.filter(email__iexact=data["email"], is_active=True).first()
        if not user or not verify_otp(user, EmailOTP.Purpose.RESET_PASSWORD, data["code"]):
            return Response(
                {"detail": self.INVALID_MESSAGE}, status=status.HTTP_400_BAD_REQUEST
            )

        with db_transaction.atomic():
            user.set_password(data["new_password"])
            # Kupokea OTP kwenye barua pepe kunathibitisha mmiliki wa barua pepe hiyo.
            user.is_email_verified = True
            user.save(update_fields=["password", "is_email_verified"])

            # USALAMA: futa (blacklist) refresh tokens ZOTE za mtumiaji - kama akaunti
            # ilikuwa imevamiwa, session za mvamizi zinakatika mara moja.
            self._blacklist_all_refresh_tokens(user)

        return Response(
            {"detail": _("Password imebadilishwa. Sasa unaweza kuingia (login).")},
            status=status.HTTP_200_OK,
        )

    @staticmethod
    def _blacklist_all_refresh_tokens(user):
        try:
            from rest_framework_simplejwt.token_blacklist.models import (
                BlacklistedToken,
                OutstandingToken,
            )
        except ImportError:
            # 'rest_framework_simplejwt.token_blacklist' haijawashwa
            # kwenye INSTALLED_APPS — angalia SETUP_SETTINGS.md.
            return

        for outstanding in OutstandingToken.objects.filter(user=user):
            BlacklistedToken.objects.get_or_create(token=outstanding)


class EmailVerificationConfirmView(APIView):
    """POST /api/auth/email/verify/  {email, code} - Kuthibitisha barua pepe kwa OTP."""

    permission_classes = [AllowAny]
    throttle_scope = "otp_verify"

    def post(self, request):
        serializer = EmailVerificationConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        user = User.objects.filter(email__iexact=data["email"], is_active=True).first()
        if not user or not verify_otp(user, EmailOTP.Purpose.VERIFY_EMAIL, data["code"]):
            return Response(
                {"detail": _("Namba si sahihi au imeisha muda. Omba namba mpya.")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.is_email_verified:
            user.is_email_verified = True
            user.save(update_fields=["is_email_verified"])

        return Response(
            {"detail": _("Barua pepe imethibitishwa. Sasa unaweza kuingia (login).")},
            status=status.HTTP_200_OK,
        )


class EmailVerificationResendView(APIView):
    """
    POST /api/auth/email/resend/  {email} - Tuma namba mpya ya uthibitisho.
    Jibu ni LILELILE kila wakati (kuzuia user enumeration). Frontend inaonyesha
    kipima-muda cha sekunde 60 chenyewe; backend inazuia kutuma kabla ya hapo.
    """

    permission_classes = [AllowAny]
    throttle_scope = "otp_request"

    def post(self, request):
        serializer = EmailOnlySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = User.objects.filter(
            email__iexact=serializer.validated_data["email"], is_active=True
        ).first()
        if user and not user.is_email_verified:
            _send_otp(user, EmailOTP.Purpose.VERIFY_EMAIL)

        return Response(
            {
                "detail": _(
                    "Kama akaunti ipo na haijathibitishwa, tumetuma namba mpya ya tarakimu 6."
                )
            },
            status=status.HTTP_200_OK,
        )
