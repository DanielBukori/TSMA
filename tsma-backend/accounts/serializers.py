from django.conf import settings
from django.contrib.auth import password_validation
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True, required=True, style={"input_type": "password"}
    )
    password_confirm = serializers.CharField(
        write_only=True, required=True, style={"input_type": "password"}
    )

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "phone_number",
            "password",
            "password_confirm",
        )
        read_only_fields = ("id",)

    def validate_email(self, value):
        value = value.lower().strip()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(
                _("This email is already registered. Try to login(login).")
            )
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError(
                {"password_confirm": _("Password missmatched.")}
            )
        # Tumia Django's built-in password validators (length, common, numeric, n.k.)
        password_validation.validate_password(attrs["password"])
        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        password = validated_data.pop("password")
        user = User.objects.create_user(
            password=password, role=User.Role.GUEST, **validated_data
        )
        return user


class UserSerializer(serializers.ModelSerializer):
    """Serializer ya profile ya mtumiaji (GET /auth/me/)."""

    full_name = serializers.CharField(source="get_full_name", read_only=True)

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "phone_number",
            "role",
            "is_email_verified",
            "date_joined",
        )
        read_only_fields = ("id", "email", "role", "is_email_verified", "date_joined")


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer ya kuhariri profile (PATCH /auth/me/) - fields chache tu."""

    class Meta:
        model = User
        fields = ("first_name", "last_name", "phone_number")


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Login serializer yenye custom claims (role) ndani ya JWT token,
    na taarifa za user kwenye response badala ya token peke yake.
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["full_name"] = user.get_full_name()
        return token

    def validate(self, attrs):
        data = super().validate(attrs)

        # HIARI (imedhibitiwa na settings.REQUIRE_EMAIL_VERIFICATION,
        # default=False): TSMA inaweza kuamua kulazimisha uthibitisho wa
        # email kabla ya login. Super/Board Admin wanapita ukaguzi huu
        # (mfano akaunti za awali zilizotengenezwa na `createsuperuser`
        # hazina email verification flow).
        require_verification = getattr(settings, "REQUIRE_EMAIL_VERIFICATION", True)
        if (
            require_verification
            and not self.user.is_email_verified
            and not (self.user.is_super_admin or self.user.is_board_admin)
        ):
            raise serializers.ValidationError(
                {
                    "detail": _(
                        "Confirm your email before login. "
                        "Check your email for confirmation token."
                    )
                }
            )

        data["user"] = UserSerializer(self.user).data
        return data


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField(required=True)


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True, style={"input_type": "password"})
    new_password = serializers.CharField(required=True, style={"input_type": "password"})
    new_password_confirm = serializers.CharField(
        required=True, style={"input_type": "password"}
    )

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError(_("Old Password is incorrect."))
        return value

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError(
                {"new_password_confirm": _("New Password missmatch.")}
            )
        password_validation.validate_password(attrs["new_password"])
        return attrs

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password"])
        return user


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.UUIDField(required=True)
    new_password = serializers.CharField(required=True, style={"input_type": "password"})
    new_password_confirm = serializers.CharField(
        required=True, style={"input_type": "password"}
    )

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError(
                {"new_password_confirm": _("New Password missmatch.")}
            )
        password_validation.validate_password(attrs["new_password"])
        return attrs


class EmailVerificationConfirmSerializer(serializers.Serializer):
    token = serializers.UUIDField(required=True)
