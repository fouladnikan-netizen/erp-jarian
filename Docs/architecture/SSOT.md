# Single Source of Truth (SSOT)

> **Status:** Inventory + recommendations — **no SSOT migrations** in this phase unless already done and low-risk.  
> **Related:** [ENTITY_OWNERSHIP.md](./ENTITY_OWNERSHIP.md), [06-FUTURE_RECOMMENDATIONS.md](./06-FUTURE_RECOMMENDATIONS.md)

---

## How to read this table

| Column | Meaning |
|--------|---------|
| **Current source** | Authoritative write location today |
| **Duplicate sources** | Parallel copies, seeds, or conflicting writers |
| **Recommended future source** | Target after a funded migration |

---

## Party / CRM

### Company (Contact / Customer / Supplier)

| | |
|--|--|
| **Current source** | `useContactsStore` |
| **Duplicate sources** | Historical seed `initialContacts` if read directly; any module-local customer arrays |
| **Recommended future source** | Persisted Party/Company API behind the same store facade |

**Note:** Nabz `suppliers.js` and `customers.js` must facade the store (not the seed).

### ContactPerson

| | |
|--|--|
| **Current source** | `contact.relatedPersons` + `src/domain/contactPerson/` |
| **Duplicate sources** | Legacy field aliases (`name`/`role`); synthetic `self-{id}` for natural persons |
| **Recommended future source** | Same embed; normalize always through domain helpers |

### Opportunity (Company capability)

| | |
|--|--|
| **Current source** | Company + `lifecycle_stage` (constants in `domain/party`) — **DDL-04** |
| **Duplicate sources** | UX copy saying “فرصت” as if separate DB row |
| **Recommended future source** | Keep view-based until product requires Opportunity entity |

### Raw Lead (Ofogh aggregate)

| | |
|--|--|
| **Current source** | PostgreSQL `raw_leads` + `/api/v1/leads` (**DDL-13** implemented); `useLeadsStore` = cache only |
| **Duplicate sources** | Historical conflation with Opportunity/Company facet (resolved by **DDL-13**) |
| **Recommended future source** | Linka production adapter; keep Lead row after CONVERTED for attribution |

### Activity

| | |
|--|--|
| **Architecture (locked)** | **DDL-15** — Pooyesh owns soft-CRM Activity; SSOT = PostgreSQL `activities`; subject = `COMPANY` \| `RAW_LEAD` only |
| **Current source** | PostgreSQL `activities` + `/api/v1/activities`; `useActivitiesStore` = cache |
| **Out of unify** | Nabz Order `crmActivities`, Order operational events, finance events, `audit_log` |
| **Legacy** | Parent `interactions[]` not auto-migrated; mock offline may still use them |

---

## Order / Ops

### Order document

| | |
|--|--|
| **Current source** | Nabz orders store / context |
| **Duplicate sources** | Denormalized `relatedOrders` on Company (if present); Omni static seeds |
| **Recommended future source** | Persisted Order aggregate API |

### Order status

| | |
|--|--|
| **Current source** | **Dual** — Nabz UI `ORDER_TABS` / stage ids **and** domain `OrderStatus` (`src/domain/order/`) |
| **Duplicate sources** | Bridges in `order.constants.ts`; operational phase enums |
| **Recommended future source** | Domain `OrderStatus` as write SSOT; UI maps labels only (**unsafe to force now** — document only) |

### Quoting / pricing math

| | |
|--|--|
| **Current source** | `quotingService` / related Nabz services |
| **Duplicate sources** | Ad-hoc recalculation in UI components (risk) |
| **Recommended future source** | Domain quoting module only; UI displays results |

### Settlement / payments

| | |
|--|--|
| **Current source** | Saranjam services + CRM payment helpers on Order |
| **Duplicate sources** | Settlement math also surfaces in `SaranjamTab.jsx` |
| **Recommended future source** | Domain settlement service + Payment child entity later |

---

## Catalog

### Product

| | |
|--|--|
| **Current source** | Weak — Vitrin local/component state |
| **Duplicate sources** | Order line name/description/unit snapshots |
| **Recommended future source** | Product store + explicit snapshot-on-order-line policy |

---

## Platform

### User

| | |
|--|--|
| **Current source** | Shirazeh `usersStore` (mock) |
| **Duplicate sources** | Org tree user nodes; `CURRENT_USER` constants in Nabz |
| **Recommended future source** | Auth service; single user id in session |

### Roles / permissions

| | |
|--|--|
| **Current source** | Shirazeh role registry |
| **Duplicate sources** | ContactPerson job positions; assignee role labels in Kanoon; org `defaultRole` |
| **Recommended future source** | Separate **RBAC role** vs **job title** vs **ContactPerson jobPosition** taxonomies (clarify, don’t merge blindly) |

### Campaign / Survey

| | |
|--|--|
| **Current source** | Kampayn module state |
| **Duplicate sources** | None critical |
| **Recommended future source** | Persist when automation hooks into Company/Order events |

---

## Identity

### Entity IDs

| | |
|--|--|
| **Current source** | `src/domain/identity` for **new** records |
| **Duplicate sources** | Remaining `Date.now()` / `Math.random()` in older Nabz paths (migrate opportunistically) |
| **Recommended future source** | Same helper → UUID/ULID from backend when DB arrives |

**Do not** rewrite seed IDs or migrate historical in-memory ids.

---

## Constants already centralized (safe)

| Concept | Location |
|---------|----------|
| `ENTITY_TYPES` / `PERSON_TYPES` | `src/domain/party/party.constants.js` (Kanoon re-exports) |
| `LIFECYCLE_STAGES` | `src/domain/party/lifecycle.constants.js` (store re-exports) |
| ContactPerson genders / jobs | `src/components/contactPerson/contactPersonRoles.js` |
| Domain OrderStatus types | `src/domain/order/` |
| Entity ID prefixes | `src/domain/identity` |

## Constants deferred (unsafe / dual-runtime)

| Concept | Why deferred |
|---------|----------------|
| Full Order status unification | UI stages + domain enums both live; bridge only |
| Activity type enums | Three streams |
| Supply-type chips vs supplier party types | Different concepts; don’t collapse |

---

## Contributor rule

Before adding a new list of customers, suppliers, products, or activities in a module: **find the SSOT row above**. If missing, add a row here first — do not invent a parallel array.
