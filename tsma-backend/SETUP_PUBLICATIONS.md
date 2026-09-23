# Mipangilio ya `publications` App

## 1. INSTALLED_APPS

```python
INSTALLED_APPS = [
    # ... zilizopo tayari
    "publications",
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
]
```

## 3. Amri za Kuendesha

```bash
python manage.py makemigrations publications
python manage.py migrate
```

---

## Endpoints Mpya (`/api/publications/`)

| Method | Endpoint | Ufikiaji | Maelezo |
|---|---|---|---|
| GET | `/` | Public | Orodha (`?q=`, `?category=`, `?author=`, `?year=`, `?member_only=`) |
| GET | `/categories/` | Public | Kategoria za machapisho |
| GET | `/<slug>/` | Public | Chapisho kamili — `file` inaonekana tu kama una ruhusa |
| GET | `/<slug>/download/` | Public/Member | Inathibitisha ruhusa, inarudisha download URL |
| POST | `/abstracts/submit/` | Auth | Wasilisha kazi ya kitaaluma (kwa conference) |
| GET | `/abstracts/mine/` | Auth | Uwasilishaji wangu na hali zake |
| GET/POST | `/admin/` | Content Editor+ | Pakia chapisho jipya |
| GET/PATCH/DELETE | `/admin/<id>/` | Content Editor+ | Hariri/futa chapisho |
| GET | `/admin/abstracts/` | Board/Super Admin | Orodha ya abstracts zote (`?status=pending`) |
| GET/PATCH | `/admin/abstracts/<id>/` | Board/Super Admin | Hakiki: badilisha status + review_notes |

## Jinsi "Member-Only Content" Inavyofanya Kazi

- `Publication.is_member_only=True` → chapisho linaonekana kwenye orodha
  na maelezo (title, abstract, mwandishi) kwa **kila mtu**, lakini `file`
  (kiungo cha kupakua) kinarudi `null` kwa asiye mwanachama active.
- `GET /<slug>/download/` inaangalia moja kwa moja `Member.is_active_member`
  (kutoka `members` app) — kama si active, inarudisha `403 Forbidden` na
  ujumbe wa kumwelekeza kujiunga.
- Board/Super Admin wanapita ukaguzi huu moja kwa moja (kwa ajili ya
  kusimamia/kuangalia bila kulipia).

## Injini ya Utafutaji — Mfano

```bash
GET /api/publications/?q=uongozi&category=uongozi-wa-michezo&year=2026&author=John
```

## Abstract Submission — Mtiririko

1. Mwanachama/mtumiaji anatuma `POST /abstracts/submit/` (title, authors,
   abstract_text, keywords, faili la ziada la hiari).
2. Status ya awali ni `pending`.
3. Board/Super Admin anapitia `GET /admin/abstracts/?status=pending`,
   anahakiki, kisha `PATCH /admin/abstracts/<id>/` kubadilisha status
   kuwa `accepted`, `rejected`, au `revision_required` + `review_notes`.
4. Mtumiaji anaangalia hali yake kupitia `GET /abstracts/mine/`.
