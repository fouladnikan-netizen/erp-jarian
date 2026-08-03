# Domain Decision Log

> **Status:** Active — record architectural decisions **before** database / Prisma / API design.  
> **Related:** [AGGREGATE_BOUNDARIES.md](./AGGREGATE_BOUNDARIES.md), [SSOT.md](./SSOT.md), [ENTITY_OWNERSHIP.md](./ENTITY_OWNERSHIP.md), [ENTITY_IDENTITY_AUDIT.md](./ENTITY_IDENTITY_AUDIT.md), [16-BACKEND_READINESS_AUDIT.md](./16-BACKEND_READINESS_AUDIT.md), [03-WORKSPACE_STRATEGY.md](./03-WORKSPACE_STRATEGY.md)  
> **Rule:** New persistence work must not contradict open decisions here without adding a superseding entry.

---

## How to use

| Field | Meaning |
|-------|---------|
| **Decision** | Binding choice for upcoming design |
| **Current state** | What the codebase does today |
| **Reason** | Why we lock this now |
| **Future migration impact** | What implementers must plan for |

Append new decisions at the bottom with `DDL-NN` ids. Do not silently rewrite history — supersede with a new entry.

---

## DDL-01 — Company is the primary customer aggregate

| | |
|--|--|
| **Decision** | **Company** (runtime Contact in `useContactsStore`) is the primary customer / party aggregate root for CRM and as the customer reference on Orders. |
| **Current state** | Contacts store holds customers, suppliers (`entityType`), and pipeline fields; Nabz customer/supplier helpers facade the store. |
| **Reason** | One party root avoids parallel customer registries and matches Kanoon/Ofogh write ownership already documented in SSOT / aggregate boundaries. |
| **Future migration impact** | First persist **Company** (not a separate “Customer” table that forks identity). Supplier remains a **facet/role** of Company unless a later decision splits it. Order APIs reference `companyId` (today’s contact id). |

---

## DDL-02 — ContactPerson is currently owned by Company

| | |
|--|--|
| **Decision** | **ContactPerson** remains **owned by Company** (embedded `relatedPersons[]`) for the near-term persistence model. |
| **Current state** | 1:N embed under contact; domain normalize helpers; UI kit under `src/components/contactPerson/`. Natural persons may use synthetic `self-{id}` for pickers. |
| **Reason** | Matches today’s consistency boundary; avoids premature Person aggregate and M:N graph before Company writes are stable. |
| **Future migration impact** | v1 schema: persons nested or child rows with `company_id` FK and cascade/ownership rules. **Do not** introduce a global Person root in the first migration. ID prefix collision (`cp` vs payments) must be resolved before dual tables. A future DDL may promote ContactPerson or Party links to M:N — that requires a new decision. |

---

## DDL-03 — Order is the primary operational aggregate

| | |
|--|--|
| **Decision** | **Order** is the primary **operational** aggregate root (Nabz). Lines, inquiries, quoting, stage, events, proforma, shipping, settlement payloads remain inside the Order consistency boundary until a later split decision. |
| **Current state** | Fat document in `useNabzStore`; mutations via Nabz services → `setOrders`; `OrderRepository` is read/status-only. |
| **Reason** | Operations, money-in-progress, and stage machines already cohere on one document; splitting Shipment/Payment/Invoice before durable Order writes increases migration risk. |
| **Future migration impact** | Persist Order as one aggregate (or document + append-only `events`) first. Child tables may be physical storage still loaded/saved as one unit-of-work. Extracting Shipment/Payment/Invoice as separate roots needs an explicit future DDL — not implied by this entry. |

---

## DDL-04 — Opportunity remains a Company capability (not standalone yet)

| | |
|--|--|
| **Decision** | **Opportunity** is **not** a standalone aggregate yet. It remains a **Company capability** (primarily `lifecycle_stage` + Ofogh UX). |
| **Current state** | Ofogh pipeline reads/writes the same contact records; no opportunity id/row. |
| **Reason** | Avoid a second CRM root and dual-write with Company before Company persistence exists. Aligns with aggregate-boundary “Opportunity is a view on Company.” |
| **Future migration impact** | v1 APIs expose lifecycle on Company (or a thin “opportunity view” DTO), not `/opportunities` as a separate SoR. Promoting Opportunity to its own entity/table requires a new DDL with identity, ownership, and sync rules. |

---

## DDL-05 — Activity ownership requires a future dedicated decision

| | |
|--|--|
| **Decision** | **No binding Activity aggregate owner yet.** Activity remains a **known split** until a dedicated decision. |
| **Current state** | At least three streams: Company `interactions[]`, Order `crmActivities[]`, Order `events[]`, plus unused activity-timeline mock data. |
| **Reason** | Forcing a unify-before-Company/Order persist would block backend priority 1–5; wrong early schema is costly. |
| **Future migration impact** | Do **not** invent a single Activity table as SoR in the first backend slice without DDL-05 follow-up. Interim: persist streams with their parent aggregates. A later DDL must choose: unify vs keep typed streams, and define `companyId` / `orderId` rules. |

---

## DDL-06 — Workspace architecture deferred

| | |
|--|--|
| **Decision** | **Company / Order workspace chrome and entity-first navigation remain deferred** — not part of pre-DB domain locking beyond this note. |
| **Current state** | Flat routes in `App.jsx`; no workspace shell ([03-WORKSPACE_STRATEGY.md](./03-WORKSPACE_STRATEGY.md)). |
| **Reason** | Workspace is UX/IA cost; it must not drive table design or block persistence. Product already deferred nav rewrite. |
| **Future migration impact** | APIs and aggregates must be **addressable by id** without requiring workspace URLs. Deep links can keep today’s paths until a funded IA project. Do not encode workspace hierarchy into the first schema. |

---

## DDL-07 — Persistence migration requires stable IDs

| | |
|--|--|
| **Decision** | **Persistence migration requires stable, collision-free IDs** before (or as the first step of) durable storage. New records should use shared identity helpers; legacy schemes are migration risk, not templates. |
| **Current state** | Mixed: numeric Company/Order ids, `JR…` codes, `cp-` / payment `cp` prefix collision, `max(id)+1` create order, `Date.now()` event ids, domain vs runtime type drift ([ENTITY_IDENTITY_AUDIT.md](./ENTITY_IDENTITY_AUDIT.md)). |
| **Reason** | Unstable or colliding ids make FK migration, multi-tab create, and audit trails unsafe. Backend readiness audit lists identity freeze as priority 1. |
| **Future migration impact** | Freeze ID policy (string vs number, generators, forbidden prefix reuse) **before** Prisma/schema. Map seed ids explicitly; do not renumber casually. Event/payment/person ids must be unique in their namespaces. Optimistic concurrency / ETags assume stable primary keys. |

---

## Open / explicitly not decided here

| Topic | Status |
|-------|--------|
| Product as aggregate root | Recommended in data docs; **not** locked in this log yet |
| Supplier as separate root | Remains Company facet until a DDL says otherwise |
| Payment / Invoice / Shipment split from Order | Deferred |
| Auth principal vs Actor / expert name | Security docs; not restated here |
| Database engine / Prisma | Out of scope for this log |

---

## Change control

1. Propose a new `DDL-NN` when a persistence or aggregate choice would contradict or refine the above.  
2. Reference the DDL id from schema/API design notes and PRs.  
3. Do not implement backend schema that invents a standalone Opportunity or global ContactPerson root without superseding DDL-02 / DDL-04.
