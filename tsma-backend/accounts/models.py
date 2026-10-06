import uuid

from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class UserManager(BaseUserManager):
    """Manager kwa Custom User yenye email kama primary login field."""

    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError(_("Email should be provided."))
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        extra_fields.setdefault("role", User.Role.GUEST)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", User.Role.SUPER_ADMIN)
        extra_fields.setdefault("is_email_verified", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError(_("Superuser lazima awe na is_staff=True."))
        if extra_fields.get("is_superuser") is not True:
            raise ValueError(_("Superuser lazima awe na is_superuser=True."))

        return self._create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom User Model ya TSMA.

    - Email ndio primary login field (siyo username).
    - `role` inasimamia ruhusa za kimfumo (system-level permissions).
    - `membership_tier` (Institution/Lecturer/Entrepreneur/Sponsor/Investor)
      itahifadhiwa kwenye `members` app kupitia OneToOneField, siyo hapa —
      hii inatenganisha "role ya mfumo" na "aina ya uanachama" (biashara).
    """

    class Role(models.TextChoices):
        SUPER_ADMIN = "super_admin", _("Super Administrator")
        BOARD_ADMIN = "board_admin", _("Board/Leadership Admin")
        CONTENT_EDITOR = "content_editor", _("Content Editor")
        MEMBER = "member", _("Member")
        GUEST = "guest", _("Guest/Public")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    email = models.EmailField(_("Email"), unique=True, db_index=True)
    first_name = models.CharField(_("First name"), max_length=150)
    last_name = models.CharField(_("Last name"), max_length=150)
    phone_number = models.CharField(
        _("Mobile number"), max_length=20, blank=True, null=True
    )

    role = models.CharField(
        _("User role"),
        max_length=20,
        choices=Role.choices,
        default=Role.GUEST,
        db_index=True,
    )

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_email_verified = models.BooleanField(default=False)

    date_joined = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    class Meta:
        verbose_name = _("User")
        verbose_name_plural = _("Users")
        ordering = ["-date_joined"]

    def __str__(self):
        return f"{self.get_full_name()} ({self.email})"

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    def get_short_name(self):
        return self.first_name

    @property
    def is_super_admin(self):
        return self.role == self.Role.SUPER_ADMIN or self.is_superuser

    @property
    def is_board_admin(self):
        return self.role == self.Role.BOARD_ADMIN

    @property
    def is_content_editor(self):
        return self.role == self.Role.CONTENT_EDITOR

    @property
    def is_member(self):
        return self.role == self.Role.MEMBER


class EmailVerificationToken(models.Model):
    """Token ya kuthibitisha email baada ya usajili."""

    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="email_verification_token"
    )
    token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def is_expired(self):
        # Token inaisha muda baada ya masaa 24
        return (timezone.now() - self.created_at).total_seconds() > 24 * 3600

    def __str__(self):
        return f"Verification token of {self.user.email}"


class PasswordResetToken(models.Model):
    """Token ya kubadili password (forgot password flow)."""

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="password_reset_tokens"
    )
    token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    used = models.BooleanField(default=False)

    def is_expired(self):
        # Token inaisha muda baada ya saa 1
        return (timezone.now() - self.created_at).total_seconds() > 3600

    def __str__(self):
        return f"Reset token of {self.user.email}"


class EmailOTP(models.Model):
    """
    Namba ya siri ya tarakimu 6 (OTP) inayotumwa kwa barua pepe:
    - VERIFY_EMAIL: kuthibitisha barua pepe kabla ya kuingia (login)
    - RESET_PASSWORD: kubadili password ukisahau

    Namba yenyewe HAIHIFADHIWI (tunahifadhi hash tu). Inaisha muda baada ya
    dakika 10, na inaruhusu majaribio 5 tu (angalia accounts/otp.py).
    """

    class Purpose(models.TextChoices):
        VERIFY_EMAIL = "verify_email", _("Verify email")
        RESET_PASSWORD = "reset_password", _("Reset password")

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="email_otps")
    purpose = models.CharField(max_length=20, choices=Purpose.choices)
    code_hash = models.CharField(max_length=64)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    attempts = models.PositiveSmallIntegerField(default=0)
    used = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "purpose", "used"])]

    def is_expired(self):
        return timezone.now() >= self.expires_at

    def __str__(self):
        return f"OTP {self.purpose} ya {self.user.email}"
