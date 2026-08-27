# Backend v1 launched (2026-08-26)

> **Status:** Implemented scaffold — `backend/` is the ERP data plane for Auth + Company + Order + Raw Lead.  
> **Related:** [PERSISTENCE_BOUNDARY.md](./PERSISTENCE_BOUNDARY.md), [DOMAIN_DECISION_LOG.md](./DOMAIN_DECISION_LOG.md), [16-BACKEND_READINESS_AUDIT.md](./16-BACKEND_READINESS_AUDIT.md)

## What shipped

| Piece | Location |
|-------|----------|
| Express API | `backend/src/index.js` · port `3100` |
| PostgreSQL schema | `backend/src/db/migrations/001_init.sql` (+ soft-delete + `003_raw_leads.sql`) |
| JWT login + `/me` | `/api/v1/auth/*` |
| Server RBAC | `requirePermission(...)` on companies/orders/leads |
| Company CRUD | `/api/v1/companies` |
| Order CRUD | `/api/v1/orders` (fat `payload` JSONB per DDL-03) |
| Raw Lead CRUD + convert | `/api/v1/leads` (DDL-13) |
| Audit log | `audit_log` table |
| AI rewrite | still `/api/ai/rewrite` (existing Liara path) |

## Not yet (honest)

- Full Nabz stage machines / financial ledger
- Activity unify (DDL-05)
- Linka production identity adapter — Login JWT + CompanyBaseInfo (contract verified 2026-08-27)
- Production hardening (refresh tokens, rate limit, HTTPS deploy)

## Frontend wiring (2026-08-26)

When `VITE_USE_MOCK_API=false`:

- `useContactsStore.fetchContacts()` → `GET /api/v1/companies`
- Contact mutations persist via `CompanyRepository` (payload JSONB)
- `useNabzStore.fetchOrders()` → `GET /api/v1/orders`
- Order mutations SERVER_FIRST via `OrderRepository`
- `useLeadsStore.fetchLeads()` → `GET /api/v1/leads`; writes via `LeadRepository`
- Login + `ErpDataBootstrap` hydrate data after auth

See [CLIENT_STATE_SSOT.md](./CLIENT_STATE_SSOT.md) — **no new API-backed entity in Zustand as SoR.**

## Backend foundation

See [BACKEND_FOUNDATION.md](./BACKEND_FOUNDATION.md): migrations, transactions, error contract, soft-delete (`002_soft_delete.sql`), Raw Lead (`003_raw_leads.sql`).

Delivery law: [ENTITY_DELIVERY_PIPELINE.md](./ENTITY_DELIVERY_PIPELINE.md) · gaps: [ENTITY_GAP_AUDIT.md](./ENTITY_GAP_AUDIT.md) · backup: [BACKUP_RESTORE.md](./BACKUP_RESTORE.md).

## Run

See `backend/README.md`. Root scripts: `npm run server`, `npm run server:setup`.
