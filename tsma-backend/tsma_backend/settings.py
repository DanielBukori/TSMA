"""
TSMA Backend — settings.py (Django 5.2 LTS).

Apps: accounts, members, payments, board, management_team, news, gallery,
contact, publications, partners, careers, conferences, teaching,
sitecontent, security.

Security hardening: Argon2, django-axes, django-csp (4.x), JWT blacklist,
Cloudinary (media), WhiteNoise (static), Sentry.

MUHIMU: SECRETS zote zinasomwa kutoka environment variables (.env).
HAKUNA secret iliyowekwa hapa moja kwa moja.

MABADILIKO MAKUU (vs toleo la Django 4.2):
- DATABASES: CONN_MAX_AGE + CONN_HEALTH_CHECKS (kasi: hakuna kufungua
  muunganiko wa Neon kila ombi).
- STORAGES badala ya DEFAULT_FILE_STORAGE / STATICFILES_STORAGE
  (zimeondolewa Django 5.1).
- django-csp 4.x: CONTENT_SECURITY_POLICY badala ya CSP_* settings.
- SECURE_PROXY_SSL_HEADER kwa Render (nyuma ya proxy).
- CACHES iliyo wazi (inatumika na BlockedIPMiddleware cache).
- CORS_PREFLIGHT_MAX_AGE wazi.
"""

from datetime import timedelta
from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(
    DJANGO_DEBUG=(bool, False),
)
# Soma .env kama ipo (production mara nyingi hutumia environment
# variables za mfumo moja kwa moja — zote mbili zinafanya kazi).
env_file = BASE_DIR / ".env"
if env_file.exists():
    environ.Env.read_env(str(env_file))

# ---------------------------------------------------------------------------
# Core
# ---------------------------------------------------------------------------

SECRET_KEY = env("DJANGO_SECRET_KEY")
DEBUG = env("DJANGO_DEBUG")
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])

# Domain kamili ya frontend — emails (verification, password reset),
# QR verification URLs (kadi, vyeti, risiti).
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
    "rest_framework_simplejwt.token_blacklist",  # JWT blacklist (logout halisi)
    "corsheaders",
    "axes",  # brute-force / credential-stuffing protection
    "cloudinary_storage",  # LAZIMA iwe KABLA ya staticfiles
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
    "security",  # Self-healing security monitoring + dashboard
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",  # static files - LAZIMA hapa
    "csp.middleware.CSPMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "security.middleware.BlockedIPMiddleware",  # kataa IP zilizozuiwa
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
# Database (Neon Postgres)
# ---------------------------------------------------------------------------

DATABASES = {
    "default": env.db(
        "DATABASE_URL",
        default="postgres://tsma_user:tsma_password@localhost:5432/tsma_db",
    )
}

# Weka muunganiko wazi kwa sekunde 600 badala ya kufunga/kufungua kila
# ombi (chanzo kikuu cha sekunde 1-2 kwa kila request).
DATABASES["default"]["CONN_MAX_AGE"] = env.int("DB_CONN_MAX_AGE", default=600)
# Hakikisha muunganiko bado hai kabla ya kuutumia tena (Neon husimamisha
# compute ikiwa idle).
DATABASES["default"]["CONN_HEALTH_CHECKS"] = True

# Weka DB_POOLER=True kwenye .env KAMA TU DATABASE_URL yako inatumia host
# ya Neon yenye "-pooler" (PgBouncer, transaction mode).
if env.bool("DB_POOLER", default=False):
    DATABASES["default"]["DISABLE_SERVER_SIDE_CURSORS"] = True

# ---------------------------------------------------------------------------
# Cache (inatumika na BlockedIPMiddleware, throttling)
# ---------------------------------------------------------------------------

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "tsma-default",
    }
}

# ---------------------------------------------------------------------------
# Authentication — Argon2 + django-axes
# ---------------------------------------------------------------------------

