# TSMA kwenye Sakurahost VPS (bila Vercel, Render, Neon wala Cloudinary)

Muundo: **server MOJA** yenye Nginx + gunicorn (Django) + Postgres + frontend ya static,
kwenye domain moja (`tsma.or.tz` hapa chini - badilisha kama yako ni tofauti).

## 0. Unachohitaji
1. **Sakurahost VPS** (Ubuntu 22.04/24.04, ufikiaji wa root/SSH). Shared hosting (cPanel) HAIFAI:
   inatoa PHP/MySQL, na Python inapatikana kwenye VPS (root access) tu; mradi huu unatumia Postgres.
2. **Domain** na uwezo wa kuweka DNS: rekodi `A` ya `tsma.or.tz` na `www` -> IP ya VPS.
3. Kompyuta yako yenye Node.js (kujenga frontend) na Git.

## 1. Server: usalama wa msingi (kama root)
```bash
apt update && apt upgrade -y
apt install -y ufw git nginx postgresql python3-venv python3-dev build-essential libpq-dev \
               certbot python3-certbot-nginx
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable
adduser --disabled-password --gecos "" tsma
mkdir -p /srv/tsma && chown tsma:tsma /srv/tsma
echo 'tsma ALL=(root) NOPASSWD: /bin/systemctl restart tsma-gunicorn' > /etc/sudoers.d/tsma
```

## 2. Database
```bash
sudo -u postgres psql -c "CREATE USER tsma WITH PASSWORD 'WEKA_PASSWORD_KALI';"
sudo -u postgres psql -c "CREATE DATABASE tsma OWNER tsma;"
# kwa backup ya cron (pg_dump bila kuuliza password):
echo "127.0.0.1:5432:tsma:tsma:WEKA_PASSWORD_KALI" > /home/tsma/.pgpass
chown tsma:tsma /home/tsma/.pgpass && chmod 600 /home/tsma/.pgpass
```

## 3. Code (kama user `tsma`)
```bash
su - tsma
git clone https://github.com/Daniel-bukori/TSMA.git /srv/tsma    # repo ikiwa private: tumia deploy key au token
python3 -m venv /srv/tsma/venv
/srv/tsma/venv/bin/pip install -r /srv/tsma/tsma-backend/requirements.txt
cp /srv/tsma/tsma-backend/deploy/env.production.example /srv/tsma/tsma-backend/.env
nano /srv/tsma/tsma-backend/.env && chmod 600 /srv/tsma/tsma-backend/.env
```
Katika `.env`: weka `DJANGO_SECRET_KEY` mpya, password ya database, na **usiweke `CLOUDINARY_URL`**
(ikiwa tupu, faili zote zinahifadhiwa kwenye `/srv/tsma/tsma-backend/media`).

```bash
cd /srv/tsma/tsma-backend
/srv/tsma/venv/bin/python manage.py migrate
/srv/tsma/venv/bin/python manage.py collectstatic --noinput
/srv/tsma/venv/bin/python manage.py createsuperuser
/srv/tsma/venv/bin/python manage.py seed_membership_tiers --retire-old
# hiari (maudhui ya mwanzo): seed_about_content, seed_home_stats, seed_page_banners
```

## 4. gunicorn + Nginx + SSL (kama root)
```bash
cp /srv/tsma/tsma-backend/deploy/tsma-gunicorn.service /etc/systemd/system/
systemctl daemon-reload && systemctl enable --now tsma-gunicorn
systemctl status tsma-gunicorn          # lazima iseme "active (running)"

cp /srv/tsma/tsma-backend/deploy/nginx-tsma.conf /etc/nginx/sites-available/tsma
ln -s /etc/nginx/sites-available/tsma /etc/nginx/sites-enabled/tsma
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

certbot --nginx -d tsma.or.tz -d www.tsma.or.tz   # DNS lazima iwe imeshaelekeza kwenye IP ya VPS
```

## 5. Frontend (kwenye kompyuta yako)
```bash
cd tsma-frontend
echo "VITE_API_BASE_URL=https://tsma.or.tz/api" > .env.production
npm ci && npm run build            # inatengeneza folda ya dist/
rsync -av --delete dist/ tsma@IP_YA_VPS:/srv/tsma/frontend-dist/
```
`vercel.json` haihitajiki tena (Nginx ina `try_files` yake). Ukiisasisha frontend, rudia hatua hii tu.

## 6. Cron na backup (kama root)
```bash
cat > /etc/cron.d/tsma <<'CRON'
*/30 * * * * tsma cd /srv/tsma/tsma-backend && /srv/tsma/venv/bin/python manage.py expire_stale_manual_payments >> /var/log/tsma-cron.log 2>&1
15 2 * * *   tsma /srv/tsma/tsma-backend/deploy/backup.sh
CRON
touch /var/log/tsma-cron.log && chown tsma /var/log/tsma-cron.log
```
Backup zinakaa `/srv/tsma/backups`. **Zinakili pia nje ya server** (kompyuta yako au Google Drive) - server ikiharibika, zote mbili zitapotea.

## 7. Thibitisha kila kitu kinafanya kazi
1. `https://tsma.or.tz` inafunguka (lock ya SSL), `https://tsma.or.tz/admin/` inaingia.
2. Admin: **Taarifa za Malipo ya Mkono (Manual)** - jaza benki, jina la akaunti, namba ya akaunti, WhatsApp.
3. Pakia picha kwenye Admin: kiungo chake kianze na `https://tsma.or.tz/media/...` (SI `res.cloudinary.com`).
4. Jiunge kama mwanachama wa majaribio, thibitisha malipo kwenye Admin: kadi na risiti zitengenezwe na zifunguke.
5. Scan QR ya kadi: ifungue `https://tsma.or.tz/verify-member/<code>`.
6. Fungua `https://tsma.or.tz/media/student_ids/x.jpg` - lazima itoe 404 (folda nyeti imefungwa).
7. Rejesha ID ya Student: Admin -> Wanachama -> mwanachama Student -> picha ya ID inaonekana.

## 8. Kusasisha baadaye
- Backend: `bash /srv/tsma/tsma-backend/deploy/update.sh` (kama user `tsma`).
- Frontend: hatua ya 5.

## 9. Kuhamisha data kutoka Neon (kama ina data ya kuhifadhi)
```bash
pg_dump "NEON_CONNECTION_STRING" --no-owner --no-acl -Fc -f neon.dump
pg_restore --no-owner -h 127.0.0.1 -U tsma -d tsma neon.dump     # fanya kabla ya hatua ya seed
```
Picha zilizopakiwa Render (ephemeral) zilishapotea; zipakie tena kupitia Admin.

## 10. Baada ya kuhamia kwa uhakika
Elekeza DNS kwa VPS, hakikisha hatua ya 7 imepita, kisha futa/zima Vercel project, Render service, na Neon project.
Akaunti ya Cloudinary haihitajiki (hukuweka kabisa).
