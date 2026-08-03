# Entity Ownership

> **Status:** Documentation only — no persistence or aggregate redesign.  
> **Related:** [AGGREGATE_BOUNDARIES.md](./AGGREGATE_BOUNDARIES.md), [SSOT.md](./SSOT.md), [07-DOMAIN_MODEL_AUDIT.md](./07-DOMAIN_MODEL_AUDIT.md)

Runtime field names often say **Contact**; domain language prefers **Company**. See `src/domain/party/naming.js`.

New string/numeric IDs for created records use `src/domain/identity` (`createEntityId` / `createNumericId`). Seed and existing in-memory IDs are never rewritten.

---

## Company (Contact)

| Field | Value |
|-------|--------|
| **Owner Module** | کانون (Kanoon) as primary UX; shared store is the write SSOT |
| **Aggregate** | Company root |
| **Current Storage** | `useContactsStore` (Zustand, in-memory + seed from `contactsData.js`) |
| **Lifecycle** | Created/edited in Kanoon; Ofogh advances `lifecycle_stage`; Nabz links via `contactId` |
| **Future Direction** | Persist as party/company table; keep ContactPerson 1:N; optional Opportunity facet URL |

---

## ContactPerson (relatedPersons)

| Field | Value |
|-------|--------|
| **Owner Module** | Company aggregate (not a standalone module) |
| **Aggregate** | Embedded under Company |
| **Current Storage** | `contact.relatedPersons[]` via `useContactsStore` + `src/domain/contactPerson/` |
| **Lifecycle** | CRUD through store / ContactPerson modal; natural-person “self” via `naturalPersonSelfId` |
| **Future Direction** | Remain 1:N under Company; do not introduce M:N Person registry without product need |

---

## Opportunity / Lead

| Field | Value |
|-------|--------|
| **Owner Module** | افق (Ofogh) owns the **pipeline UX**; entity data owned by Company |
| **Aggregate** | Same as Company (`lifecycle_stage`, follow-up dates, interactions) |
| **Current Storage** | No separate table — filters on `useContactsStore` |
| **Lifecycle** | Stage moves in Ofogh; board cards are Company projections |
| **Future Direction** | Optional addressable Opportunity facet; **do not** split aggregate until DB exists |

---

## Interaction (Company activity)

| Field | Value |
|-------|--------|
| **Owner Module** | Company timeline (Kanoon / Ofogh surfaces) |
| **Aggregate** | Company |
| **Current Storage** | `contact.interactions[]` |
| **Lifecycle** | Appended on CRM touch; IDs via `createInteractionId` |
| **Future Direction** | Unify with Activity SSOT under پویش when Activity model is funded (see SSOT) |

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
| **Lifecycle** | Order-scoped; distinct from Company `interactions` |
| **Future Direction** | Payment / Activity extraction deferred (medium/high cost) |

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
| **Owner Module** | کمپین (Kampayn) |
| **Aggregate** | Isolated mock roots |
| **Current Storage** | Component state / `campaignsData` / survey builder |
| **Lifecycle** | Create/activate in dashboard; IDs via `createEntityId` |
| **Future Direction** | Link to Company/Order events when CRM automation is real |

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
