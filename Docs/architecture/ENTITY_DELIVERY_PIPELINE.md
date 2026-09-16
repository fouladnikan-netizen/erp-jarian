# Entity Delivery Pipeline (Law)

> **Status:** **Law** — effective 2026-08-26.  
> **Enforcement:** `.cursor/rules/jarian-entity-pipeline.mdc` · PR checklist · `npm run check:entity-cards`  
> **Related:** [DOMAIN_DECISION_LOG.md](./DOMAIN_DECISION_LOG.md), [CLIENT_STATE_SSOT.md](./CLIENT_STATE_SSOT.md), [BACKEND_FOUNDATION.md](./BACKEND_FOUNDATION.md), [ENTITY_OWNERSHIP.md](./ENTITY_OWNERSHIP.md), [BACKUP_RESTORE.md](./BACKUP_RESTORE.md), [DEPLOY_ROLLBACK.md](./DEPLOY_ROLLBACK.md), [ENTITY_GAP_AUDIT.md](./ENTITY_GAP_AUDIT.md)

This is the **single pipeline SSOT** for building Tier A/B entities. Do not invent a parallel “delivery guide.”

---

## Zero: Audit before create

Before adding an aggregate, migration, API, or store:

1. Read DDL + ownership + this pipeline  
2. If a similar doc/rule exists → **extend it**, do not fork  
3. If work contradicts an open DDL → superseding `DDL-NN` first  

---

## One sentence

**UI is last. DDL gate is first. Tier A ships with a machine-checkable Entity Card. Postgres is SoR when an API exists.**

---

## Tiers

| Tier | Examples | Ceremony |
|------|----------|----------|
| **A — Core** | Company, ContactPerson, Lead (when decided), Order, Payment, Financial Transaction | Full pipeline + Entity Card YAML + Migration Safety + Backup/Deploy checks |
| **B — Module** | Campaign, Template, Audience Segment, Task | Domain + Migration + BE/FE repos + API + RBAC/Audit as needed + SSOT + tests |
| **C — UI-only** | Filter, Tab, Drawer state, Sort, Selection | No migration/API entity. Client UI state only |

**Default:** Backend/API or money/identity/lifecycle truth → **Tier A**.

---

## Official pipeline (Tier A)

```text
Business Requirement
        ↓
Architecture / DDL Gate
        ↓
Entity Card (YAML)
        ↓
Domain Model
        ↓
Business Rules
        ↓
Data Model
        ↓
Migration
        ↓
Migration Safety Review
        ↓
Backend Repository
        ↓
Use Case / Service
        ↓
API
        ↓
RBAC
        ↓
Audit
        ↓
Frontend Repository
        ↓
Client Cache / UI State
        ↓
Update Policy
        ↓
Tests
        ↓
Backup / Deploy Safety Check
        ↓
Deploy
        ↓
Smoke Test
        ↓
Post-deploy Verification
```

Forms do **not** precede Domain. UI consumes use cases.

---

## Architecture / DDL Gate

Before migration or Entity Card for a new/changed aggregate:

1. Owner module?  
2. Independent aggregate?  
3. Where is SSOT?  
4. Existing `DOMAIN_DECISION_LOG` entry?  
5. Conflict with prior decision?

If architecture changes → register/supersede DDL **before** implementation.

**Raw Lead note:** Architecture locked by **DDL-13**; implementation landed (`raw-lead.yaml` = `active`).  

**Activity note:** Architecture locked by **DDL-15** (resolves DDL-05). Independent Pooyesh aggregate; PostgreSQL `activities` SoR. Entity Card `activity.yaml` = `draft` until migration + API. Do **not** unify Nabz `crmActivities`. Interim storage remains parent `interactions[]` via Pooyesh facade.

---

## Entity Card (structured registry)

| Item | Path |
|------|------|
| Cards | `Docs/architecture/entity-cards/<id>.yaml` |
| Schema | `Docs/architecture/entity-cards/schema.json` |
| Index | `Docs/architecture/entity-cards/README.md` |
| Checker | `npm run check:entity-cards` |

Narrative ownership remains [ENTITY_OWNERSHIP.md](./ENTITY_OWNERSHIP.md). Cards are the **machine-checkable** projection — not a second ownership story.

Required keys (Tier A/B): `id`, `name`, `tier`, `ownerModule`, `aggregateRoot`, `ssot`, `lifecycle`, `archivePolicy`, `auditPolicy`, `rbacPolicy`, `databaseTable`, `apiBasePath`, `backendRepository`, `frontendRepository`, `dependencies`, `integrationPorts`, `updatePolicy`, `ddlRefs`.

