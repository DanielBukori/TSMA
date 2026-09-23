# Usalama wa Ziada — Kuunganisha Packages za `requirements.txt`

Baada ya `pip install -r requirements.txt`, ongeza mipangilio hii kwenye
`settings.py` ili packages za usalama zifanye kazi (siyo tu kuwa
zimesakinishwa).

## 1. Secrets kwa Environment Variables (django-environ)

```python
# settings.py - juu kabisa
import environ

env = environ.Env()
environ.Env.read_env(BASE_DIR / ".env")  # soma faili la .env (usiliweke kwenye Git)

SECRET_KEY = env("DJANGO_SECRET_KEY")
DEBUG = env.bool("DJANGO_DEBUG", default=False)
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS", default=[])

DATABASES = {
    "default": env.db("DATABASE_URL"),  # mfano: postgres://user:pass@host:5432/dbname
}

SELCOM_VENDOR_ID = env("SELCOM_VENDOR_ID")
SELCOM_API_KEY = env("SELCOM_API_KEY")
SELCOM_API_SECRET = env("SELCOM_API_SECRET")
```

Tengeneza `.env` (na uongeze `.env` kwenye `.gitignore` — USIWAHI kui-commit):

```bash
DJANGO_SECRET_KEY=badilisha-hii-na-random-key-ndefu-sana
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=api.tsma.or.tz
DATABASE_URL=postgres://tsma_user:password@localhost:5432/tsma_db
SELCOM_VENDOR_ID=...
SELCOM_API_KEY=...
SELCOM_API_SECRET=...
```

## 2. Argon2 Password Hashing (imara zaidi ya default)

```python
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",  # fallback kwa akaunti za zamani
]
```

## 3. django-axes (Brute-Force / Credential Stuffing Protection)

```python
INSTALLED_APPS = [
    # ...
    "axes",
]

AUTHENTICATION_BACKENDS = [
    "axes.backends.AxesBackend",  # LAZIMA iwe ya KWANZA kwenye orodha
    "django.contrib.auth.backends.ModelBackend",
]

MIDDLEWARE = [
    # ...
    "axes.middleware.AxesMiddleware",  # weka mwishoni kabisa
]

AXES_FAILURE_LIMIT = 5          # funga baada ya majaribio 5 yasiyofanikiwa
AXES_COOLOFF_TIME = 1           # saa 1 kabla ya kujaribu tena
AXES_LOCKOUT_PARAMETERS = ["ip_address", "username"]
```

## 4. django-csp (Content-Security-Policy Headers)

```python
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "csp.middleware.CSPMiddleware",
    # ... zilizopo tayari
]

CSP_DEFAULT_SRC = ("'self'",)
CSP_IMG_SRC = ("'self'", "data:", "https:")
CSP_SCRIPT_SRC = ("'self'",)
CSP_STYLE_SRC = ("'self'", "'unsafe-inline'", "https://fonts.googleapis.com")
CSP_FONT_SRC = ("'self'", "https://fonts.gstatic.com")
CSP_CONNECT_SRC = ("'self'", "https://api.tsma.or.tz")
```

## 5. Security Headers za Msingi za Django (bure, zipo tayari)

```python
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
```

## 6. Private File Storage (django-storages + S3) — kwa Paid Publications

```python
INSTALLED_APPS = [
    # ...
    "storages",
]

# Storage ya kawaida (public - board photos, news images, n.k.)
DEFAULT_FILE_STORAGE = "django.core.files.storage.FileSystemStorage"

# Storage MAALUM ya faili za PAID publications (private, signed URLs)
AWS_ACCESS_KEY_ID = env("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = env("AWS_SECRET_ACCESS_KEY")
AWS_STORAGE_BUCKET_NAME = env("AWS_STORAGE_BUCKET_NAME")
AWS_S3_REGION_NAME = env("AWS_S3_REGION_NAME", default="af-south-1")
AWS_DEFAULT_ACL = None
AWS_QUERYSTRING_EXPIRE = 300  # signed URL inaisha muda baada ya dakika 5
```

Kisha kwenye `publications/models.py`, badilisha `Publication.file` kutumia
storage hii maalum badala ya default (`storages.backends.s3boto3.S3Boto3Storage`
yenye `default_acl="private"`).

## 7. Sentry (Error Monitoring + Alerts)

```python
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration

sentry_sdk.init(
    dsn=env("SENTRY_DSN", default=""),
    integrations=[DjangoIntegration()],
    traces_sample_rate=0.2,
    send_default_pii=False,  # USIWAHI kutuma taarifa binafsi za watumiaji kwa Sentry
)
```

## 8. Amri za Ukaguzi wa Usalama (Endesha Mara kwa Mara)

```bash
# Angalia dependencies zenye known vulnerabilities
pip-audit

# Angalia code yenyewe kwa patterns hatari
bandit -r . -x '*/migrations/*,*/tests/*'

# Angalia Django settings dhidi ya best practices za production
python manage.py check --deploy
```

Ni vizuri hizi zifanywe sehemu ya CI/CD (GitHub Actions, GitLab CI, n.k.)
ili kila mabadiliko ya code yakaguliwe kiotomatiki kabla ya deployment.
