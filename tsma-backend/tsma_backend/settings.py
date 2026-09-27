"""
TSMA Backend — settings.py HALISI (siyo maelekezo tu).

Hii inaunganisha KILA KITU tulichojenga: apps 11 (accounts, members,
payments, board, news, gallery, contact, publications, conferences,
teaching, sitecontent) + security hardening yote iliyoainishwa kwenye
SETUP_SECURITY_HARDENING.md (Argon2, django-axes, django-csp, JWT
blacklist, django-storages, Sentry).

MUHIMU: Faili hii inasoma SECRETS zote kutoka environment variables
(.env) — HAKUNA secret yoyote iliyowekwa hapa moja kwa moja. Nakili
`.env.example` kuwa `.env` na jaza thamani zako HALISI kabla ya
kuendesha `python manage.py runserver` au deployment yoyote.
"""

from datetime import timedelta
from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(
    DJANGO_DEBUG=(bool, False),
)
# Soma .env kama ipo (production halisi mara nyingi inatumia environment
# variables za mfumo moja kwa moja badala ya faili la .env — zote mbili
# zinafanya kazi hapa).
env_file = BASE_DIR / ".env"
if env_file.exists():
    environ.Env.read_env(str(env_file))

# ---------------------------------------------------------------------------
# Core
# ---------------------------------------------------------------------------

SECRET_KEY = env("DJANGO_SECRET_KEY")
DEBUG = env("DJANGO_DEBUG")
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])

# Domain kamili ya frontend — inatumika kwenye emails (verification links,
# password reset), QR verification URLs (kadi, vyeti, risiti).
FRONTEND_URL = env("FRONTEND_URL", default="http://localhost:5173")

AUTH_USER_MODEL = "accounts.User"

# ---------------------------------------------------------------------------
# Installed Apps
# ---------------------------------------------------------------------------

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Third-party
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",  # MUHIMU: JWT blacklist (logout halisi, password-reset invalidation)
    "corsheaders",
    "axes",  # brute-force / credential-stuffing protection
    "cloudinary_storage",  # LAZIMA iwe KABLA ya staticfiles (angalia Static/Media Files chini)
    "cloudinary",

    # Local apps (TSMA)
    "accounts",
    "members",
    "payments",
    "board",
    "management_team",
    "news",
    "gallery",
    "contact",
    "publications",
    "partners",
    "careers",
    "conferences",
    "teaching",
    "sitecontent",
    "security",  # Self-healing security monitoring + dashboard (login/2FA yake tofauti)
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",  # inahudumia CSS/JS (static files) - LAZIMA iwe hapa
    "csp.middleware.CSPMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "security.middleware.BlockedIPMiddleware",  # kataa maombi kutoka IP zilizozuiwa MAPEMA kabisa
    "axes.middleware.AxesMiddleware",  # LAZIMA iwe karibu na mwisho
]

ROOT_URLCONF = "tsma_backend.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "tsma_backend.wsgi.application"

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------

DATABASES = {
    "default": env.db(
        "DATABASE_URL",
        default="postgres://tsma_user:tsma_password@localhost:5432/tsma_db",
    )
}

# ---------------------------------------------------------------------------
# Authentication — Argon2 (imara zaidi ya PBKDF2 ya default) + django-axes
# ---------------------------------------------------------------------------

AUTHENTICATION_BACKENDS = [
    "axes.backends.AxesBackend",  # LAZIMA iwe ya KWANZA
    "django.contrib.auth.backends.ModelBackend",
]

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",  # fallback kwa hashes za zamani
]

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 10}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# Email verification enforcement (hiari — angalia CustomTokenObtainPairSerializer)
REQUIRE_EMAIL_VERIFICATION = env.bool("REQUIRE_EMAIL_VERIFICATION", default=False)

# django-axes: funga (lockout) baada ya majaribio 5 yasiyofanikiwa
AXES_FAILURE_LIMIT = 5
AXES_COOLOFF_TIME = 1  # saa 1
AXES_LOCKOUT_PARAMETERS = ["ip_address", "username"]
AXES_RESET_ON_SUCCESS = True

# ---------------------------------------------------------------------------
# Django REST Framework + JWT
# ---------------------------------------------------------------------------

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
        "rest_framework.throttling.ScopedRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "30/minute",
        "user": "120/minute",
        # Scoped throttle maalum kwa endpoints nyeti (angalia
        # throttle_scope kwenye views husika):
        "contact_form": "5/hour",
        "password_reset": "5/hour",
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
}

# ---------------------------------------------------------------------------
# CORS / CSRF
# ---------------------------------------------------------------------------

CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS", default=["http://localhost:5173"]
)
CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=["http://localhost:5173"])

# ---------------------------------------------------------------------------
# Security Headers (production) — vinawashwa moja kwa moja DEBUG=False tu,
# ili maendeleo ya ndani (localhost, http) yasivunjike.
# ---------------------------------------------------------------------------

