# Mipangilio ya `sitecontent` App (Maudhui ya About)

## 1. INSTALLED_APPS

```python
INSTALLED_APPS = [
    # ... zilizopo tayari
    "sitecontent",
]
```

## 2. urls.py kuu ya project

```python
urlpatterns = [
    # ... zote zilizopo tayari
    path("api/content/", include("sitecontent.urls")),
]
```

## 3. Amri za Kuendesha

```bash
python manage.py makemigrations sitecontent
python manage.py migrate
python manage.py seed_page_banners
```

`seed_page_banners` inaweka vichwa vya kurasa (badge/title/subtitle) ambavyo
vilikuwa vimeandikwa ndani ya kila ukurasa — si maudhui mapya. Maudhui ya
About (Historia, Dira, Core Values, Milestones) hayaundwi yakiwa ya mfano:
tupu hadi Admin/Editor aizaeze kupitia Django Admin, na ukurasa unaonyesha
hali ya "hakuna kitu bado" badala ya data ya uongo.

---

## Endpoints (`/api/content/`)

| Method | Endpoint | Ufikiaji | Maelezo |
|---|---|---|---|
| GET | `/about/` | Public | Historia, Dira, Dhamira, Values, Milestones (SW+EN zote pamoja) |
| GET/PATCH | `/admin/about/` | Board/Super Admin | Hariri Historia/Dira/Dhamira |
| GET/POST | `/admin/values/` | Board/Super Admin | Ongeza Core Value mpya |
| GET/PATCH/DELETE | `/admin/values/<id>/` | Board/Super Admin | Hariri/futa Core Value |
| GET/POST | `/admin/milestones/` | Board/Super Admin | Ongeza Milestone mpya |
| GET/PATCH/DELETE | `/admin/milestones/<id>/` | Board/Super Admin | Hariri/futa Milestone |

## Jinsi Admin Anavyohariri (Bila Kugusa Code)

Django Admin → **Site Content**:
- **Maudhui ya About** — hariri Historia (SW+EN), Dira, Dhamira. Hii ni
  singleton (rekodi moja tu) — haiwezekani kuongeza ya pili.
- **Imani/Thamani (Core Values)** — ongeza/hariri/futa/panga upya thamani
  za taasisi (icon ni herufi/namba fupi, si emoji).
- **Hatua za Kihistoria (Milestones)** — ongeza mwaka mpya na maelezo
  wakati wowote kitu kikitokea (mfano mkutano mpya, mafanikio mapya).

## Picha Zinazohitajika kwa Ukurasa wa About (Shot List)

1. **Hero background** (1920×800px) — picha ya tukio kubwa la TSMA (kundi
   la watu kwenye mkutano, au uwanja/jengo la ofisi). Itawekwa nyuma ya
   maandishi ya kichwa, kwa hiyo iwe na eneo giza/gradient-friendly upande
   mmoja kwa usomaji mzuri wa maandishi meupe.
2. **History section image** (800×600px, hiari) — picha ya kihistoria
   (mfano picha ya uzinduzi wa TSMA, au kikao cha kwanza cha bodi).
3. **Core Values icons** — hazihitaji picha (zinatumia emoji), lakini
   zinaweza kubadilishwa na icons halisi (SVG) baadaye ukiwa nazo.

Frontend (`About.jsx`) tayari ina maeneo (comments) yaliyoainishwa
yanayoonyesha ni wapi picha hizi zitawekwa.
