# Mipangilio ya `members` na `payments` Apps

## 1. INSTALLED_APPS — ongeza hizi

```python
INSTALLED_APPS = [
    # ... zilizopo tayari (accounts, n.k.)
    "django.contrib.contenttypes",  # tayari ipo kwa default — hakikisha ipo

    "members",
    "payments",
]
```

## 2. MEDIA (kwa ajili ya digital card images)

```python
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
```

Kwenye `urls.py` kuu (development tu — production itumie Nginx/S3):

```python
from django.conf import settings
from django.conf.urls.static import static

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

## 3. Selcom Settings

Weka hizi kwenye `settings.py` (au environment variables — USIWEKE moja kwa moja
kwenye code kwa production, tumia `python-decouple` au `django-environ`):

```python
SELCOM_BASE_URL = env("SELCOM_BASE_URL", default="https://apigw.selcommobile.com")
SELCOM_VENDOR_ID = env("SELCOM_VENDOR_ID")
SELCOM_API_KEY = env("SELCOM_API_KEY")
SELCOM_API_SECRET = env("SELCOM_API_SECRET")
SELCOM_WEBHOOK_URL = env(
    "SELCOM_WEBHOOK_URL", default="https://api.tsma.or.tz/api/payments/webhook/selcom/"
)
```

**Upatikanaji wa credentials:** Sajili Merchant/Vendor account kupitia
Selcom (https://selcommobile.com au wasiliana na Selcom Business Team) ili
kupata `VENDOR_ID`, `API_KEY`, `API_SECRET` za Sandbox kwanza, kisha Production.

**MUHIMU:** Endpoints na majina ya fields kwenye `payments/gateways/selcom.py`
ni muundo wa jumla wa Selcom Checkout API. Kabla ya kwenda live, thibitisha
dhidi ya nyaraka rasmi za Selcom za sasa (zinaweza kubadilika kidogo) au omba
Postman collection kutoka kwa Selcom Developer Support.

## 4. urls.py kuu ya project

```python
urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/members/", include("members.urls")),
    path("api/payments/", include("payments.urls")),
]
```

## 5. Requirements mpya

```bash
pip install Pillow qrcode requests --break-system-packages
```

## 6. Amri za Kuendesha

```bash
python manage.py makemigrations members payments
python manage.py migrate

# Weka madaraja ya awali ya uanachama (Guest, Institution, Lecturer, n.k.)
python manage.py seed_membership_tiers
```

---

## Endpoints Mpya

### Members (`/api/members/`)

| Method | Endpoint | Ufikiaji | Maelezo |
|---|---|---|---|
| GET | `/tiers/` | Public | Orodha ya madaraja yanayopatikana |
| POST | `/join/` | Auth | Jiunge na daraja + anzisha malipo |
| GET | `/me/` | Auth | Wasifu wangu wa uanachama |
| GET | `/` | Board/Super Admin | Orodha ya wanachama wote |
| GET | `/verify/<code>/` | Public | Thibitisha kadi (QR scan) |
| GET/POST | `/admin/tiers/` | Board/Super Admin | Ona/ongeza madaraja |
| GET/PATCH/DELETE | `/admin/tiers/<id>/` | Board/Super Admin | Hariri/futa daraja (BADILI ADA HAPA, siyo kwenye code) |

### Payments (`/api/payments/`)

| Method | Endpoint | Ufikiaji | Maelezo |
|---|---|---|---|
| POST | `/webhook/selcom/` | Selcom (server-to-server) | Callback ya malipo |
| GET | `/my-transactions/` | Auth | Historia yangu ya malipo |
| GET | `/status/<internal_reference>/` | Auth | Angalia hali ya malipo (poll fallback) |

## Mfano wa Mtiririko Kamili (Join Membership)

```bash
# 1. Ona madaraja yanayopatikana
curl http://localhost:8000/api/members/tiers/

# 2. Jiunge (mtumiaji akiwa amelogin, ana access token)
curl -X POST http://localhost:8000/api/members/join/ \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"tier_id": 3, "phone_number": "0712345678", "gateway": "selcom", "payment_method": "mobile_money"}'

# Jibu litakuwa na "instructions": "Angalia simu yako kwa ujumbe wa USSD..."
# Mtumiaji ataweka PIN yake kwenye simu, Selcom itatuma webhook,
# member.activate() + digital card itazalishwa automatiki.

# 3. Angalia status ya malipo (kama webhook haijafika bado)
curl http://localhost:8000/api/payments/status/TSMA-XXXXXXXXXXXX/ \
  -H "Authorization: Bearer <ACCESS_TOKEN>"

# 4. Angalia wasifu wa uanachama (baada ya malipo kufanikiwa)
curl http://localhost:8000/api/members/me/ \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

## Jinsi ya Kuongeza Gateway Mpya Baadaye (mfano AzamPay)

1. Unda `payments/gateways/azampay.py`, andika class `AzamPayGateway(PaymentGatewayBase)`.
2. Fungua `payments/gateways/registry.py`, ongeza mstari mmoja:
   ```python
   from .azampay import AzamPayGateway
   _REGISTRY[Gateway.AZAMPAY] = AzamPayGateway
   ```
3. Hakuna sehemu nyingine ya mfumo (`members`, `views`, `models`) inayohitaji kuguswa.

## Jinsi Bosi Anavyobadili Ada/Madaraja Bila Kugusa Code

Django Admin → **Members** → **Madaraja ya Uanachama** → hariri `annual_fee`,
`name`, `description`, `is_active` kwa daraja lolote, au bonyeza "Add" kuongeza
daraja jipya kabisa. Mabadiliko yanaonekana mara moja kwenye `/api/members/tiers/`
na frontend, bila deployment mpya.
