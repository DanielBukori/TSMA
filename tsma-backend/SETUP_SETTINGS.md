# Mipangilio ya settings.py — Jinsi ya Kuunganisha `accounts` App

> **SASISHO:** `tsma_backend/settings.py`, `urls.py`, `wsgi.py`, `asgi.py`,
> na `manage.py` HALISI sasa vipo kwenye mzizi wa project hii (siyo
> maelekezo tu) — vinaunganisha apps zote 11 pamoja na security hardening
> (Argon2, django-axes, CSP, JWT blacklist). Faili hii (`SETUP_SETTINGS.md`)
> inabaki kama MAELEZO ya kina ya kila mpangilio, lakini `settings.py`
> halisi ndiyo unayotumika. Nakili `.env.example` kuwa `.env`, jaza
> thamani zako, kisha `python manage.py migrate`.

Ongeza / hakikisha yafuatayo kwenye `tsma_backend/settings.py` ya project yako.

## 1. INSTALLED_APPS

```python
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
    "rest_framework_simplejwt.token_blacklist",  # MUHIMU kwa logout halisi
    "corsheaders",

    # Local apps
    "accounts",
]
```

## 2. Custom User Model (LAZIMA iwekwe kabla ya migration ya kwanza)

```python
AUTH_USER_MODEL = "accounts.User"
```

## 3. Django REST Framework + JWT

```python
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
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "20/minute",
        "user": "100/minute",
    },
}

from datetime import timedelta

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,       # Muhimu: refresh token mpya kila reuse
    "BLACKLIST_AFTER_ROTATION": True,    # Muhimu: token ya zamani inakufa
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
}
```

## 4. Email (kwa verification na password reset)

Kwa maendeleo (development), tumia console backend kuona email terminal-ni:

```python
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
DEFAULT_FROM_EMAIL = "noreply@tsma.or.tz"
FRONTEND_URL = "http://localhost:3000"   # badilisha na domain halisi wakati wa production
```

Kwa production, badilisha na SMTP halisi (mfano Zoho, SendGrid, au Gmail SMTP):

```python
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = "smtp.yourprovider.com"
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = "your-email@tsma.or.tz"
EMAIL_HOST_PASSWORD = "your-app-password"   # weka kwenye environment variable, siyo hardcoded
```

## 5. CORS (kwa React frontend)

```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://tsma.or.tz",   # domain halisi baadaye
]
CORS_ALLOW_CREDENTIALS = True
```

## 6. urls.py kuu ya project

```python
# tsma_backend/urls.py
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    # baadaye: path("api/members/", include("members.urls")), n.k.
]
```

## 7. Amri za Kuendesha (Terminal)

```bash
pip install djangorestframework djangorestframework-simplejwt django-cors-headers

python manage.py makemigrations accounts
python manage.py migrate

python manage.py createsuperuser
```

---

## Endpoints Zilizopo (accounts app)

| Method | Endpoint | Maelezo |
|---|---|---|
| POST | `/api/auth/register/` | Usajili wa mtumiaji mpya |
| POST | `/api/auth/login/` | Login — inarudisha access + refresh token |
| POST | `/api/auth/refresh/` | Kupata access token mpya |
| POST | `/api/auth/logout/` | Logout — inablacklist refresh token |
| GET | `/api/auth/me/` | Profile ya mtumiaji aliye-login |
| PATCH | `/api/auth/me/` | Kuhariri profile |
| POST | `/api/auth/password/change/` | Kubadili password (akiwa login) |
| POST | `/api/auth/password/reset/` | Omba reset link (forgot password) |
| POST | `/api/auth/password/reset/confirm/` | Kamilisha reset ya password |
| POST | `/api/auth/email/verify/` | Thibitisha email baada ya usajili |

## Vipimo vya Haraka (Quick Test na curl)

```bash
# Register
curl -X POST http://localhost:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{"email":"test@tsma.or.tz","first_name":"John","last_name":"Doe","password":"SecurePass123!","password_confirm":"SecurePass123!"}'

# Login
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"test@tsma.or.tz","password":"SecurePass123!"}'

# Me (badilisha <ACCESS_TOKEN>)
curl http://localhost:8000/api/auth/me/ \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```