if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = False  # CSRF token lazima isomeke na JS kwa baadhi ya flows; DRF+JWT haitumii CSRF kwa API calls za JWT

# django-csp — Content-Security-Policy
CSP_DEFAULT_SRC = ("'self'",)
CSP_IMG_SRC = ("'self'", "data:", "https:")
CSP_SCRIPT_SRC = ("'self'",)
CSP_STYLE_SRC = ("'self'", "'unsafe-inline'", "https://fonts.googleapis.com")
CSP_FONT_SRC = ("'self'", "https://fonts.gstatic.com")
CSP_CONNECT_SRC = ("'self'",) + tuple(CORS_ALLOWED_ORIGINS)

# ---------------------------------------------------------------------------
# Internationalization
# ---------------------------------------------------------------------------

LANGUAGE_CODE = "sw"
TIME_ZONE = "Africa/Dar_es_Salaam"
USE_I18N = True
USE_TZ = True

# ---------------------------------------------------------------------------
# Static / Media Files
# ---------------------------------------------------------------------------

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"
WHITENOISE_MANIFEST_STRICT = False  # kwa sababu Cloudinary inatumia URLs za dynamic (manifest.json haiwezi kujua zote)

# MEDIA (picha/faili zilizopakiwa na Admin — board photos, gallery, news,
# partners, publication covers/files, n.k.):
#
# Render (na huduma nyingi za "static site"/"web service" za bure) zina
# disk ya "ephemeral" — faili zilizopakiwa kupitia Django Admin ZINAFUTIKA
# kila deploy/restart mpya. Pia Django haihudumii /media/ yenyewe wakati
# DEBUG=False isipokuwa umeweka usanidi wa ziada. Hii ndiyo sababu picha
# zilizopakiwa zilikuwa hazionekani kabisa baada ya deploy.
#
# Suluhisho: Cloudinary (bure — 25GB/mwezi, hauitaji AWS). Ukiwa na
# CLOUDINARY_URL (angalia .env), MEDIA yote (uploads mpya) inaenda
# Cloudinary moja kwa moja — inabaki salama milele, haifutiki kamwe kwa
# deploy. Static files (CSS/JS ya frontend build) HAZIGUSWI - zinabaki
# WhiteNoise kama ilivyokuwa (hizo tayari zinafanya kazi sahihi).
#
# Bila CLOUDINARY_URL (mfano development ya ndani), inarudi kiotomatiki
# kwenye FileSystemStorage ya kawaida (media/ folder ya ndani) — hakuna
# kinachovunjika kwa maendeleo ya ndani.
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

if env("CLOUDINARY_URL", default=""):
    DEFAULT_FILE_STORAGE = "cloudinary_storage.storage.MediaCloudinaryStorage"
    # CLOUDINARY_URL (mfumo: cloudinary://API_KEY:API_SECRET@CLOUD_NAME)
    # inasomwa MOJA KWA MOJA na maktaba ya cloudinary kutoka environment
    # variable - hauitaji kuiweka humu tena. Weka tu kwenye .env / Render
    # Environment Variables.

# Publication.file za PAID: Cloudinary inaunga mkono "authenticated"
# delivery (signed URLs zenye muda wa kuisha) - njia ile ile ya S3 ile
# iliyopendekezwa hapo awali, bila kuhitaji akaunti tofauti ya AWS. Ukifika
# hatua ya paid publications nyingi za thamani, tuambie tuongeze storage
# class maalum (access_mode="authenticated") kwa field hilo moja pekee.

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---------------------------------------------------------------------------
# Email
# ---------------------------------------------------------------------------

if DEBUG:
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
else:
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
    EMAIL_HOST = env("EMAIL_HOST", default="")
    EMAIL_PORT = env.int("EMAIL_PORT", default=587)
    EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)
    EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
    EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")

DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="noreply@tsma.or.tz")

# ---------------------------------------------------------------------------
# Selcom Payment Gateway
# ---------------------------------------------------------------------------

SELCOM_BASE_URL = env("SELCOM_BASE_URL", default="https://apigw.selcommobile.com")
SELCOM_VENDOR_ID = env("SELCOM_VENDOR_ID", default="")
SELCOM_API_KEY = env("SELCOM_API_KEY", default="")
SELCOM_API_SECRET = env("SELCOM_API_SECRET", default="")
SELCOM_WEBHOOK_URL = env(
    "SELCOM_WEBHOOK_URL", default="https://api.tsma.or.tz/api/payments/webhook/selcom/"
)

# ---------------------------------------------------------------------------
# AzamPay Payment Gateway (mobile money mbadala wa Selcom)
# ---------------------------------------------------------------------------

