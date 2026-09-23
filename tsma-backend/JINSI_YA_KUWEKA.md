# Gateways Zote (Selcom + AzamPay + PayPal + Manual) — Jinsi ya Kuweka

## 1. Nakili faili hizi juu ya zilizopo

```
tsma-backend/payments/models.py                (badilishwa - Gateway.PAYPAL)
tsma-backend/payments/views.py                  (badilishwa - webhook views mpya)
tsma-backend/payments/urls.py                   (badilishwa - webhook paths mpya)
tsma-backend/payments/gateways/base.py          (badilishwa - is_configured())
tsma-backend/payments/gateways/selcom.py        (badilishwa - required_settings)
tsma-backend/payments/gateways/azampay.py       (MPYA)
tsma-backend/payments/gateways/paypal.py        (MPYA)
tsma-backend/payments/gateways/registry.py      (badilishwa - zote zimesajiliwa)
tsma-backend/tsma_backend/settings.py           (badilishwa - env vars mpya)
```

Baada ya kunakili:
```bash
python manage.py makemigrations payments   # kwa ajili ya Gateway.PAYPAL
python manage.py migrate
```

## 2. Jinsi ilivyopangwa (SOMA HII - ndiyo jibu la swali lako)

Gateway zote nne (**Selcom, AzamPay, PayPal, Manual**) tayari zimesajiliwa
kwenye code — hazihitaji kuguswa tena. Lakini kila moja (isipokuwa
Manual) ina orodha ya ".env keys" zinazohitajika ili "ionekane" kwa
mtumiaji wa kawaida:

| Gateway | Funguo za `.env` zinazohitajika |
|---|---|
| Selcom | `SELCOM_VENDOR_ID`, `SELCOM_API_KEY`, `SELCOM_API_SECRET` |
| AzamPay | `AZAMPAY_APP_NAME`, `AZAMPAY_CLIENT_ID`, `AZAMPAY_CLIENT_SECRET` |
| PayPal | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` |
| Manual | Hakuna (daima "imewekwa") |

**Mpaka funguo za gateway fulani zijazwe, gateway HIYO HAIONEKANI kwa
mtumiaji** kwenye fomu ya malipo (`GET /api/payments/gateways/`
inaichuja moja kwa moja) — hii inazuia mtumiaji kubofya "PayPal" leo na
kupata error, kwa sababu bado hazijawekwa. **Ukiingiza funguo kwenye
`.env` na ku-restart backend (`sudo systemctl restart tsma-backend`),
gateway hiyo INAONEKANA YENYEWE** kwenye buttons za mtumiaji — hakuna
mstari WOWOTE wa code unaohitaji kubadilika. Hiyo ndiyo maana uliyoomba:
"nitakuja ku-edit tu kuifanya ifanye kazi."

## 3. .env — funguo za kuongeza baadaye (zote zinaruhusiwa kuwa tupu sasa)

```bash
# --- AzamPay ---
AZAMPAY_AUTH_URL=https://authenticator-sandbox.azampay.co.tz
AZAMPAY_CHECKOUT_URL=https://sandbox.azampay.co.tz
AZAMPAY_APP_NAME=
AZAMPAY_CLIENT_ID=
AZAMPAY_CLIENT_SECRET=
AZAMPAY_STATUS_URL=

# --- PayPal ---
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_WEBHOOK_ID=
PAYPAL_CURRENCY=USD
```

## 4. Maonyo MAWILI ya kweli kabla ya kuwasha live (soma haya kwa makini)

**(a) AzamPay** — Sina uwezo wa kuvinjari mtandao kuthibitisha nyaraka
za sasa za AzamPay (endpoints/field names vinaweza kuwa vimebadilika).
Code imeandikwa kufuata muundo wa jumla unaojulikana, lakini **LAZIMA
uthibitishe dhidi ya sandbox halisi** ukishasajili
developers.azampay.co.tz. Pia: callback ya AzamPay haina signature
iliyoandikwa wazi kwenye nyaraka za umma, kwa hiyo mfumo "haumamini"
webhook peke yake — badala yake unauliza tena AzamPay moja kwa moja
(server-to-server) kupitia `AZAMPAY_STATUS_URL` kabla ya kuthibitisha
malipo. **Bila `AZAMPAY_STATUS_URL`, webhook za AzamPay zitakataliwa kwa
makusudi** (usalama kwanza) — AzamPay watakupa endpoint hii wakati wa
onboarding, uliza wazi.

**(b) PayPal HAIUNGI MKONO TZS** — PayPal inatoza kwa USD (au sarafu
nyingine za kimataifa), SI Shilingi ya Tanzania. Kwa sasa
`PAYPAL_CURRENCY=USD` — ukijaribu kutumia PayPal kwa transaction ya TZS
(mfano ada ya uanachama iliyowekwa TZS), mfumo utakataa kwa makusudi
badala ya kutoza kiasi kibaya. PayPal inafaa zaidi kwa **wanachama/
washirika wa NJE ya Tanzania** wanaotaka kulipa kwa dola — si mbadala wa
Selcom/AzamPay kwa mobile money ya ndani. Ukihitaji PayPal itoze TZS
moja kwa moja, tutahitaji kuongeza exchange-rate conversion kabla ya
hapo (bado haijajengwa).

## 5. "Mitandao ya simu" na "Bank" — tayari zimeshughulikiwa

Kama tulivyoongea awali: Tigo/Airtel/M-Pesa/Halopesa SI gateways
tofauti — zinapitia Selcom AU AzamPay (aggregator moja inatambua
mtandao kutoka namba ya simu). "Bank" (malipo ya benki/mkono)
inashughulikiwa na gateway ya **Manual** uliyoshaijengewa mapema —
haihitaji funguo yoyote, tayari inafanya kazi.

## 6. Webhook URLs mpya (kwa AzamPay/PayPal developer dashboards)

```
https://api.tsma.or.tz/api/payments/webhook/azampay/
https://api.tsma.or.tz/api/payments/webhook/paypal/
```