AUTHENTICATION_BACKENDS = [
    "axes.backends.AxesBackend",  # LAZIMA iwe ya KWANZA
    "django.contrib.auth.backends.ModelBackend",
]

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",  # fallback ya hashes za zamani
]

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 10}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# Email verification enforcement (hiari)
# DEFAULT True: mtu lazima athibitishe barua pepe kwa OTP kabla ya kuingia.
# Dharura (barua pepe haifanyi kazi): weka REQUIRE_EMAIL_VERIFICATION=False kwenye env,
# au thibitisha mtumiaji kwa mkono kupitia Django Admin (is_email_verified).
REQUIRE_EMAIL_VERIFICATION = env.bool("REQUIRE_EMAIL_VERIFICATION", default=True)

# django-axes: lockout baada ya majaribio 5 yasiyofanikiwa
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
        # Scoped throttle kwa endpoints nyeti (throttle_scope kwenye views):
        "contact_form": "5/hour",
        "password_reset": "5/hour",
        # OTP ya barua pepe (kwa IP). Kila mtumiaji ana kikomo chake pia (accounts/otp.py).
        "otp_request": "10/hour",
        "otp_verify": "30/hour",
        "editor_login": "10/hour",
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
# Frontend (domain nyingine) isome jina halisi la faili wakati wa kupakua PDF
CORS_EXPOSE_HEADERS = ["Content-Disposition"]
CORS_ALLOW_CREDENTIALS = True
# Sekunde 7200 = kikomo cha juu ambacho Chrome inakubali kuhifadhi preflight.
CORS_PREFLIGHT_MAX_AGE = 7200

CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=["http://localhost:5173"])

# ---------------------------------------------------------------------------
# Security Headers (production) — DEBUG=False tu
# ---------------------------------------------------------------------------

# Render (na hosts nyingi) ziko nyuma ya proxy ya HTTPS. Bila mstari huu,
# SECURE_SSL_REDIRECT inaweza kusababisha redirect zisizoisha / ombi la ziada.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = False  # DRF+JWT haitumii CSRF kwa API calls za JWT

# django-csp 4.x — Content-Security-Policy
CONTENT_SECURITY_POLICY = {
    "DIRECTIVES": {
        "default-src": ["'self'"],
        "img-src": ["'self'", "data:", "https:"],
        "script-src": ["'self'"],
        "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        "font-src": ["'self'", "https://fonts.gstatic.com"],
        "connect-src": ["'self'", *CORS_ALLOWED_ORIGINS],
    }
}

# ---------------------------------------------------------------------------
# Internationalization
# ---------------------------------------------------------------------------

LANGUAGE_CODE = "sw"
TIME_ZONE = "Africa/Dar_es_Salaam"
USE_I18N = True
USE_TZ = True

# ---------------------------------------------------------------------------
# Static / Media Files (STORAGES — Django 4.2+, LAZIMA kwa 5.1+)
# ---------------------------------------------------------------------------

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
WHITENOISE_MANIFEST_STRICT = False  # Cloudinary URLs ni dynamic

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# MEDIA (uploads za Admin: board photos, gallery, news, partners,
# publications...). Render ina disk ya ephemeral, kwa hiyo Cloudinary
# inatumika ikiwa CLOUDINARY_URL ipo (cloudinary://KEY:SECRET@CLOUD_NAME,
# inasomwa moja kwa moja na maktaba kutoka environment). Bila hiyo
# (development ya ndani), inarudi kwenye FileSystemStorage.
CLOUDINARY_URL = env("CLOUDINARY_URL", default="")

_MEDIA_BACKEND = (
    "cloudinary_storage.storage.MediaCloudinaryStorage"
    if CLOUDINARY_URL
    else "django.core.files.storage.FileSystemStorage"
)