---

## Layer rules (binding)

### Domain / Business Rules

Must **not** live in React/JSX, Zustand, Express routes, or scattered API clients. Prefer `src/domain/*`, module `*Service.js`, or backend use-case services.

### Backend Repository (Tier A target)

```text
Domain → Use Case / Service → Repository Port → PostgreSQL Adapter
```

- SQL for **new** Tier A work: `backend/src/repositories/` only  
- Service: operations, TX orchestration, validation, audit calls  
- Routes: thin (auth → permission → service → JSON)

Legacy Company/Order still embed SQL in services — tracked in [ENTITY_GAP_AUDIT.md](./ENTITY_GAP_AUDIT.md); do not copy for new entities.

### Frontend Repository

```text
UI → Store/Hook → Frontend Repository → API
```

- Only `src/api/repositories/*` talks to HTTP for persisted entities  
- No Postgres from the browser  
- No ad-hoc `fetch` in components for Tier A/B aggregates (auth login excepted)

### SSOT

Per [CLIENT_STATE_SSOT.md](./CLIENT_STATE_SSOT.md): PostgreSQL is SoR when API exists. Zustand = cache / selection / filter / draft / temporary optimistic UI.

### Update Policy

On every Tier A card: `SERVER_FIRST` (default for Order, Payment, financial, critical lifecycle) or `OPTIMISTIC` (only with explicit reason).

### Cross-module

Modules do **not** import each other’s stores. Use Port / Facade / Contract / Event. Reference: Mowj → Pooyesh task port.

### Migration

Versioned, append-only, repeatable. No hand-SQL in production. Destructive changes: expand → migrate usage → deploy compatible code → verify → remove legacy later. Details: [BACKEND_FOUNDATION.md](./BACKEND_FOUNDATION.md).

### Archive

Commercial entities default to soft-delete (`deleted_at` / `deleted_by`). Hard delete only when the card says so.

### Audit

Tier A writes: actor, entity, entityId, action, timestamp, relevant before/after in `audit_log` (append-only).

### Errors

`{ error, message, details }` — [BACKEND_FOUNDATION.md](./BACKEND_FOUNDATION.md). Do not mix validation / business / infrastructure codes casually.

### Tests (Tier A minimum)

1. Domain rules  
2. Service / use-case (incl. TX where practical)  
3. Repository / persistence  
4. API integration (HTTP + RBAC + validation)  
5. Smoke after deploy  

Frontend unit tests alone are **not** enough for Tier A.

### Observability (foundation)

Request ID + structured server logs + error logging with actor when present. No heavy APM in this phase. See backend `middleware/requestContext.js`.

### Backup / Deploy / Rollback

- [BACKUP_RESTORE.md](./BACKUP_RESTORE.md) — daily `pg_dump`, retention, restore drill, future PITR  
- [DEPLOY_ROLLBACK.md](./DEPLOY_ROLLBACK.md) — Git → tests → backup → migrate → backend → smoke → frontend → verify; app rollback ≠ DB restore  

---

## Anti-patterns (reject)

- Form-first data modeling  
- Zustand SoR for API-backed entities  
- Cross-module store imports  
- Business rules in JSX/routes  
- Production hand-SQL  
- Markdown-only Entity Card for Tier A  
- Skipping DDL gate for “small” Lead/API work  
- SQL in Service for **new** Tier A code  

---

## PR checklist

`.github/pull_request_template.md` — section **Entity Delivery (Tier A/B)**.

---

## Status (2026-08-26)

| Artifact | Status |
|----------|--------|
| This pipeline | ✅ Law |
| Cursor rule | ✅ `jarian-entity-pipeline.mdc` |
| Entity Cards | ✅ company, order, raw-lead, activity, task **active** |
| Checker | ✅ `npm run check:entity-cards` |
| Backup / Deploy policies | ✅ linked docs + scripts (ops verify separate) |
| Company/Order backend repositories | ✅ `backend/src/repositories/` |
| Order SERVER_FIRST | ✅ debounce removed; `commitOrders` / `saveOrder` |
| BE integration tests | ✅ `backend` `npm test` |
| Raw Lead architecture | ✅ **DDL-13** + Lead API (`raw-lead.yaml` active) |
| Activity architecture | ✅ **DDL-15** + Activity API (`activity.yaml` active) |
| Activity API/table | ✅ `004_activities.sql` + `/api/v1/activities` |
| Task architecture | ✅ **DDL-16** + Task API (`task.yaml` active) |
| Task API/table | ✅ `005_tasks.sql` + `/api/v1/tasks` |
