# Data Migration Risk Register

> **Status:** Risk register for a **future** persistence migration.  
> **No migration in this phase.**  
> **Related:** [10-DATA_ARCHITECTURE_AUDIT.md](./10-DATA_ARCHITECTURE_AUDIT.md), [ENTITY_IDENTITY_AUDIT.md](./ENTITY_IDENTITY_AUDIT.md), [DATA_OWNERSHIP_MODEL.md](./DATA_OWNERSHIP_MODEL.md)

---

## Critical

| ID | Risk | Why it blocks production persistence |
|----|------|--------------------------------------|
| C1 | **In-memory business data** | Company, Order, Product, payments vanish on refresh; no source of truth to migrate continuously |
| C2 | **No transaction boundaries** | Stage + events + revisions + payment dual-writes are not atomic; partial failure corrupts aggregates |
| C3 | **No durable audit / financial history** | Mutable payment arrays; spoofable `CURRENT_USER`; insufficient for financial accuracy requirements |
| C4 | **Order writes bypass repository** | `setOrders` never round-trips; API/mock status update is not a migration path |
| C5 | **No multi-user concurrency** | Lost updates; `max(id)+1` and counters race across tabs/users |
| C6 | **No tenant isolation** | Cannot safely host multiple organizations later |

---

## High

| ID | Risk | Notes |
|----|------|--------|
| H1 | **Duplicate / split contact & activity data** | Interactions vs CRM vs events; relatedOrders denorm; hard to pick one ETL mapping |
| H2 | **Order document ownership (god aggregate)** | Single blob vs many tables — either choice needs an explicit cut plan |
| H3 | **Product source of truth missing** | Page state + line snapshots; catalog migration has no store to export from cleanly |
| H4 | **Identity type drift** | number vs string ids; `cp` prefix collision; seed codes as FKs |
| H5 | **Three+ role / user identity systems** | Auth username ≠ Nabz actor ≠ usersStore ≠ org nodes |
| H6 | **RBAC not enforced on ops** | Migrating permission matrix alone does not secure Order writes |

---

## Medium

| ID | Risk | Notes |
|----|------|--------|
| M1 | **Seed normalization** | Demo ids `1…8`, Persian/ISO date mix, incomplete domain fields |
| M2 | **Config-as-data vs reference tables** | Registries (supplier types, domains, permissions catalog) need versioning strategy |
| M3 | **Calendar / campaign page state** | Easy to forget in ETL; mostly mock |
| M4 | **Document metadata without blobs** | Filenames/data URLs — file migration separate from metadata |
| M5 | **Dual timestamp fields** | `updatedAt` / `updated_at` noise |
| M6 | **Zod unwired** | Invalid shapes may exist in memory before first DB load |
| M7 | **Soft-delete absent** | Hard deletes lose history unless tombstones added at migration |

---

## Low

| ID | Risk | Notes |
|----|------|--------|
| L1 | Dead aliases (`useKanoonStore`) | Confusion only |
| L2 | Print preview localStorage | Ephemeral by design |
| L3 | Notification queue | Non-durable OK |

---

## Suggested migration order (future — not now)

1. Freeze identity rules + ownership maps (this package).  
2. Persist **Company** (with ContactPerson).  
3. Persist **Order** with full write API + events/revisions.  
4. Introduce payment/ledger entries.  
5. Product catalog store + snapshot policy.  
6. Unify Activity.  
7. Bind auth actor + enforce RBAC.  
8. Only then consider splitting Order child tables.

---

## Explicit non-goals

No Prisma, no DB schema, no data migration scripts, no Zustand replacement in this phase.
