# Security Monitoring Dashboard — "TSMA Guardian" (Phase 1)

Mfumo wa self-healing + arifa za hatari + dashibodi yenye login/2FA
YAKE TOFAUTI kabisa na akaunti za kawaida za TSMA. Umejengwa kwa muundo
unaoweza kutolewa (extract) kuwa bidhaa yake tofauti baadaye — app hii
(`security/`) haina utegemezi mgumu (hard dependency) kwenda apps
nyingine, apps nyingine ndizo zinazoiita YENYEWE (`security.services.log_event`).

## Jinsi Inavyofanya Kazi (Self-Healing)

```
Tukio la hatari (webhook bandia, brute-force, n.k.)
        ↓
security.services.log_event(...)
        ↓
SecurityEvent imehifadhiwa
        ↓
Je, imefikisha kiwango cha auto-block? (mfano webhooks 3 mbovu
ndani ya dakika 15 kutoka IP moja)
        ↓ Ndiyo
IP inazuiwa MARA MOJA kwa SAA 1 (kiotomatiki — hii ndiyo "self-healing")
        ↓
PendingApprovalAction inatengenezwa: "Idhinisha block iwe ya kudumu?"
        ↓
Arifa (email/SMS) inatumwa kwa SECURITY_ALERT_RECIPIENTS
        ↓
Operator anaingia kwenye dashibodi (2FA) na kuamua: Idhinisha (kudumu)
au Kataa (block inabaki ya muda, itajifungua yenyewe baada ya saa 1)
```

Block za muda zinajifungua ZENYEWE (self-healing halisi — huhitaji
kuzikumbuka) — `is_ip_blocked()` inafuta rekodi ya block iliyoisha muda
mara inapoangaliwa.

## Amri za Kuendesha

```bash
python manage.py makemigrations security
python manage.py migrate

# Tengeneza operator wa kwanza (utaulizwa password kwenye terminal)
python manage.py create_security_operator \
    --email security@tsma.or.tz --name "Jina Lako" --superuser
```

Weka kwenye `.env`:
```
SECURITY_ADMIN_SECRET_KEY=key-tofauti-kabisa-na-DJANGO_SECRET_KEY
SECURITY_NOTIFICATION_CHANNELS=email
SECURITY_ALERT_RECIPIENTS=wewe@tsma.or.tz
```

## Mtiririko wa Login (2FA ya LAZIMA)

```bash
# Hatua 1: Email + Password
curl -X POST http://localhost:8000/api/security/auth/login/step1/ \
  -d '{"email":"security@tsma.or.tz","password":"..."}'

# Ikiwa 2FA bado haijasanidiwa, jibu litakuwa na "qr_code_svg" —
# scan kwa Google Authenticator/Authy, kisha:
curl -X POST http://localhost:8000/api/security/auth/setup-totp/confirm/ \
  -d '{"pre_2fa_token":"...", "totp_code":"123456"}'

# Mara zijazo (2FA tayari imesanidiwa) — Hatua 2: TOTP code
curl -X POST http://localhost:8000/api/security/auth/login/step2/ \
  -d '{"pre_2fa_token":"...", "totp_code":"123456"}'

# Jibu: {"token": "...", "operator": {...}}
# Tumia kwenye maombi yote yajayo:
curl http://localhost:8000/api/security/summary/ \
  -H "Authorization: Operator <token>"
```

Kumbuka: header ni `Authorization: Operator <token>` (SIYO `Bearer`) —
kimakusudi tofauti na JWT za accounts.User, kuzuia mkanganyiko/matumizi
mabaya ya token kati ya mifumo miwili.

## Endpoints za Dashibodi

| Method | Endpoint | Maelezo |
|---|---|---|
| GET | `/api/security/summary/` | Namba za haraka (matukio 24h, blocks active, pending approvals) |
| GET | `/api/security/events/` | Orodha ya matukio (`?severity=critical&reviewed=false`) |
| GET | `/api/security/blocked-ips/` | IP zilizozuiwa sasa |
| POST | `/api/security/blocked-ips/<id>/unblock/` | Fungua IP kabla ya muda |
| GET | `/api/security/pending-actions/` | Hatua zinazosubiri idhini |
| POST | `/api/security/pending-actions/<id>/decide/` | Idhinisha/kataa (superuser operator pekee) |

## Jinsi ya Kuongeza Aina Mpya ya Tukio la Hatari

1. Ongeza `SecurityEventType` mpya kwenye `security/models.py`.
2. Popote kwenye code (mfano `teaching/views.py` kama mtu anajaribu kupata
   quiz bila enrollment), ongeza:
   ```python
   from security.models import SecurityEventType, SecuritySeverity
   from security.services import get_client_ip, log_event

   log_event(
       event_type=SecurityEventType.UNAUTHORIZED_ACCESS_ATTEMPT,
       severity=SecuritySeverity.MEDIUM,
       ip_address=get_client_ip(request),
       description="...",
   )
   ```
3. (Hiari) Ongeza rule ya auto-block kwenye `_AUTO_BLOCK_RULES` ndani ya
   `security/services.py`.

## Hatua Zinazofuata (Phase 2/3, ukiendelea)

- **SMS/WhatsApp** — jaza `AFRICASTALKING_*` credentials, ongeza `"sms"`
  kwenye `SECURITY_NOTIFICATION_CHANNELS`.
- **Frontend Dashboard** — endpoints zote tayari zipo; ukurasa wa React
  wa `/security-dashboard` (na login/2FA yake tofauti kabisa na tovuti
  kuu ya TSMA) unaweza kujengwa ukiwa tayari.
- **AI Analysis Layer** — endpoint mpya (mfano `/api/security/ai-summary/`)
  inayochukua SecurityEvents za hivi karibuni na kuzipeleka kwa AI
  (Claude API) kutengeneza muhtasari wa kibinadamu ("Kuna mashambulizi 3
  ya brute-force leo, yote kutoka mkoa mmoja wa mtandao — inapendekezwa
  ufuatilie...") — msingi (SecurityEvent data) tayari upo tayari kwa hili.
- **Extraction kuwa bidhaa tofauti** — kwa sababu `security/` haina
  dependency ngumu kwenda apps nyingine za TSMA (isipokuwa `log_event()`
  calls ambazo apps nyingine zinafanya KWENDA humu, siyo kinyume chake),
  inaweza kuhamishwa kuwa package yake yenye jina lake (mfano
  `django-guardian-tsma` au chochote) kwa mabadiliko madogo.
