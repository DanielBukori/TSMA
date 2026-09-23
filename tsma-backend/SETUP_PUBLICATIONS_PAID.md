# Publications — Free / Member-Only / Paid + Automated Author Payout

## Muhtasari wa Mabadiliko

`Publication.is_member_only` (boolean) imebadilishwa kuwa
`Publication.access_type` (chaguo tatu): `free`, `member_only`, `paid`.

Kwa machapisho ya **PAID**:
- Admin anaweka `price`, `currency`, `author_payout_name`,
  `author_payout_phone_number` kwenye chapisho husika.
- Mtu YEYOTE aliye-login (hata asiye mwanachama) ananunua kupitia
  `POST /api/publications/<slug>/purchase/`.
- Malipo yakifanikiwa (Selcom webhook → `payment_succeeded` signal):
  1. `PublicationPurchase` inawekwa `completed`.
  2. Mfumo unahesabu commission kwa kutumia
     `PublicationCommissionSettings.default_commission_percent`
     (asilimia MOJA ya kudumu, Admin anaiweka mahali pamoja).
  3. Mfumo unatuma sehemu ya mwandishi **MOJA KWA MOJA** kwa
     `author_payout_phone_number` kupitia Selcom Disbursement API
     (`payments.services.disburse_payout`).
  4. `payout_status` inawekwa `paid` (mafanikio) au `failed` (Admin
     anaona kwenye Django Admin na kushughulikia kwa mkono).

## MUHIMU — Selcom Disbursement API

Payout (B2C — kutuma fedha) ni bidhaa TOFAUTI na Checkout API (C2B —
kupokea fedha) tuliyotumia kwa membership/conferences. Selcom mara nyingi
inahitaji akaunti maalum ya "Disbursement/Payout" (uidhinishwaji wa ziada
kutoka Selcom Business Team), tofauti na Merchant account ya kawaida.

**Kabla ya kwenda live na payout ya kiotomatiki:**
1. Wasiliana na Selcom kupata Disbursement/Payout account na credentials.
2. Thibitisha endpoint (`/v1/disbursement/payout`) na muundo wa payload
   dhidi ya nyaraka za sasa za Selcom — niliandika kwa kufuata muundo wa
   jumla wa Selcom API, lakini sina uwezo wa kuthibitisha real-time.
3. Fanya majaribio (sandbox) kabla ya kutumia na fedha halisi.

**Fallback ya usalama:** Ikiwa payout itashindwa (mfano akaunti ya
Disbursement haijawashwa bado), mnunuzi bado anapata ufikiaji wa chapisho
mara moja (malipo yake yamekamilika), na `payout_status=failed` inaonekana
kwenye Django Admin (Publications → Ununuzi wa Machapisho) — Admin
analipa mwandishi kwa mkono kisha anaweza kubadilisha status.

## Amri za Kuendesha

```bash
python manage.py makemigrations payments publications
python manage.py migrate
```

Baada ya migrate, ingia Django Admin → **Publications** → **Mipangilio ya
Commission** → weka asilimia (default: 20.00%).

---

## Endpoints Mpya/Zilizobadilika

| Method | Endpoint | Ufikiaji | Maelezo |
|---|---|---|---|
| GET | `/api/publications/?access_type=paid` | Public | Chuja kwa aina ya ufikiaji |
| POST | `/api/publications/<slug>/purchase/` | Auth | Nunua chapisho la PAID |
| GET | `/api/publications/my-purchases/` | Auth | Machapisho niliyonunua |
| GET/PATCH | `/api/publications/admin/commission-settings/` | Board/Super Admin | Weka % ya commission |
| GET | `/api/publications/admin/purchases/` | Board/Super Admin | Mauzo yote (`?payout_status=failed`) |

## Mfano wa Mtiririko

```bash
# 1. Nunua chapisho la PAID
curl -X POST http://localhost:8000/api/publications/some-paper/purchase/ \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "0712345678", "gateway": "selcom", "payment_method": "mobile_money"}'

# 2. Malipo yakifanikiwa (webhook), mfumo unatuma payout moja kwa moja
#    kwa mwandishi, na mnunuzi anaweza kupakua:
curl http://localhost:8000/api/publications/some-paper/download/ \
  -H "Authorization: Bearer <TOKEN>"

# 3. Admin anaangalia mauzo/payouts
curl http://localhost:8000/api/publications/admin/purchases/?payout_status=failed \
  -H "Authorization: Bearer <BOARD_ADMIN_TOKEN>"
```
