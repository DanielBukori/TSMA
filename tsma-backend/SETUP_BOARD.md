# Mipangilio ya `board` App

## 1. INSTALLED_APPS

```python
INSTALLED_APPS = [
    # ... zilizopo tayari (accounts, members, payments)
    "board",
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
]
```

## 3. Amri za Kuendesha

```bash
python manage.py makemigrations board
python manage.py migrate
```

Hakuna package mpya inayohitajika (tunatumia `ImageField` iliyopo tayari
kwa sababu ya `Pillow` iliyoshasakinishwa kwa ajili ya digital cards).

---

## Endpoints Mpya (`/api/board/`)

| Method | Endpoint | Ufikiaji | Maelezo |
|---|---|---|---|
| GET | `/` | Public | Orodha ya wanabodi wote (kadi/cards) |
| GET | `/founders/` | Public | Sehemu maalum ya waanzilishi |
| GET | `/<id>/` | Public | Wasifu kamili wa mjumbe (kwa modal/expand) |
| GET/POST | `/admin/` | Board/Super Admin | Ona wote (hata wasio-active), ongeza mpya |
| GET/PATCH/DELETE | `/admin/<id>/` | Board/Super Admin | Hariri/futa mjumbe |

## Jinsi Bosi/Board Admin Anavyoongeza Mjumbe Mpya

Njia mbili:
1. **Django Admin** — `/admin/` → Board → Wanabodi → "Add Board Member".
2. **API** — POST `/api/board/admin/` (kwa mfumo wa React admin dashboard baadaye).

`display_order` inatumika kupanga mpangilio wa kuonekana (mfano Chairman
kwanza), na `is_founder=True` inaweka mjumbe kwenye sehemu maalum ya
"Founders" kama roadmap ilivyoainisha.
