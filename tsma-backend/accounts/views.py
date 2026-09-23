from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction as db_transaction
from django.shortcuts import get_object_or_404
from django.utils.translation import gettext_lazy as _
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .models import EmailVerificationToken, PasswordResetToken, User
from .serializers import (
    ChangePasswordSerializer,
    CustomTokenObtainPairSerializer,
    EmailVerificationConfirmSerializer,
    LogoutSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    UserSerializer,
    UserUpdateSerializer,
)


class RegisterView(generics.CreateAPIView):
    """POST /api/auth/register/ - New User Registration."""

    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Tengeneza email verification token na (kwa production) tuma email
        verification, _created = EmailVerificationToken.objects.get_or_create(user=user)
        self._send_verification_email(user, verification.token)

        return Response(
            {
                "user": UserSerializer(user).data,
                "message": _(
                    "Account Registration successifully. Please check your Email for account verification."
                ),
            },
            status=status.HTTP_201_CREATED,
        )

    @staticmethod
    def _send_verification_email(user, token):
        verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
        try:
            send_mail(
                subject="TSMA - Confirm your account",
                message=(
                    f"hello {user.first_name},\n\n"
                    f"Please Click the link to Confirm your account:\n{verify_url}\n\n"
                    "Thank you,\nTSMA Team"
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=True,
            )
        except Exception:
            # Katika production, tumia logging badala ya kupuuza kimya kimya
            pass


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
    POST /api/auth/password/reset/
    Mtumiaji anaomba reset link kwa email yake (forgot password).
    """

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]

        user = User.objects.filter(email__iexact=email).first()
        if user:
            # Batilisha tokens zote za awali ambazo bado hazijatumika, kisha
            # tengeneza moja mpya — kuepuka "reset tokens nyingi active" kwa
            # wakati mmoja (moja ikiwa imevuja, zote zilizopita zinabaki hai).
            PasswordResetToken.objects.filter(user=user, used=False).update(used=True)

            reset_token = PasswordResetToken.objects.create(user=user)
            reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token.token}"
            try:
                send_mail(
                    subject="TSMA - Password Change",
                    message=(
                        f"Hello {user.first_name},\n\n"
                        f"Use this link to change your password (valid for: 1 hour):\n{reset_url}\n\n"
                        "if it's not requested Skip This email.\n\nThank you,\nTSMA Team"
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=True,
                )
            except Exception:
                pass

        # Tunarudisha jibu lile lile hata kama email haipo — kuepuka user enumeration
        return Response(
            {
                "detail": _(
                    "Kama email hiyo ipo kwenye mfumo, maelekezo ya kubadili password "
                    "yametumwa."
                )
            },
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(APIView):
    """POST /api/auth/password/reset/confirm/ - Kukamilisha reset ya password."""

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with db_transaction.atomic():
            # select_for_update: kuzuia race condition endapo maombi mawili
            # yatafika kwa wakati mmoja yakitumia token ile ile kabla
            # 'used=True' kuhifadhiwa (mfano double-submit ya fomu).
            reset_token = get_object_or_404(
                PasswordResetToken.objects.select_for_update(),
                token=serializer.validated_data["token"],
                used=False,
            )

            if reset_token.is_expired():
                return Response(
                    {"detail": _("Token Expired. Request again.")},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            user = reset_token.user
            user.set_password(serializer.validated_data["new_password"])
            user.save(update_fields=["password"])

            reset_token.used = True
            reset_token.save(update_fields=["used"])

            # USALAMA: baada ya password kubadilishwa, futa (blacklist)
            # refresh tokens ZOTE zilizopo za mtumiaji huyu — endapo
            # account ilikuwa imevamiwa, session za mvamizi zinakatika mara
            # moja badala ya kuendelea kutumika hadi zitakapoisha muda wenyewe.
            self._blacklist_all_refresh_tokens(user)

        return Response(
            {"detail": _("Password changed. All existing Session closed. Now you can login (login).")},
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
    """POST /api/auth/email/verify/ - Kuthibitisha email baada ya usajili."""

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = EmailVerificationConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        verification = get_object_or_404(
            EmailVerificationToken, token=serializer.validated_data["token"]
        )

        if verification.is_expired():
            return Response(
                {"detail": _("Token Expired.")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = verification.user
        user.is_email_verified = True
        user.save(update_fields=["is_email_verified"])
        verification.delete()

        return Response(
            {"detail": _("Email Verified successifully.")},
            status=status.HTTP_200_OK,
        )
