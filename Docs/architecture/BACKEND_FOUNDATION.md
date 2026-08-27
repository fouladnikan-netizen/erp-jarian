# Backend Foundation — Migration, Transactions, Errors, Archive

> **Status:** Active baseline for `backend/` v1+.  
> **Related:** [BACKEND_V1.md](./BACKEND_V1.md), [CLIENT_STATE_SSOT.md](./CLIENT_STATE_SSOT.md), [ENTITY_DELIVERY_PIPELINE.md](./ENTITY_DELIVERY_PIPELINE.md), [BACKUP_RESTORE.md](./BACKUP_RESTORE.md), [DEPLOY_ROLLBACK.md](./DEPLOY_ROLLBACK.md)

Check these four areas **before** adding new aggregates or going to production.

---

## 1. Migration strategy

| Rule | Implementation |
|------|----------------|
| Sequential files | `backend/src/db/migrations/001_init.sql`, `002_…`, never rename applied files |
| Tracking | `schema_migrations` table |
| Apply | `npm run migrate` (each file in one DB transaction) |
| Deploy | Run migrate **before** starting API on every deploy |
| Never | Edit a migration already applied in prod — add `00N_fix_…sql` instead |
| Rollback | No automatic down migrations v1; restore from backup + forward fix migration |

**Commands**

```bash
cd backend && npm run migrate   # apply pending
```

**Adding a migration**

1. Create `backend/src/db/migrations/00X_description.sql`
2. Test locally on fresh + existing DB
3. Document breaking changes in this file or BACKEND_V1

---

## 2. Transaction handling

| Scope | Policy |
|-------|--------|
| Single INSERT/UPDATE | One statement — OK without explicit transaction |
| Multi-step write (entity + audit, entity + child rows) | **Must** use `withTransaction()` from `db/pool.js` |
| Cross-aggregate | Same transaction only when invariant requires it; otherwise saga + compensating action later |

**Helper:** `backend/src/db/pool.js` → `withTransaction(fn)`

**Current usage:** Company/Order/Lead create+audit (and Lead→Company convert) wrapped in transactions.

---

## 3. API validation & error contract

### Request validation

- Zod schemas in `backend/src/services/*Service.js` (or shared `schemas/`)
- Fail fast at service boundary before SQL

### Response shape (errors)

All non-2xx JSON responses:

```json
{
  "error": "VALIDATION",
  "message": "پیام فارسی قابل‌نمایش",
  "details": {}
}
```

| HTTP | `error` code | When |
|------|--------------|------|
| 400 | `VALIDATION` | Zod / bad input |
| 401 | `UNAUTHORIZED` | Missing/invalid token |
| 403 | `FORBIDDEN` | RBAC deny |
| 404 | `NOT_FOUND` / `LEAD_NOT_FOUND` | Missing or archived (hidden) record |
| 409 | `VERSION_CONFLICT` / `LEAD_ALREADY_CONVERTED` | Optimistic lock or domain conflict |
| 422 | `COMPANY_RESOLUTION_FAILED` / `COMPANY_IDENTITY_*` | Identity resolver / Linka port failure |
| 500 | `INTERNAL_ERROR` | Unexpected |

**Implementation:** `backend/src/lib/errors.js` (`AppError`), `middleware/errors.js`

Clients must branch on `error` code, not parse `message` for logic.

---

## 4. Soft-delete / archive policy

**No hard DELETE on user-facing Company, Order, or Raw Lead in v1.**

| Entity | Column | Behavior |
|--------|--------|----------|
| Company | `deleted_at TIMESTAMPTZ NULL` | Set on archive; hidden from default lists |
| Order | `deleted_at TIMESTAMPTZ NULL` | Set on archive; hidden from default lists |
| Raw Lead | `deleted_at TIMESTAMPTZ NULL` | Set on archive; hidden from default lists |
| Audit | append-only | Never deleted |

| Action | API |
|--------|-----|
| Archive company | `DELETE /api/v1/companies/:id` → sets `deleted_at` |
| Archive order | `DELETE /api/v1/orders/:id` → sets `deleted_at` |
| Archive lead | `DELETE /api/v1/leads/:id` → sets `deleted_at` |
| Admin restore | Future: `POST …/restore` (not v1) |

Queries use `activeOnly` filter (`deleted_at IS NULL`) unless `?includeArchived=true` (admin only, future).

