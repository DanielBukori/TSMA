# Malipo ya Manual (benki + WhatsApp) — Jinsi ya Kuweka

## 1. Nini kimebadilika
- Kwa default, **Manual ndiyo njia PEKEE** inayoonekana na kukubaliwa na API
  (`ENABLED_PAYMENT_GATEWAYS=manual`). Selcom/AzamPay/PayPal/Snippe bado
  zipo kwenye code, lakini zimezimwa.
- Mtu akichagua malipo (Uanachama, Conference au Chapisho) anaona **kadi**
  yenye: benki, jina la akaunti, namba ya akaunti, reference, namba ya
  WhatsApp, kitufe cha "Fungua WhatsApp", na ujumbe wa kuthibitisha ndani
  ya masaa 24.
- Namba ya simu haiombwi tena kwa Manual.

## 2. Hatua za kuweka (Render)
1. Weka faili zilizobadilika kwenye repo, kisha push (Render itajenga upya,
   Vercel pia).
2. Hakuna env variable mpya inayolazimika (default ni manual). Ukitaka iwe
   wazi, weka `ENABLED_PAYMENT_GATEWAYS=manual`.
3. Ingia `https://<backend>/admin/` -> **Taarifa za Malipo ya Mkono (Manual)**
   na ujaze: Jina la Benki, Jina la Akaunti, Namba ya Akaunti, Namba ya
   WhatsApp, Muda wa kuthibitisha (24). Bila hatua hii, mtumiaji ataona
   ujumbe "Taarifa za akaunti ya benki za TSMA bado hazijawekwa".

## 3. Jinsi ya kuthibitisha malipo
Django Admin -> Malipo (Transactions) -> chagua malipo -> Action
**"Thibitisha malipo yamepokelewa (manual pekee)"**. Uanachama unawezeshwa,
kadi ya kidijitali na risiti za conference zinatengenezwa. Sasa inaruhusu
pia malipo yaliyoisha muda (expired) kama mtu alilipa kuchelewa.

Ili malipo yasiyothibitishwa yaishe baada ya masaa 24, endesha mara kwa mara
(cron/Render Cron Job): `python manage.py expire_stale_manual_payments`

## 4. Kuwasha gateways baadaye
1. Weka funguo halisi kwenye Render (mfano `SELCOM_VENDOR_ID`, `SELCOM_API_KEY`,
   `SELCOM_API_SECRET`). Usiache `CHANGE_ME`.
2. Weka `ENABLED_PAYMENT_GATEWAYS=manual,selcom` na u-redeploy.
3. Mtumiaji ataona chaguo zote mbili na kuchagua.
