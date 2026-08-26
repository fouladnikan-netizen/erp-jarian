# Backend v1 launched (2026-08-26)

> **Status:** Implemented scaffold — `backend/` is the ERP data plane for Auth + Company + Order.  
> **Related:** [PERSISTENCE_BOUNDARY.md](./PERSISTENCE_BOUNDARY.md), [DOMAIN_DECISION_LOG.md](./DOMAIN_DECISION_LOG.md), [16-BACKEND_READINESS_AUDIT.md](./16-BACKEND_READINESS_AUDIT.md)

## What shipped

| Piece | Location |
|-------|----------|
| Express API | `backend/src/index.js` · port `3100` |
| PostgreSQL schema | `backend/src/db/migrations/001_init.sql` |
| JWT login + `/me` | `/api/v1/auth/*` |
| Server RBAC | `requirePermission(...)` on companies/orders |
| Company CRUD | `/api/v1/companies` |
| Order CRUD | `/api/v1/orders` (fat `payload` JSONB per DDL-03) |
| Audit log | `audit_log` table |
| AI rewrite | still `/api/ai/rewrite` (existing Liara path) |

## Not yet (honest)

- Full Nabz stage machines / financial ledger
- Migrating Zustand SoR → API for all modules
- Activity unify (DDL-05)
- Production hardening (refresh tokens, rate limit, HTTPS deploy)

## Run

See `backend/README.md`. Root scripts: `npm run server`, `npm run server:setup`.
