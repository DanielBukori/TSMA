# Mipangilio ya `news` na `gallery` Apps

## 1. INSTALLED_APPS

```python
INSTALLED_APPS = [
    # ... zilizopo tayari (accounts, members, payments, board)
    "news",
    "gallery",
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
]
```

## 3. Amri za Kuendesha

```bash
python manage.py makemigrations news gallery
python manage.py migrate
```

---

## Endpoints Mpya

### News (`/api/news/`)

Muundo wa "post" (kama YouTube Community/Instagram): **maelezo (content)
ni ya lazima, kichwa (title) na picha ni HIARI**. Chapisho linaweza kuwa
na picha 0, 1, au nyingi (carousel).

| Method | Endpoint | Ufikiaji | Maelezo |
|---|---|---|---|
| GET | `/` | Public | Feed ya machapisho (support: `?q=`, `?category=`, `?year=`, `?month=`) |
| GET | `/categories/` | Public | Orodha ya kategoria |
| GET | `/<slug>/` | Public | Chapisho kamili (+ inaongeza view count) |
| GET/POST | `/admin/` | Content Editor+ | Andika chapisho jipya (+ picha, hiari) |
| GET/PATCH/DELETE | `/admin/<id>/` | Content Editor+ | Hariri/futa/chapisha |
| GET/PATCH/DELETE | `/admin/images/<id>/` | Content Editor+ | Hariri mpangilio/futa picha moja |

**Kutuma chapisho lenye picha kadhaa (multipart/form-data):**

```bash
curl -X POST http://localhost:8000/api/news/admin/ \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -F "content=TSMA imeshiriki mkutano wa kimataifa leo!" \
  -F "is_published=true" \
  -F "uploaded_images=@photo1.jpg" \
  -F "uploaded_images=@photo2.jpg" \
  -F "uploaded_images=@photo3.jpg"
```

Chapisho bila picha kabisa ni sahihi pia — acha `uploaded_images` wazi.
Chapisho bila kichwa (title) pia ni sahihi — kama post ya kawaida ya
mtandao wa kijamii, `content` (maelezo) ndiyo ya lazima pekee.


### Gallery (`/api/gallery/`)

| Method | Endpoint | Ufikiaji | Maelezo |
|---|---|---|---|
| GET | `/` | Public | Orodha ya albamu (support: `?year=`) |
| GET | `/<slug>/` | Public | Albamu + picha zote (kwa lightbox) |
| GET/POST | `/admin/albums/` | Content Editor+ | Tengeneza albamu mpya |
| GET/PATCH/DELETE | `/admin/albums/<id>/` | Content Editor+ | Hariri/futa albamu |
| POST | `/admin/images/` | Content Editor+ | Pakia picha moja ndani ya albamu |
| GET/PATCH/DELETE | `/admin/images/<id>/` | Content Editor+ | Hariri caption/futa picha |

**Kumbuka:** Kwenye Django Admin, `GalleryAlbum` ina "inline" ya kuongeza
picha nyingi mara moja unapotengeneza/kuhariri albamu — huhitaji kutumia
API ya `/admin/images/` isipokuwa kwa React admin dashboard.

## Mfano wa Kupakia Picha Nyingi kwa Wakati Mmoja (Frontend)

React inaweza kutuma multiple `POST /api/gallery/admin/images/` (moja kwa
kila picha, ikiwa na `album` id ile ile) kwa kutumia `Promise.all()` —
hii inaruhusu progress bar ya "picha 3/10 zimepakiwa" kwenye admin dashboard.
