# Mipangilio ya `contact` App

## 1. INSTALLED_APPS

```python
INSTALLED_APPS = [
    # ... zilizopo tayari
    "contact",
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
]
```

## 3. Amri za Kuendesha

```bash
python manage.py makemigrations contact
python manage.py migrate
```

Baada ya migrate, ingia Django Admin → **Contact** → **Taarifa za
Mawasiliano** → jaza namba za simu, WhatsApp na email HALISI za TSMA
(kitaundwa kiotomatiki kimoja cha default ukifungua
`/api/contact/admin/info/` mara ya kwanza, lakini ni bora kukihariri
moja kwa moja Admin badala ya kutegemea default).

---

## Endpoints Mpya (`/api/contact/`)

| Method | Endpoint | Ufikiaji | Maelezo |
|---|---|---|---|
| GET | `/info/` | Public | Simu, WhatsApp, email, anwani + **viungo vinavyobofywa** |
| POST | `/message/` | Public | Tuma ujumbe (fomu ya mawasiliano) |
| GET/PATCH | `/admin/info/` | Board/Super Admin | Hariri taarifa za mawasiliano |
| GET | `/admin/messages/` | Board/Super Admin | Orodha ya ujumbe zote |
| GET/PATCH/DELETE | `/admin/messages/<id>/` | Board/Super Admin | Angalia/futa ujumbe |

## Viungo Vinavyobofywa (Clickable) — MUHIMU kwa Frontend

`GET /api/contact/info/` inarudisha fields hizi ZIKIWA TAYARI kutumika
moja kwa moja kwenye `<a href="...">` — HAKUNA usindikaji wa ziada
unaohitajika upande wa React:

```json
{
  "organization_name": "TSMA",
  "phone_number": "+255712345678",
  "phone_call_link": "tel:+255712345678",
  "whatsapp_number": "255712345678",
  "whatsapp_link": "https://wa.me/255712345678?text=Habari%20TSMA...",
  "email": "info@tsma.or.tz",
  "email_mailto_link": "mailto:info@tsma.or.tz",
  "google_maps_link": "https://www.google.com/maps?q=-6.7924,39.2083",
  "facebook_url": "...",
  "instagram_url": "..."
}
```

### Mfano wa Matumizi kwenye React

```jsx
<a href={contactInfo.phone_call_link}>📞 Piga Simu</a>
<a href={contactInfo.whatsapp_link} target="_blank" rel="noopener noreferrer">💬 WhatsApp</a>
<a href={contactInfo.email_mailto_link}>✉️ Tuma Email</a>
```

Vitatu hivi vitafanya kazi moja kwa moja kwenye simu (kufungua dialer,
WhatsApp app, na Mail app) bila JavaScript ya ziada — ni link za kawaida
za HTML (`tel:`, `https://wa.me/`, `mailto:`).

## Namba za Simu — Muundo Sahihi

Weka namba kwenye Django Admin kwa muundo wa **kimataifa wenye "+"**
(mfano `+255712345678`), siyo `0712345678`. Mfumo unaondoa nafasi/mabano
kiotomatiki kwenye `tel:` link, lakini muundo wa kimataifa ndio
unaohakikisha kadi/simu za kimataifa (wageni wasio Tanzania) zinaweza
kupiga bila matatizo.
