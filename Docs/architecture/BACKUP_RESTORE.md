# Backup & Restore Policy (PostgreSQL)

> **Status:** Foundation policy — effective 2026-08-26.  
> **Related:** [BACKEND_FOUNDATION.md](./BACKEND_FOUNDATION.md), [DEPLOY_ROLLBACK.md](./DEPLOY_ROLLBACK.md), [ENTITY_DELIVERY_PIPELINE.md](./ENTITY_DELIVERY_PIPELINE.md)

Postgres is now the system of record. **Code correctness without recoverable data is not production-ready.**

---

## Goals (this phase)

| Goal | Requirement |
|------|-------------|
| Daily backup | Automated `pg_dump` (custom or plain+gzip) |
| Timestamped files | `jarian-YYYYMMDD-HHMMSS.dump` (or `.sql.gz`) |
| Compression | Yes (`-Fc` or gzip) |
| Retention | Keep ≥ 7 daily on server; keep ≥ 1 copy off-box |
| Success/failure signal | Script exit code + log line; cron mail/alert optional |
| Credentials | Env / `.pgpass` / systemd EnvironmentFile — **never commit secrets** |
| Restore documented | Explicit script; never auto-restore on prod |
| Off-site ready | Directory layout allows rsync/S3 copy without rewriting dump format |

---

## Current foundation scripts

| Script | Role |
|--------|------|
| `backend/scripts/backup-pg.sh` | `pg_dump` → `$BACKUP_DIR` |
| `backend/scripts/restore-pg.sh` | Explicit restore into a target DB (confirmation required) |

Configure via environment (see `backend/.env.example` comments):

- `DATABASE_URL` or `PGHOST` / `PGUSER` / `PGDATABASE` / `PGPASSWORD`
- `BACKUP_DIR` (default `/var/backups/jarian`)
- `BACKUP_RETENTION_DAYS` (default `7`)

### Example cron (server)

```cron
15 2 * * * BACKUP_DIR=/var/backups/jarian /opt/erp-jarian/backend/scripts/backup-pg.sh >> /var/log/jarian-backup.log 2>&1
```

Copy dumps off-server daily (rsync, object storage, etc.). **Single-disk-only backup is not sufficient.**

---

## Restore procedure (manual)

1. Stop writers (API) if restoring production.  
2. Choose dump file.  
3. Restore into a **scratch** DB first when learning; production only with explicit approval.  
4. Run `backend/scripts/restore-pg.sh /path/to/dump` (script refuses without `CONFIRM_RESTORE=YES`).  
5. Run migrate if needed (usually dump already includes schema).  
6. Verify: `/api/health`, login, sample Company/Order read, archived rows still archived.  

**Restore is never the default reaction to a bad frontend deploy.**

---

## Pre-deploy backup check

Before Tier A migration on a shared/prod DB:

- [ ] Last successful backup age is acceptable (e.g. &lt; 24h) **or** take a fresh dump now  
- [ ] Off-site / second copy path known  
- [ ] Operator knows restore command  

---

## Future: PITR (not required now)

Production target path:

```text
Base Backup + WAL Archiving + Point-in-Time Recovery
```

Current dump-based backups must **not** block PITR later:

- Prefer retaining dump format that can coexist with WAL archive directories  
- Do not invent app-level “undo” instead of DB recovery  
- When funded: enable `archive_mode`, ship WAL off-box, document RPO/RTO  

---

## Out of scope now

- Full managed PITR setup  
- Multi-region replication  
- Automatic restore on failure  
