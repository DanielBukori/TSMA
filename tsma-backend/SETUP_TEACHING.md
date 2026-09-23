# Mipangilio ya `teaching` App (Teaching Excellence)

## 1. INSTALLED_APPS

```python
INSTALLED_APPS = [
    # ... zilizopo tayari
    "teaching",
]
```

## 2. Meeting Provider Settings

```python
# Default: "manual" — Admin anabandika Zoom/Meet link mwenyewe.
# Badilisha kuwa "zoom" TU baada ya kuwa na Zoom Server-to-Server OAuth app.
TEACHING_MEETING_PROVIDER = env("TEACHING_MEETING_PROVIDER", default="manual")

# Zinahitajika TU kama TEACHING_MEETING_PROVIDER="zoom"
ZOOM_ACCOUNT_ID = env("ZOOM_ACCOUNT_ID", default="")
ZOOM_CLIENT_ID = env("ZOOM_CLIENT_ID", default="")
ZOOM_CLIENT_SECRET = env("ZOOM_CLIENT_SECRET", default="")
```

**Jinsi ya kupata Zoom Server-to-Server OAuth credentials (bure):**
1. `https://marketplace.zoom.us/` → Develop → Build App → "Server-to-Server OAuth"
2. Jaza maelezo ya app, pata `Account ID`, `Client ID`, `Client Secret`
3. Ongeza scope: `meeting:write:admin` (au `meeting:write` kulingana na toleo la Zoom API)
4. Weka credentials kwenye `.env`, badilisha `TEACHING_MEETING_PROVIDER=zoom`

**Kama huna muda/hutaki kushughulikia Zoom API sasa** — usifanye chochote,
`manual` ndiyo default, na inafanya kazi kikamilifu: Admin anabandika link
ya Zoom/Meet aliyotengeneza mwenyewe kwenye Django Admin.

## 3. urls.py kuu ya project

```python
urlpatterns = [
    # ... zote zilizopo tayari
    path("api/teaching/", include("teaching.urls")),
]
```

## 4. Amri za Kuendesha

```bash
python manage.py makemigrations teaching
python manage.py migrate
```

---

## Endpoints Mpya (`/api/teaching/`)

### Public/Member

| Method | Endpoint | Ufikiaji | Maelezo |
|---|---|---|---|
| GET | `/courses/` | Public | Orodha ya kozi |
| GET | `/courses/<slug>/` | Public | Kozi + vikao (+ progress kama umelogin) |
| POST | `/courses/<slug>/enroll/` | Auth | Jiunge na kozi |
| GET | `/sessions/` | Public | Vikao vyote (`?course=<slug>`) |
| GET | `/sessions/<slug>/` | Auth | Kikao kamili + **meeting_link** (auth pekee) |
| POST | `/sessions/<slug>/complete/` | Auth | Weka umekamilisha kikao |
| GET | `/quizzes/<id>/` | Auth | Pata maswali (bila majibu sahihi) |
| POST | `/quizzes/<id>/submit/` | Auth | Wasilisha majibu — inahesabu alama + cheti |
| GET | `/my-progress/` | Auth | Dashboard: kozi, vyeti, majaribio ya quiz |
| GET | `/certificates/verify/<code>/` | Public | Thibitisha cheti (QR scan) |

### Admin (Content Editor+)

| Method | Endpoint | Maelezo |
|---|---|---|
| GET/POST/PATCH/DELETE | `/admin/courses/` | Simamia kozi |
| GET/POST/PATCH/DELETE | `/admin/sessions/` | Simamia vikao (+ meeting link) |
| GET/POST/PATCH/DELETE | `/admin/quizzes/` | Simamia quiz |
| GET/POST/PATCH/DELETE | `/admin/questions/` | Ongeza maswali |
| GET/POST/PATCH/DELETE | `/admin/choices/` | Ongeza chaguo (kwa MC/True-False) |

**Njia rahisi zaidi:** Django Admin → Teaching Excellence — inline forms
zinaruhusu kuongeza maswali na chaguo zote kwenye ukurasa mmoja wa Quiz.

## Aina za Maswali (QuestionType)

| Aina | Jinsi Inavyohesabiwa |
|---|---|
| `multiple_choice` | Chagua `QuizChoice` moja sahihi (`is_correct=True`) |
| `true_false` | Chagua kutoka choices mbili (Kweli/Sio Kweli) — muundo sawa na MC |
| `short_answer` | `correct_short_answer` field kwenye swali — inalinganishwa (case-insensitive) |

## Mtiririko Kamili wa Quiz + Cheti

```bash
# 1. Pata maswali
curl http://localhost:8000/api/teaching/quizzes/5/ \
  -H "Authorization: Bearer <TOKEN>"

# 2. Wasilisha majibu
curl -X POST http://localhost:8000/api/teaching/quizzes/5/submit/ \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "answers": [
      {"question_id": 1, "choice_id": 3},
      {"question_id": 2, "choice_id": 7},
      {"question_id": 3, "text_answer": "Michezo"}
    ]
  }'

# Jibu litarudisha score_percent na passed:true/false.
# Kama passed:true, Certificate inatengenezwa MOJA KWA MOJA (QR + namba).

# 3. Angalia dashboard yangu (vyeti + progress)
curl http://localhost:8000/api/teaching/my-progress/ \
  -H "Authorization: Bearer <TOKEN>"
```

## Muundo wa "Kozi Hiari" (Kama Ulivyoomba)

- Admin anaweza kuunda `Course` na kuweka `Session` kadhaa ndani yake
  (`session.course = <course>`) — hii ndiyo "curriculum".
- Au Admin anaweza kuunda `Session` moja moja bila `course` kabisa
  (`session.course = None`) — kikao kinasimama peke yake.
- Vivyo hivyo `Quiz` inaweza kuunganishwa na `course` (quiz ya mwisho ya
  kozi nzima) AU `session` moja (quiz ya kikao kimoja) — angalau moja
  kati ya hizo mbili lazima iwepo (inathibitishwa na serializer).
