TSMA — PATCH YA MABADILIKO TU

Imejumuishwa:
- tsma-frontend/src/pages/EditorDashboard.jsx (ukurasa mpya wa /editor)
- tsma-frontend/src/App.jsx (route ya /editor)
- EDITOR_DASHBOARD_GUIDE.md (mwongozo wa dashboard)

Hakuna faili za Publications zilizojumuishwa.

MUHIMU KUHUSU MFA:
Backend tayari ina mtiririko wa TOTP kwa akaunti za Security Dashboard kupitia
/security/auth/login/step1/, /security/auth/login/step2/ na /security/auth/setup-totp/confirm/.
Hii haimaanishi MFA imeunganishwa kwenye login ya kawaida ya /api/auth/login/ au
Editor Dashboard. Usidai MFA ya Editor imewashwa mpaka backend login/API tokens
zimeunganishwa na kujaribiwa. Patch hii haibadilishi authentication ya kawaida,
ili kuepuka kuzuia watumiaji wa sasa kuingia au kuacha API ikiwa katika hali isiyo salama.

Uwekaji:
1. Nakili tsma-frontend/src/App.jsx na tsma-frontend/src/pages/EditorDashboard.jsx
   kwenye frontend yako, ukihifadhi paths hizo.
2. Deploy frontend, ingia kwenye akaunti yenye ruhusa na tembelea /editor.
3. Ruhusa za API lazima ziwe zimewekwa backend; dashboard yenyewe haibadilishi role/permissions.
