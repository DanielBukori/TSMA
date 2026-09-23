# TSMA Frontend

React (Vite) + Tailwind CSS + i18next (Kiswahili/English) frontend ya
Tanzania Sports Management Association (TSMA), iliyoundwa kuunganishwa
na backend ya Django tuliyojenga awali (`accounts`, `members`, `payments`,
`board`, `news`, `gallery`, `contact`, `publications`, `conferences`,
`teaching`).

## Kuanzisha (Setup)

```bash
npm install
cp .env.example .env
# hariri .env kuweka VITE_API_BASE_URL sahihi (backend URL)
npm run dev
```

Fungua http://localhost:5173

## Muundo wa Project

```
src/
  api/client.js          - Axios client (imeunganishwa na Django REST API)
  components/            - Vipengele vinavyotumika sehemu nyingi (Navbar, Footer, n.k.)
  pages/                 - Kurasa (Home sasa, nyingine zitaongezwa)
  locales/sw.json         - Tafsiri za Kiswahili
  locales/en.json         - Tafsiri za English
  i18n.js                 - Mipangilio ya lugha (SW/EN, hakuna kuchanganya)
  index.css               - Tailwind + fonts + lane-divider motif
```

## Design System

- **Rangi:** Navy (`#0E2A4A`), Gold (`#D9922E`), Green (`#157A52`),
  Terracotta (`#C1541F`), Cream (`#F3EFE4`) — angalia `tailwind.config.js`
- **Fonti:** Frank Ruhl Libre (vichwa/serif), Nunito Sans (maandishi/sans)
- **Lugha:** Kitufe cha KISWAHILI/ENGLISH cha kudumu juu ya tovuti
  (`LanguageToggle.jsx`) — kinachobadilisha maandishi YOTE mara moja bila
  kuchanganya, na kuhifadhi chaguo (localStorage) kupitia i18next.

## Vipengele vya Animation

- **Hero Slideshow** (`HeroSlideshow.jsx`) — crossfade + Ken Burns zoom
  kila baada ya sekunde 6, na dot indicators za kubofya.
- **Stat Counters** (`StatCounter.jsx`) — namba zinaongezeka kiotomatiki
  (count-up) mara zinapoingia kwenye skrini (IntersectionObserver).
- **Testimonials Carousel** (`Testimonials.jsx`) — crossfade ya kila
  sekunde 5.5, na dot indicators.

## Kuunganisha na Backend

`src/api/client.js` inatumia `VITE_API_BASE_URL` (default:
`http://localhost:8000/api`). `NewsPreview.jsx` tayari inajaribu kuvuta
habari za hivi karibuni kutoka `/api/news/` — ikiwa backend haipatikani,
inaonyesha placeholder content badala ya kuvunjika.

## Auth (JWT) na Members/Payments Flow

Frontend sasa ina mfumo kamili wa uthibitisho:

- `src/context/AuthContext.jsx` — hifadhi ya session (access/refresh tokens
  kwenye localStorage), `login()`, `register()`, `logout()`.
- `src/api/client.js` — axios interceptor inayojaribu ku-refresh access
  token kiotomatiki mara 401 inapotokea (session haikatiki mapema sana).
- `src/components/ProtectedRoute.jsx` — kurasa zinazohitaji login (mfano
  `/dashboard`) zinaelekeza kwenye `/login` kama mtumiaji hajaingia.
- `src/pages/Members.jsx` — mtumiaji anachagua tier, fomu ya malipo
  inatokea papo hapo (simu + gateway), inaita `/api/members/join/`, kisha
  ina-poll `/api/payments/status/<ref>/` kila sekunde 5 mpaka malipo
  yakamilike.
- `src/pages/Dashboard.jsx` — kadi ya kidijitali ya uanachama (`digital_card_image`
  kutoka backend) + historia ya malipo (`/api/payments/my-transactions/`).

## Kuendesha (baada ya npm install)

```bash
npm run dev
```

1. Fungua `/register` kutengeneza akaunti
2. Fungua `/members`, chagua tier, jaza namba ya simu, kamilisha
3. Selcom itatuma USSD push (au checkout link) — kamilisha kwenye simu
4. Rudi kwenye `/dashboard` kuona kadi + historia ya malipo
