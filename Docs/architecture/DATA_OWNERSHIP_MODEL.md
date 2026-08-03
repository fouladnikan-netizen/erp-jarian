# Data Ownership Model

> **Status:** Persistence-readiness documentation — **no database, no Prisma, no store changes**.  
> **Related:** [ENTITY_OWNERSHIP.md](./ENTITY_OWNERSHIP.md) (module/lifecycle view), [10-DATA_ARCHITECTURE_AUDIT.md](./10-DATA_ARCHITECTURE_AUDIT.md), [PERSISTENCE_BOUNDARY.md](./PERSISTENCE_BOUNDARY.md)

This map answers: **which aggregate owns the data, where it lives today, and who should own persistence later.**

Runtime name **Contact** ≡ domain **Company**.

---

## Company

| Field | Value |
|-------|--------|
| **Owner aggregate** | Company (root) |
| **Current storage** | `useContactsStore` (Zustand, in-memory); seeded from `contactsData.js` |
| **Future persistence owner** | Party/Company repository + table (or document) behind the same store facade |
| **Known risks** | Lost on refresh; numeric ids; denormalized `relatedOrders` snapshots |

---

## ContactPerson

| Field | Value |
|-------|--------|
| **Owner aggregate** | Company (embedded 1:N `relatedPersons[]`) |
| **Current storage** | Same Contacts store + `src/domain/contactPerson/` normalize |
| **Future persistence owner** | Child rows / JSON under Company; keep `companyId` FK |
| **Known risks** | Prefix `cp` collides with customer payment ids; synthetic `self-{id}` for natural persons |

---

## Order

| Field | Value |
|-------|--------|
| **Owner aggregate** | Order (root, fat document) |
| **Current storage** | `useNabzStore.orders`; boot via `OrderRepository` ← `ordersData` / mock |
| **Future persistence owner** | Order repository with full create/update (not status-only); store remains client cache |
| **Known risks** | Most writes via `setOrders` never hit API; domain `id: string` vs runtime number; god-document size |

---

## OrderItem

| Field | Value |
|-------|--------|
| **Owner aggregate** | Order (embedded `items[]`, often with nested `inquiries[]`) |
| **Current storage** | Inside Order document |
| **Future persistence owner** | Order line table or embedded document lines; inquiries as children of line |
| **Known risks** | Optional/weak `productId`; name/unit snapshots diverge from Product catalog |

---

## Product

| Field | Value |
|-------|--------|
| **Owner aggregate** | Product (should be root; **not** today) |
| **Current storage** | Vitrin page `useState` + `catalogData.js` seed |
| **Future persistence owner** | Product repository / catalog store; Order lines keep explicit snapshots |
| **Known risks** | No Zustand SSOT; `Date.now()` ids on create; Nabz only snapshots |

---

## Supplier

| Field | Value |
|-------|--------|
| **Owner aggregate** | Company (`entityType === supplier`) |
| **Current storage** | Contacts store; Nabz reads via `suppliers.js` facade |
| **Future persistence owner** | Same Party/Company persistence (typed role/facet) |
| **Known risks** | Never reintroduce a parallel supplier registry; inquiry `supplierId` must stay stable |

---

## Opportunity

| Field | Value |
|-------|--------|
| **Owner aggregate** | Company (view via `lifecycle_stage`) |
| **Current storage** | Fields on Company in Contacts store; Ofogh is UX only |
| **Future persistence owner** | Still Company columns **or** optional Opportunity facet table keyed by `companyId` |
| **Known risks** | Treating Opportunity as a separate write root without product need duplicates SSOT |

---

## Activity

| Field | Value |
|-------|--------|
| **Owner aggregate** | **Split today** — Company interactions **or** Order `crmActivities` / `events[]` |
| **Current storage** | Embedded arrays on Company or Order; calendar mocks separate |
| **Future persistence owner** | Single Activity store/table with `companyId` and/or `orderId` (پویش as UX owner) |
| **Known risks** | Three streams; migration must map all three; mock `activityLog` unused |

---

## CalendarEvent

| Field | Value |
|-------|--------|
| **Owner aggregate** | Projection (not a write root today) |
| **Current storage** | Derived commitments + `MOCK_*` in calendar modules |
| **Future persistence owner** | Either derived index over Activity/Order dates **or** dedicated events table fed by those SSOTs |
| **Known risks** | Mock-heavy; easy to invent a fourth activity source |

---

## Document

| Field | Value |
|-------|--------|
| **Owner aggregate** | Usually Order (profile attachments, QC files, proforma archives) |
| **Current storage** | Metadata on Order (`profileAttachments`, QC, `pf-*` events); filenames / occasional data URLs |
| **Future persistence owner** | Document metadata table + object storage; FK to Order (and optionally Company) |
| **Known risks** | No blob store; ids mix counters and `createEntityId` |

---

## Invoice

| Field | Value |
|-------|--------|
| **Owner aggregate** | Order (proforma versions + saranjam sales invoice flags/snapshots) |
| **Current storage** | Embedded `order.proforma`, saranjam invoice fields |
| **Future persistence owner** | Invoice/Proforma entities linked to Order; keep version history |
| **Known risks** | Domain `PreInvoice` type unused by runtime; saranjam invoice partly UI-driven |

---

## Payment

| Field | Value |
|-------|--------|
| **Owner aggregate** | Order (saranjam `customerPayments` / `supplierPayments`; CRM payment activities) |
| **Current storage** | Mutable arrays on Order; CRM may dual-write into saranjam |
| **Future persistence owner** | Immutable ledger / payment entries with Order FK (financial audit) |
| **Known risks** | Mutable; dual write; `cp` id prefix collision with ContactPerson; weak audit trail |

---

## Ownership rules (stabilization)

1. New entities must be added to **this file** (and [ENTITY_OWNERSHIP.md](./ENTITY_OWNERSHIP.md) if module/lifecycle differs).  
2. Do not give UI pages ownership of Company, Order, or Product master data.  
3. Cross-module links use stable ids (`customerId`, `supplierId`, `productId`) — not array indexes or display names.

---

## Explicit non-goals

No Prisma, no DB migration, no Zustand replacement, no repository implementation in this phase.
