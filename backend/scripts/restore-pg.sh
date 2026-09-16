#!/usr/bin/env bash
# Explicit restore — NEVER auto-run on production.
# Usage:
#   CONFIRM_RESTORE=YES TARGET_DATABASE=jarian_restore ./restore-pg.sh /path/to/jarian-….dump
set -euo pipefail

DUMP="${1:-}"
if [[ -z "${DUMP}" || ! -f "${DUMP}" ]]; then
  echo "Usage: CONFIRM_RESTORE=YES TARGET_DATABASE=<db> $0 /path/to/dump" >&2
  exit 1
fi

if [[ "${CONFIRM_RESTORE:-}" != "YES" ]]; then
  echo "Refusing: set CONFIRM_RESTORE=YES to proceed." >&2
  exit 1
fi

TARGET="${TARGET_DATABASE:-}"
if [[ -z "${TARGET}" ]]; then
  echo "Refusing: set TARGET_DATABASE (prefer a non-prod name first)." >&2
  exit 1
fi

echo "[jarian-restore] restoring ${DUMP} → database ${TARGET}"
# Create DB if missing (ignore error if exists)
createdb "${TARGET}" 2>/dev/null || true
pg_restore --clean --if-exists --no-owner --dbname="${TARGET}" "${DUMP}"
echo "[jarian-restore] OK — verify app against ${TARGET} before any prod cutover"