AZAMPAY_AUTH_URL = env(
    "AZAMPAY_AUTH_URL", default="https://authenticator-sandbox.azampay.co.tz"
)
AZAMPAY_CHECKOUT_URL = env("AZAMPAY_CHECKOUT_URL", default="https://sandbox.azampay.co.tz")
AZAMPAY_APP_NAME = env("AZAMPAY_APP_NAME", default="")
AZAMPAY_CLIENT_ID = env("AZAMPAY_CLIENT_ID", default="")
AZAMPAY_CLIENT_SECRET = env("AZAMPAY_CLIENT_SECRET", default="")
# Hiari - jaza tu kama AzamPay watakupa status-check endpoint wakati wa
# onboarding (angalia maelezo kwenye payments/gateways/azampay.py).
AZAMPAY_STATUS_URL = env("AZAMPAY_STATUS_URL", default="")

# ---------------------------------------------------------------------------
# PayPal Payment Gateway (wanachama/washirika wa NJE ya Tanzania - USD)
# ---------------------------------------------------------------------------

PAYPAL_BASE_URL = env("PAYPAL_BASE_URL", default="https://api-m.sandbox.paypal.com")
# PRODUCTION: badilisha PAYPAL_BASE_URL kwenye .env kuwa
# https://api-m.paypal.com ukishathibitisha kila kitu kwenye sandbox.
PAYPAL_CLIENT_ID = env("PAYPAL_CLIENT_ID", default="")
PAYPAL_CLIENT_SECRET = env("PAYPAL_CLIENT_SECRET", default="")
PAYPAL_WEBHOOK_ID = env("PAYPAL_WEBHOOK_ID", default="")
PAYPAL_CURRENCY = env("PAYPAL_CURRENCY", default="USD")
PAYPAL_RETURN_URL = env("PAYPAL_RETURN_URL", default=f"{FRONTEND_URL}/payment/paypal-return")
PAYPAL_CANCEL_URL = env("PAYPAL_CANCEL_URL", default=f"{FRONTEND_URL}/payment/paypal-cancel")

# ---------------------------------------------------------------------------
# Zoom (Teaching Excellence — hiari, default 'manual')
# ---------------------------------------------------------------------------

TEACHING_MEETING_PROVIDER = env("TEACHING_MEETING_PROVIDER", default="manual")
ZOOM_ACCOUNT_ID = env("ZOOM_ACCOUNT_ID", default="")
ZOOM_CLIENT_ID = env("ZOOM_CLIENT_ID", default="")
ZOOM_CLIENT_SECRET = env("ZOOM_CLIENT_SECRET", default="")

# ---------------------------------------------------------------------------
# Sentry (Error Monitoring) — hiari, inawashwa tu kama SENTRY_DSN ipo
# ---------------------------------------------------------------------------

SENTRY_DSN = env("SENTRY_DSN", default="")
if SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration

    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[DjangoIntegration()],
        traces_sample_rate=0.2,
        send_default_pii=False,
        environment="production" if not DEBUG else "development",
    )

# ---------------------------------------------------------------------------
# Security Monitoring app (self-healing + dashboard yenye 2FA)
# ---------------------------------------------------------------------------

# Key TOFAUTI kabisa na SECRET_KEY kuu — inasaini tokens za security
# dashboard pekee. WEKA thamani YAKE MWENYEWE (random, ndefu) kwenye .env —
# USIACHE ikitegemea fallback ya SECRET_KEY kwa production halisi.
SECURITY_ADMIN_SECRET_KEY = env("SECURITY_ADMIN_SECRET_KEY", default="")

# Channels za arifa (email inafanya kazi bila usanidi wa ziada; sms/whatsapp
# ni hiari — angalia security/notifiers/sms_whatsapp.py).
SECURITY_NOTIFICATION_CHANNELS = env.list("SECURITY_NOTIFICATION_CHANNELS", default=["email"])
SECURITY_ALERT_RECIPIENTS = env.list("SECURITY_ALERT_RECIPIENTS", default=[])

AFRICASTALKING_USERNAME = env("AFRICASTALKING_USERNAME", default="")
AFRICASTALKING_API_KEY = env("AFRICASTALKING_API_KEY", default="")

# ---------------------------------------------------------------------------
# Logging — muhimu kwa kuona payment/payout failures (angalia audit #2)
# ---------------------------------------------------------------------------

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "[{asctime}] {levelname} {name}: {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "verbose"},
    },
    "root": {"handlers": ["console"], "level": "INFO"},
    "loggers": {
        "django": {"handlers": ["console"], "level": "INFO", "propagate": False},
        # Logger maalum kwa payments/payouts — hizi ndizo unahitaji kuona
        # kwenye monitoring/alerts (Sentry itazikamata pia moja kwa moja).
        "payments": {"handlers": ["console"], "level": "INFO", "propagate": False},
        "publications": {"handlers": ["console"], "level": "INFO", "propagate": False},
    },
}
