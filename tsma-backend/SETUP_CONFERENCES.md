# Mipangilio ya `conferences` App

## 1. INSTALLED_APPS

```python
INSTALLED_APPS = [
    # ... zilizopo tayari
    "conferences",
]
```

## 2. urls.py kuu ya project

```python
urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/members/", include("members.urls")),
    path("api/payments/", include("payments.urls")),
    path("api/board/", include("board.urls")),
    path("api/news/", include("news.urls")),
    path("api/gallery/", include("gallery.urls")),
    path("api/contact/", include("contact.urls")),
    path("api/publications/", include("publications.urls")),
    path("api/conferences/", include("conferences.urls")),
]
```

## 3. Amri za Kuendesha

```bash
python manage.py makemigrations conferences
python manage.py migrate
```

---

## Endpoints Mpya (`/api/conferences/`)

### Public

| Method | Endpoint | Maelezo |
|---|---|---|
| GET | `/` | Orodha ya mikutano (`?status=upcoming` au `?status=past`) |
| GET | `/<slug>/` | Mkutano kamili — ajenda (siku+vikao) + aina za tiketi |

### Usajili (Authenticated)

| Method | Endpoint | Maelezo |
|---|---|---|
| POST | `/<slug>/register/` | Jisajili mwenyewe (mara moja tu kwa mkutano huu) |
| POST | `/<slug>/register-bulk/` | Sajili washiriki wengi (taasisi/shirika) |
| GET | `/my-registrations/` | Usajili wangu wote (self + bulk niliyofanya) |

### Check-in (Board/Super Admin — staff wa mlangoni)

| Method | Endpoint | Maelezo |
|---|---|---|
| POST | `/check-in/` | Scan QR — inarudisha `allowed: true/false` |

### Admin — Kusimamia Mkutano/Ajenda/Tiketi (Board/Super Admin)

| Method | Endpoint | Maelezo |
|---|---|---|
| GET/POST | `/admin/` | Tengeneza mkutano mpya |
| GET/PATCH/DELETE | `/admin/<id>/` | Hariri/futa mkutano |
| GET/POST | `/admin/days/` | Ongeza siku za mkutano |
| GET/POST | `/admin/sessions/` | Ongeza vikao (ajenda) |
| GET/POST | `/admin/ticket-types/` | Ongeza aina za tiketi/bei |
| GET | `/<slug>/analytics/` | Dashboard: waliojisajili/waliolipa/waliofika |

**Njia rahisi zaidi:** Tumia Django Admin (`/admin/`) → Conferences —
inline forms zinaruhusu kuongeza siku, vikao, na aina za tiketi zote
kwenye ukurasa mmoja unapotengeneza mkutano.

## Mfano wa Mtiririko Kamili

```bash
# 1. Ona mkutano na ajenda yake
curl http://localhost:8000/api/conferences/asma-2026/

# 2a. Self-registration
curl -X POST http://localhost:8000/api/conferences/asma-2026/register/ \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"ticket_type_id": 2, "phone_number": "0712345678"}'

# 2b. Bulk registration (taasisi)
curl -X POST http://localhost:8000/api/conferences/asma-2026/register-bulk/ \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "organization_name": "Chuo Kikuu cha Dodoma",
    "phone_number": "0712345678",
    "attendees": [
      {"ticket_type_id": 2, "full_name": "John Doe", "email": "john@udom.ac.tz"},
      {"ticket_type_id": 3, "full_name": "Jane Doe", "email": "jane@udom.ac.tz"}
    ]
  }'

# 3. Baada ya malipo kufanikiwa (webhook), kila mshiriki anapata e-receipt
#    yenye QR yake (angalia /my-registrations/ au email — barua pepe
#    inaweza kuongezwa baadaye kwa kutuma e_receipt_image kama attachment)

# 4. Check-in mlangoni (scan QR)
curl -X POST http://localhost:8000/api/conferences/check-in/ \
  -H "Authorization: Bearer <STAFF_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"verification_code": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"}'

# 5. Dashboard ya waandaaji
curl http://localhost:8000/api/conferences/asma-2026/analytics/ \
  -H "Authorization: Bearer <BOARD_ADMIN_TOKEN>"
```

## Vitu Muhimu vya Kukumbuka

- **Self-registration mara moja tu** — inasimamiwa na `UniqueConstraint`
  ya database (`conference` + `registered_by` + `is_self_registration=True`),
  siyo tu ukaguzi wa juu-juu wa code — hivyo haiwezekani kupitishwa hata
  kwa race conditions.
- **Bulk registration haina ukomo** — taasisi moja (akaunti moja) inaweza
  kufanya batch nyingi za usajili kwa watu tofauti.
- **E-receipt + QR kwa kila mshiriki** — hata kama wamelipiwa pamoja
  (bulk), kila mmoja anapata risiti na QR yake ya kipekee
  (`verification_code`) inayozalishwa mara malipo yanapofanikiwa.
- **Check-in ni idempotent-safe** — mshiriki akijaribu ku-scan mara ya
  pili, mfumo unakataa (`409 Conflict`) na kuonyesha muda alioingia awali.
