#!/usr/bin/env bash
# Backup ya kila siku: database + media. Hifadhi 14 za mwisho.
# MUHIMU: nakala iliyo kwenye server ileile haitoshi - nakili pia nje ya server (scp/rclone/Google Drive).
set -euo pipefail
DEST=/srv/tsma/backups
mkdir -p "$DEST"
STAMP=$(date +%F)
pg_dump -U tsma -h 127.0.0.1 tsma | gzip > "$DEST/db-$STAMP.sql.gz"
tar -czf "$DEST/media-$STAMP.tar.gz" -C /srv/tsma/tsma-backend media 2>/dev/null || true
find "$DEST" -type f -mtime +14 -delete
