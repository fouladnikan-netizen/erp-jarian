# Role Matrix (target product roles)

> **Status:** Product-facing role definitions for **future** RBAC.  
> **Not implemented.** Does not replace Nabz/Shirazeh vocabularies yet.  
> **Related:** [AUTHORIZATION_MODEL.md](./AUTHORIZATION_MODEL.md), [DATA_ACCESS_POLICY.md](./DATA_ACCESS_POLICY.md)

Map loosely to today’s nicknames where helpful — **do not** treat this as a rename mandate.

---

## Sales

| Field | Value |
|-------|--------|
| **Approx today** | Nabz `knight` / شوالیه; users `sales`; RBAC `sales_expert` |
| **Responsibilities** | Own customer relationships; create/pursue opportunities; create orders; customer-facing docs |
| **Required permissions (future)** | `VIEW_ORDER` (OWNER/TEAM), `CREATE_ORDER`, `EDIT_ORDER` (own), limited CRM activity; **no** purchase price / margin unless policy says |
| **Owned entities (conceptual)** | Assigned Companies (customers), Opportunities on those companies, Orders where assignee |

---

## Sales Manager

| Field | Value |
|-------|--------|
| **Approx today** | Nabz `leader`; RBAC `sales_manager`; calendar `rahbar` |
| **Responsibilities** | Team pipeline; approve returns/escalations; view margins; override team order edits within policy |
| **Required permissions (future)** | Sales permissions at **TEAM** (or DEPARTMENT) scope; `VIEW_MARGIN`; revision/approval actions |
| **Owned entities** | Team’s Companies / Orders; approval on revisions |

---

## Purchase

| Field | Value |
|-------|--------|
| **Approx today** | Nabz `explorer` / کاشف; users `supply`; RBAC `procurement_manager` / procurement expert |
| **Responsibilities** | Supplier inquiries; PO/tadarok; purchase prices; supplier identity |
| **Required permissions (future)** | `VIEW_PURCHASE_PRICE`, inquiry edit, tadarok/PO actions; supplier Company access; **restricted** customer PII if policy requires |
| **Owned entities** | Supplier Companies (assigned), purchase-side Order stages / POs |

---

## Accounting

| Field | Value |
|-------|--------|
| **Approx today** | Largely **missing** as system RBAC; calendar `saraf` label only |
| **Responsibilities** | Settlement, invoices, payments, financial close/archive gates |
| **Required permissions (future)** | Financial view/edit on settlement & payments; invoice issue; archive readiness; audit export |
| **Owned entities** | Payment / invoice records on Orders; financial documents |

---

## QC

| Field | Value |
|-------|--------|
| **Approx today** | **Missing** as system role |
| **Responsibilities** | Quality inspections, QC documents, pass/fail/conditional |
| **Required permissions (future)** | QC create/edit on Order; view related shipment lines; no margin/purchase unless needed |
| **Owned entities** | QC documents / inspection records |

---

## Warehouse

| Field | Value |
|-------|--------|
| **Approx today** | ContactPerson job `warehouse`; calendar `safir` ≈ logistics — **not** RBAC |
| **Responsibilities** | Loading, weights, dispatch, shipping vouchers, rahsepar ops |
| **Required permissions (future)** | Rahsepar/shipping actions; view Order logistics; limited financial |
| **Owned entities** | Shipment / loading assignments; logistics documents |

---

## Admin

| Field | Value |
|-------|--------|
| **Approx today** | users `admin` / `ceo`; org `ORG_ADMIN`; Saranjam local “admin” checkbox (**not** real Admin) |
| **Responsibilities** | User/role/permission config; org structure; break-glass override |
| **Required permissions (future)** | Security admin actions; **ADMIN OVERRIDE** scope (see access policy); not day-to-day sales edits by default |
| **Owned entities** | Platform config (users, roles, permissions, org) — not business master data by default |

---

## Notes

1. **Ops / Branch / Watcher** (Nabz) may later map to read-only or branch-scoped variants — not expanded here.  
2. Until Identity Context exists, this matrix is **planning only**.  
3. Adding a new product role requires updating this file and [AUTHORIZATION_MODEL.md](./AUTHORIZATION_MODEL.md) — do not invent module-local role strings.