### Entity registry (Tier A API)

| Aggregate | Table | API | Backend repo | Permissions |
|-----------|-------|-----|--------------|-------------|
| Company | `companies` | `/api/v1/companies` | `companyRepository.js` | `companies:read/write` |
| Order | `orders` | `/api/v1/orders` | `orderRepository.js` | `orders:read/write` |
| Raw Lead | `raw_leads` | `/api/v1/leads` | `leadRepository.js` | `leads:read/write/convert` |

---

## Pre-flight checklist (before new backend feature)

- [ ] DDL / Entity Card (`ENTITY_DELIVERY_PIPELINE.md`)
- [ ] Migration added and tested
- [ ] Migration Safety + backup path known (`BACKUP_RESTORE.md`)
- [ ] Writes that touch 2+ tables use `withTransaction`
- [ ] Zod schema + `AppError` codes
- [ ] Archive strategy defined (soft vs hard)
- [ ] CLIENT_STATE_SSOT: repository + cache, not Zustand SoR
- [ ] Backend repository for **new** Tier A SQL (not inline in Service)
- [ ] RBAC permission added to seed if new route
- [ ] Deploy order: backup → migrate → backend → smoke → frontend (`DEPLOY_ROLLBACK.md`)

---

## Observability (foundation)

- `X-Request-Id` + structured request logs: `backend/src/middleware/requestContext.js`
- Errors logged with requestId / actor when present
- Linka operational logs: `provider: LINKA` in `backend/src/integrations/linka/linkaClient.js` (no secrets)

## External integrations (Company identity / Linka)

| Layer | Path |
|-------|------|
| Port | `backend/src/ports/companyIdentityResolver.port.js` |
| Factory | `backend/src/integrations/companyIdentity/createCompanyIdentityResolver.js` |
| Mock adapter | `backend/src/integrations/linka/mockCompanyIdentity.adapter.js` |
| Production adapter | `backend/src/integrations/linka/linkaCompanyIdentity.adapter.js` |

**Contract (verified 2026-08-27, production HTTPS):**

| Step | Method | Path |
|------|--------|------|
| Login | `POST` | `/Api/V1/Auth/Login` |
| Company lookup | `GET` | `/API/V1/CompanyBaseInfo?nationalCode=` |
**Phase 2 contract (wired 2026-08-27 via `enrichCompanyFromLinka`):**

| Step | Method | Path |
|------|--------|------|
| Persons | `GET` | `/API/V1/CompanyPerson?NationalCode=&PageIndex=` |
| Gazette | `GET` | `/API/V1/Gazette?NationalCode=&PageIndex=` |

Jarian API: `POST /api/v1/companies/:id/enrich-from-linka`  
Dev probe: `npm run probe:linka-phase2 -- <nationalId>`

Auth: username/password → JWT (`data.token.accessToken`; strip leading `bearer ` then send `Authorization: Bearer <JWT>`). No `x-key`. `LINKA_API_KEY` is deprecated.

**ENV (backend only):** `COMPANY_IDENTITY_PROVIDER`, `LINKA_BASE_URL` (suggest `https://api.linka.ir`), `LINKA_USERNAME`, `LINKA_PASSWORD`, `LINKA_TIMEOUT_MS`, `LINKA_MAX_RETRIES`.

Lead conversion resolves identity **outside** DB transaction; skips provider when Company already exists by `nationalId`. Mapped fields land on Company columns (`name`, `national_id`, `province`, `activity_domain`) plus `payload.linkaIdentity` for remaining verified fields.

## Backup

See [BACKUP_RESTORE.md](./BACKUP_RESTORE.md) and `backend/scripts/backup-pg.sh` / `restore-pg.sh`.

---

## Status snapshot (2026-08-26)

| Area | Status |
|------|--------|
| Migrations | ✅ numbered SQL + runner |
| Transactions | ✅ create flows + audit |
| Error contract | ✅ AppError + middleware |
| Soft-delete | ✅ `002_soft_delete.sql` + archive routes |
| Request ID / structured logs | ✅ foundation |
| Backup/restore scripts | ✅ foundation (cron/off-site = ops) |
| Backend repository extraction | ✅ Company/Order in `backend/src/repositories/` |
| Integration tests | ✅ `npm run test --prefix backend` (Postgres required) |
