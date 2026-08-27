#!/usr/bin/env bash
# Daily / on-demand PostgreSQL backup for Jarian.
# Credentials via env only — never commit secrets.
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/jarian}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="${BACKUP_DIR}/jarian-${STAMP}.dump"
LOG_TAG="[jarian-backup]"

mkdir -p "${BACKUP_DIR}"

if [[ -n "${DATABASE_URL:-}" ]]; then
  echo "${LOG_TAG} dumping via DATABASE_URL → ${OUT}"
  pg_dump --format=custom --file="${OUT}" "${DATABASE_URL}"
else
  : "${PGDATABASE:?Set DATABASE_URL or PGDATABASE}"
  echo "${LOG_TAG} dumping ${PGDATABASE} → ${OUT}"
  pg_dump --format=custom --file="${OUT}"
fi

# prune old dumps
find "${BACKUP_DIR}" -name 'jarian-*.dump' -type f -mtime "+${RETENTION_DAYS}" -print -delete || true

echo "${LOG_TAG} OK ${OUT} size=$(wc -c < "${OUT}" | tr -d ' ') bytes"
exit 0
