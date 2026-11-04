# Malipo ya Manual (benki + WhatsApp) — Jinsi ya Kuweka

## 1. Jinsi vyenzo vya malipo vinavyochagua
- **Manual** iko wazi kila wakati — haihitaji kitu kwenye env.
- Selcom, AzamPay, PayPal na Snippe zinaonekana kwenye dropdown **mara tu
  funguo zake halisi zikiwa zimekwe** kwenye Render (`SELCOM_*`, `AZAMPAY_*`,
  `PAYPAL_*`, `SNIPPE_*`). Thamani kama `CHANGE_ME` au tupu hazihesabiwi kuwa
  funguo — gateway inabaki imezimika.
- Kuzima gateway ambayo funguo zake zipo: `DISABLED_PAYMENT_GATEWAYS=snippe`
  (tenganisha kwa koma) kisha u-redeploy.
- API hukataa gateway ambayo haipo; mtumiaji hawezi kuiomba kwa kulandiza URL.
- Mtu akichagua Manual anaona kadi yenye: benki, jina la akaunti, namba ya
  akaunti, reference, namba ya WhatsApp, kitufe la "Fungua WhatsApp", na
  ujumbe wa kuthibitisha ndani ya masaa 24. Namba ya simu haiombwi tena.

## 2. Hatua za kuweka (Render)
1. Weka faili zilizobadilika kwenye repo, kisha push.
2. Hakuna env variable inayolazimika kwa manual.
3. Ingia `https://<backend>/admin/` -> **Taarifa za Malipo ya Mkono (Manual)**
   na ujaze: Jina la Benki, Jina la Akaunti, Namba ya Akaunti, Namba ya
   WhatsApp, Muda wa kuthibitisha (24). Kama hapo juu kuna tupu, mtumiaji
   ataona "Taarifa za akaunti ya benki za TSMA bado hazijawekwa" badala ya
   namba za uongo.

## 3. Jinsi ya kuthibitisha malipo
Njia ya kawaida ni dashibodi ya **Treasurer/Accountant** (`/finance`):
orodha ya malipo yanayosubiri uthibitisho, kitufe cha **Thibitisha**,
**Kataa** (kinahitaji sababu) na **Reprocess** ikiwa uthibitisho wa baada ya
malipo ulishindwa. Njia hizi ni `/api/finance/...` na zinafungwa kwa role ya
accountant (au Super Admin) yenye uthibitisho wa hatua mbili.

Django Admin bado inaweza: Malipo (Transactions) -> chagua malipo -> Action
**"Thibitisha malipo yamepokelewa (manual pekee)"**. Malipo yaliyoisha muda
(expired) yanaruhusiwa pia kama mtu alilipa kuchelewa.

Uthibitisho unawezesha uanachama, kadi ya kidijitali na risiti za conference.

Ili malipo yasiyothibitishwa yaishe baada ya masaa 24, endesha mara kwa mara
(cron/Render Cron Job): `python manage.py expire_stale_manual_payments`
