#!/usr/bin/env bash
# Kusasisha backend baada ya kusukuma code mpya GitHub. Endesha kama user `tsma`:
#   bash /srv/tsma/tsma-backend/deploy/update.sh
set -euo pipefail
cd /srv/tsma && git pull
cd tsma-backend
/srv/tsma/venv/bin/pip install -r requirements.txt
/srv/tsma/venv/bin/python manage.py migrate --noinput
/srv/tsma/venv/bin/python manage.py collectstatic --noinput
sudo systemctl restart tsma-gunicorn
echo "Backend imesasishwa. (Frontend: jenga upya kompyuta yako kisha upload - angalia mwongozo.)"
