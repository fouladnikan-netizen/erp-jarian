# Entity Ownership

> **Status:** Active ownership map — keep aligned with [DOMAIN_DECISION_LOG.md](./DOMAIN_DECISION_LOG.md) (esp. DDL-13 Raw Lead).  
> **Related:** [AGGREGATE_BOUNDARIES.md](./AGGREGATE_BOUNDARIES.md), [SSOT.md](./SSOT.md), [07-DOMAIN_MODEL_AUDIT.md](./07-DOMAIN_MODEL_AUDIT.md), [entity-cards/README.md](./entity-cards/README.md)

Runtime field names often say **Contact**; domain language prefers **Company**. See `src/domain/party/naming.js`.

New string/numeric IDs for created records use `src/domain/identity` (`createEntityId` / `createNumericId`). Seed and existing in-memory IDs are never rewritten.

---

## Company (Contact)

| Field | Value |
|-------|--------|
| **Owner Module** | کانون (Kanoon) |
| **Aggregate** | Company root (Tier A) |
| **Current Storage** | `useContactsStore` cache; PostgreSQL via `CompanyRepository` when `VITE_USE_MOCK_API=false` |
| **Lifecycle** | Verified-customer continuum only (نوپدید → … → سایه). **Not** used for Raw Lead. |
| **Future Direction** | Keep ContactPerson 1:N; Opportunity remains Company capability (DDL-04) |

---

## ContactPerson (relatedPersons)

| Field | Value |
|-------|--------|
| **Owner Module** | Company aggregate / Kanoon (not a standalone module) |
| **Aggregate** | Embedded under Company |
| **Current Storage** | `contact.relatedPersons[]` via `useContactsStore` + `src/domain/contactPerson/` |
| **Lifecycle** | CRUD through store / ContactPerson modal; natural-person “self” via `naturalPersonSelfId` |
| **Future Direction** | Remain 1:N under Company; do not introduce M:N Person registry without product need |

---

## Raw Lead (Ofogh)

| Field | Value |
|-------|--------|
| **Owner Module** | افق (Ofogh) |
| **Aggregate** | **Independent** Tier A root (`RawLead`) — **DDL-13** |
| **Current Storage** | PostgreSQL `raw_leads` via `/api/v1/leads`; `useLeadsStore` = **Zustand cache only** (SERVER_FIRST) |
| **Lifecycle** | System: `NEW` / `QUALIFYING` / `CONVERTED` / `REJECTED` (+ soft-delete archive with reason). **Personal Pipeline Stage** (`pipeline_stage_id`) is orthogonal, user-owned Kanban placement — not a management reporting dimension. |
| **Minimum fields** | API create: `companyName` required; personName, mobile, leadSource, description, activityDomain optional |
| **Personal Pipeline** | One active `lead_pipelines` row per user; stages in `lead_pipeline_stages`; API `/api/v1/lead-pipelines/me` |
| **Forbidden until convert** | Order, quotation, financial ops, campaign-as-company, formal correspondence, contract (**DDL-14**) |
| **Allowed until convert** | Activity / notes / Task / Follow-up via Pooyesh EntityReference |
| **Conversion** | `POST /api/v1/leads/:id/convert` → create/link Company (Kanoon) in TX; keep Lead with `convertedCompanyId` / `convertedAt` / `convertedBy` |
| **Reference model** | `{ entityType: 'COMPANY'\|'RAW_LEAD', entityId }` — Pooyesh Port/Facade only |
| **Future Direction** | Org pipeline template copy-on-provision; optional `assigned_to` for reassignment (today owner = `created_by`) |

---

## Opportunity / Customer Lifecycle (Company capability — not Raw Lead)

| Field | Value |
|-------|--------|
| **Owner Module** | افق (Ofogh) owns **Customer Lifecycle board UX**; data remains on **Company** |
| **Aggregate** | Same as Company (`lifecycle_stage`, engagement) — **DDL-04 still in force** |
| **Current Storage** | Filters / board cards on `useContactsStore` (verified contacts) |
| **Lifecycle** | Fixed system-controlled stages: نوپدید → دیدار → رویش → آستانه → نوپیمان → هم‌پیمان. **Not** user-customizable. |
| **Future Direction** | Optional addressable Opportunity facet; do **not** conflate with Raw Lead personal pipeline (DDL-13) |

---

## Interaction / Activity (soft CRM)

| Field | Value |
|-------|--------|
| **Owner Module** | پویش (Pooyesh) — **DDL-15** |
| **Aggregate** | **Independent** Tier A root (`Activity`) — subject ref only |
| **SSOT** | PostgreSQL `activities` + `/api/v1/activities` — Entity Card `activity.yaml` (`active`) |
| **Client cache** | `useActivitiesStore` (SERVER_FIRST); facades rewired |
| **SubjectReference** | `{ entityType: 'COMPANY' \| 'RAW_LEAD', entityId }` (**DDL-14**) |
| **Lifecycle** | `OPEN` \| `COMPLETED`; archive = soft-delete |
| **Out of scope** | Nabz Order `crmActivities`, Order events/stage history, finance events, `audit_log` |
| **Task** | **Task ≠ Activity** — PostgreSQL `tasks` (**DDL-16**); Mowj via Port only |
| **Legacy** | Parent `interactions[]` not auto-migrated; mock mode may still use them offline |

---

## Order

| Field | Value |
|-------|--------|
| **Owner Module** | نبض (Nabz) |
| **Aggregate** | Order root (fat document) |
| **Current Storage** | `useNabzStore` / `NabzOrdersContext` + mock repository bridge |
| **Lifecycle** | Stages via Nabz services (`orderStageService`, gateway, tadarok, rahsepar, saranjam, …) |
| **Future Direction** | Persist Order document first; extract Shipment/Payment only after SSOT + API |

