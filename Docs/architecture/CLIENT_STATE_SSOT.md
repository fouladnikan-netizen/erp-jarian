# Client State vs Backend SSOT

> **Status:** **Law** — effective 2026-08-26.  
> **Related:** [BACKEND_V1.md](./BACKEND_V1.md), [PERSISTENCE_BOUNDARY.md](./PERSISTENCE_BOUNDARY.md), [SSOT.md](./SSOT.md)

---

## Rule (one sentence)

**If an entity has a Backend API, PostgreSQL owns the truth; the browser only caches it.**

---

## Why

Dual SoR (Zustand + Postgres) causes:

- Records that "disappear" after refresh
- Two users overwriting each other silently
- Impossible audit / compliance

---

## Architecture

```
UI → Repository → API → Service → Postgres
         ↑
    Zustand cache (invalidate/refetch after successful write)
```

---

## Checklist — new persisted entity

- [ ] Migration in `backend/src/db/migrations/NNN_*.sql`
- [ ] Zod (or equivalent) validation at API boundary
- [ ] RBAC on routes
- [ ] Repository in `src/api/repositories/`
- [ ] Store: `fetch*`, optional optimistic UI, **no standalone seed SoR**
- [ ] Soft-delete policy if entity is user-visible (see [BACKEND_FOUNDATION.md](./BACKEND_FOUNDATION.md))
- [ ] Entry in [BACKEND_V1.md](./BACKEND_V1.md) or successor doc

---

## Currently persisted via API

| Entity | API | Client cache |
|--------|-----|--------------|
| User / Auth | `/api/v1/auth/*` | `authSession` + `useSessionStore` (token + permissions cache) |
| Company | `/api/v1/companies` | `useContactsStore` (SERVER_FIRST cache) |
| Order | `/api/v1/orders` | `useNabzStore` (SERVER_FIRST cache); stage/status/completion authority = Backend `orderLifecycle` |
| Raw Lead | `/api/v1/leads` | `useLeadsStore` (SERVER_FIRST cache) |
| Activity (Pooyesh soft CRM) | `/api/v1/activities` | `useActivitiesStore` (SERVER_FIRST cache) |
| Task (Pooyesh) | `/api/v1/tasks` | `useTasksStore` (SERVER_FIRST cache; mock in-memory via taskFacade) |

## Still client-only (until API)

| Entity | Store | Architecture status |
|--------|-------|---------------------|
| Opportunity (facet) | Company fields | **DDL-04** — not a separate API aggregate |

Lead / Opportunity are **not** the same: Opportunity remains Company capability (**DDL-04**). See [DOMAIN_DECISION_LOG.md](./DOMAIN_DECISION_LOG.md) DDL-13.

Nabz Order `crmActivities` stay on the Order document — **not** Pooyesh Activity (**DDL-15** scope boundary).  
Mock offline (`VITE_USE_MOCK_API=true`) may still use parent `interactions[]` for Pooyesh soft CRM; API mode uses PostgreSQL only for new writes.

---

## Cursor enforcement

- `.cursor/rules/jarian-client-state-ssot.mdc` — always applied  
- `.cursor/rules/jarian-entity-pipeline.mdc` — always applied (DDL gate + Entity Cards + dual repos)

Delivery path: [ENTITY_DELIVERY_PIPELINE.md](./ENTITY_DELIVERY_PIPELINE.md)  
Entity Cards: [entity-cards/README.md](./entity-cards/README.md)  
Raw Lead: **DDL-13** implemented (`raw-lead.yaml` status `active`) — PostgreSQL SSOT + LeadRepository.  
Activity: **DDL-15** implemented (`activity.yaml` status `active`) — PostgreSQL SSOT + ActivityRepository.  
Task: **DDL-16** implemented (`task.yaml` status `active`) — PostgreSQL SSOT + TaskRepository.
