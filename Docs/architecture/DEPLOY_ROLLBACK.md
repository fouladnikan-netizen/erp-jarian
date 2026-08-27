# Deploy & Rollback Policy

> **Status:** Foundation policy — effective 2026-08-26.  
> **Related:** [BACKUP_RESTORE.md](./BACKUP_RESTORE.md), [BACKEND_FOUNDATION.md](./BACKEND_FOUNDATION.md), [ENTITY_DELIVERY_PIPELINE.md](./ENTITY_DELIVERY_PIPELINE.md)

---

## Standard deploy path

```text
Git
 ↓
Tests (CI / local quality)
 ↓
Build
 ↓
Pre-deploy checks
 ↓
Database Backup
 ↓
Migration
 ↓
Backend Deploy
 ↓
Backend Health Check (/api/health)
 ↓
Frontend Deploy
 ↓
Smoke Test
 ↓
Post-deploy Verification
```

### Stage notes

| Stage | Expectation |
|-------|-------------|
| Pre-deploy | Entity cards check for Tier A PRs; env secrets present; `VITE_USE_MOCK_API=false` in real envs |
| Database Backup | Fresh or recent dump per [BACKUP_RESTORE.md](./BACKUP_RESTORE.md) |
| Migration | `cd backend && npm run migrate` **before** new API process serves traffic |
| Backend Health | `ok: true` and `db: up` |
| Smoke | Auth login + one Company list + one Order list (or read-by-id) |
| Post-deploy | Soft-deleted rows stay hidden; no 5xx spike; Entity Card routes alive |

Legacy `scripts/deploy.sh` is primarily **frontend/Nginx** today. When API+Postgres are on the same host, operators must insert **backup → migrate → backend restart → health** before/with FE publish until that script is extended.

---

## Migration safety on deploy

- Prefer backward-compatible expand migrations so old and new app versions can briefly coexist.  
- Destructive drops/renames: multi-step across releases (expand → dual-write/read → remove).  
- Never hand-edit production schema.

---

## Rollback (two different tools)

| Failure type | Action |
|--------------|--------|
| Application bug (API/FE) | Rollback **application** release (previous build / previous git). DB usually stays. |
| Failed migration mid-flight | Prefer **forward-fix** migration. If DB is inconsistent and unsafe → **controlled restore** from pre-deploy dump. |
| Data corruption | Controlled DB recovery — not “redeploy hope”. |

**Application rollback ≠ database restore.** Do not restore the DB because a React bundle broke.

---

## Explicit non-goals (this phase)

- Kubernetes / complex CD  
- Automatic DB restore on health-check failure  
- Blue/green for Postgres  

---

## Operator checklist (short)

1. Backup  
2. Migrate  
3. Start/restart API  
4. Health  
5. Deploy FE  
6. Smoke  
7. Verify archive + auth still work  