STORAGES = {
    "default": {"BACKEND": _MEDIA_BACKEND},
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

# Publication.file za PAID: Cloudinary inaunga mkono "authenticated"
# delivery (signed URLs zenye muda wa kuisha) — ongeza storage class
# maalum (access_mode="authenticated") kwa field hilo pekee ukifika hatua
# hiyo.

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---------------------------------------------------------------------------
# Email
# ---------------------------------------------------------------------------

# EMAIL_PROVIDER:
#   smtp  (default) - SMTP ya kawaida (Gmail, Sakurahost, Brevo SMTP...) - EMAIL_HOST n.k.
#   brevo           - API ya Brevo kupitia HTTPS (BREVO_API_KEY). Tumia hii kwenye Render
#                     ya BURE, kwa sababu Render inazuia ports zote za SMTP.
# Wakati wa maendeleo (DJANGO_DEBUG=True) barua pepe zinaandikwa kwenye terminal (console),
# kwa hiyo OTP unaiona hapo.
EMAIL_PROVIDER = env("EMAIL_PROVIDER", default="smtp").lower()
BREVO_API_KEY = env("BREVO_API_KEY", default="")

if DEBUG:
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
elif EMAIL_PROVIDER == "brevo":
    EMAIL_BACKEND = "common.email_backends.BrevoEmailBackend"
else:
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
    EMAIL_HOST = env("EMAIL_HOST", default="")
    EMAIL_PORT = env.int("EMAIL_PORT", default=587)
    EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)
    EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
    EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")

DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="noreply@tsma.or.tz")

# ---------------------------------------------------------------------------
# Gateways zinazoruhusiwa kuonekana na kutumika (kuwasha/kuzima BILA kubadili code)
# ---------------------------------------------------------------------------
# DEFAULT = "manual" pekee (Malipo ya Mkono: akaunti ya benki + WhatsApp).
# Gateway nyingine (selcom, azampay, paypal, snippe) zinaweza kuwa
# zimesajiliwa kwenye registry.py na hata zina funguo kwenye .env, lakini
# HAZITAONEKANA wala kukubaliwa na API mpaka uziweke hapa.
# Kuwasha baadaye: Render -> Environment -> ENABLED_PAYMENT_GATEWAYS=manual,selcom
ENABLED_PAYMENT_GATEWAYS = [
    g.strip().lower()
    for g in env.list("ENABLED_PAYMENT_GATEWAYS", default=["manual"])
    if g.strip()
]

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
# Hiari - jaza kama AzamPay watakupa status-check endpoint.
AZAMPAY_STATUS_URL = env("AZAMPAY_STATUS_URL", default="")

# ---------------------------------------------------------------------------
# PayPal Payment Gateway (wanachama/washirika wa NJE ya Tanzania - USD)
# ---------------------------------------------------------------------------

PAYPAL_BASE_URL = env("PAYPAL_BASE_URL", default="https://api-m.sandbox.paypal.com")
# PRODUCTION: badilisha PAYPAL_BASE_URL kuwa https://api-m.paypal.com
# ukishathibitisha kila kitu kwenye sandbox.
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
# Sentry (Error Monitoring) — inawashwa tu kama SENTRY_DSN ipo
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
# dashboard pekee. WEKA thamani YAKE MWENYEWE (random, ndefu) kwenye .env.
SECURITY_ADMIN_SECRET_KEY = env("SECURITY_ADMIN_SECRET_KEY", default="")

# Channels za arifa (email inafanya kazi bila usanidi wa ziada).
SECURITY_NOTIFICATION_CHANNELS = env.list("SECURITY_NOTIFICATION_CHANNELS", default=["email"])
SECURITY_ALERT_RECIPIENTS = env.list("SECURITY_ALERT_RECIPIENTS", default=[])

AFRICASTALKING_USERNAME = env("AFRICASTALKING_USERNAME", default="")
AFRICASTALKING_API_KEY = env("AFRICASTALKING_API_KEY", default="")

# ---------------------------------------------------------------------------
# Logging — muhimu kwa kuona payment/payout failures
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
        "payments": {"handlers": ["console"], "level": "INFO", "propagate": False},
        "publications": {"handlers": ["console"], "level": "INFO", "propagate": False},
    },
}