---

## Order line / Inquiry / Quoting / Gateway / Proforma

| Field | Value |
|-------|--------|
| **Owner Module** | Nabz |
| **Aggregate** | Embedded in Order |
| **Current Storage** | Fields on Order (`items`, inquiries, quoting preview, gateway, proforma versions) |
| **Lifecycle** | Stage-gated mutations in `*Service.js` |
| **Future Direction** | Keep embedded until Order persistence and clear write APIs exist |

---

## Tadarok / PurchaseOrder / QC / Shipping / Rahsepar / Saranjam

| Field | Value |
|-------|--------|
| **Owner Module** | Nabz (operational phases) |
| **Aggregate** | Embedded in Order |
| **Current Storage** | Order nested state + operational services |
| **Lifecycle** | Phase2 state machine (`phase2Service`, tadarok/rahsepar/saranjam services) |
| **Future Direction** | Candidates for future aggregates — **not** extracted in this phase |

---

## Order CRM activity / payments (settlement)

| Field | Value |
|-------|--------|
| **Owner Module** | Nabz Order profile |
| **Aggregate** | Order |
| **Current Storage** | `order.crmActivities`, saranjam payment arrays, CRM payment helpers |
| **Lifecycle** | Order-scoped; **distinct from Pooyesh Activity** (**DDL-15** — not unified into `activities`) |
| **Future Direction** | Payment / Order-CRM extraction deferred; do **not** dump into Pooyesh Activity without a new DDL |

---

## Product (catalog)

| Field | Value |
|-------|--------|
| **Owner Module** | ویترین (Vitrin) UX; Nabz holds **line snapshots** |
| **Aggregate** | Not a real write aggregate today |
| **Current Storage** | Local/module state + denormalized names on Order lines |
| **Lifecycle** | Catalog edits do not reliably sync into open Orders |
| **Future Direction** | Product store + FK/snapshot policy (documented in SSOT) |

---

## Supplier (as party)

| Field | Value |
|-------|--------|
| **Owner Module** | Same Company SSOT (`entityType === supplier`) |
| **Aggregate** | Company |
| **Current Storage** | `useContactsStore`; Nabz helpers in `suppliers.js` must read the store |
| **Lifecycle** | Maintained in Kanoon supplier tab; referenced by inquiry/tadarok supplier ids |
| **Future Direction** | Keep party model; avoid a second supplier registry |

---

## Campaign / Survey

| Field | Value |
|-------|--------|
| **Owner Module** | موج (Mowj) — Campaign Core |
| **Aggregate** | Campaign (`cmp-*`), Template, AudienceSegment, Snapshot, Execution, Intent, Result, Attribution |
| **Current Storage** | `mowj/repositories/*` (in-memory SSOT behind repository ports) |
| **Lifecycle** | `campaign.lifecycle.js` transitions via facade; automation evaluate → intent; executor → result |
| **Does not own** | Contact/Company (Kanoon), Raw Lead (Ofogh, DDL-13), Opportunity facet data (Company), Order (Nabz), Task (Pooyesh) |
| **Future Direction** | Persist via ports; wire ERP event producers; real channel providers behind `ChannelExecutor`; Aineh consumes `campaignAnalyticsContract` for dashboards |

See [MOWJ_CAMPAIGN_ARCHITECTURE.md](./MOWJ_CAMPAIGN_ARCHITECTURE.md).

---

## User / Org tree / RBAC role

| Field | Value |
|-------|--------|
| **Owner Module** | شیرازه (Shirazeh) |
| **Aggregate** | Platform identity (outside Company/Order) |
| **Current Storage** | `usersStore`, organization tree utils, role registry |
| **Lifecycle** | Mock user CRUD; org tree edits in security UI |
| **Future Direction** | Auth-backed users; enforce RBAC on Nabz/Ofogh (today mostly not enforced) |

---

## Notification

| Field | Value |
|-------|--------|
| **Owner Module** | Shell / NotificationEngine |
| **Aggregate** | Ephemeral UI |
| **Current Storage** | React context |
| **Lifecycle** | Toast/queue; prefer `crypto.randomUUID` then `createEntityId('ntf')` |
| **Future Direction** | Server-backed inbox optional |

---

## Calendar / Commitment events

| Field | Value |
|-------|--------|
| **Owner Module** | تقویم / Gahshomar surfaces (presentation) |
| **Aggregate** | Projection over Company/Order dates — not a write root |
| **Current Storage** | Derived / mock event lists |
| **Lifecycle** | Read-mostly |
| **Future Direction** | Index events from SSOT entities when persistence exists |

---

## Explicit non-goals (ownership)

Do **not** move ownership of Order stages to Ofogh, Company registry to Nabz, or Activity to multiple writers. Document conflicts in [SSOT.md](./SSOT.md); resolve only with funded migrations.

---

## Cross-module access (module boundaries)

Cross-module communication must use **Port / Facade / Public contract** — never another module's Zustand store.

| Entity | Owner | Public surface |
|--------|-------|----------------|
| Company / ContactPerson | Kanoon | `src/modules/kanoon/public` |
| Raw Lead | Ofogh | `src/modules/ofogh/public` |
| Order | Nabz | `src/modules/nabz/public` |
| Activity | Pooyesh | `interactionFacade`, `pooyesh/public` |
| Task | Pooyesh | `taskFacade` |
| Subject resolution | Pooyesh | `ports/subjectEntity.port` |

Enforcement: `npm run check:module-boundaries`. Owner-module UI may still use its own store internally; foreign modules must import from the public barrel only.
