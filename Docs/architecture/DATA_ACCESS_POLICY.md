# Data Access Policy (future)

> **Status:** Conceptual ownership / scope model — **not enforced** today.  
> Assignee fields are display-only. Shirazeh `OWN`/`TEAM`/`ALL` are UI matrix scopes only.  
> **Related:** [AUTHORIZATION_MODEL.md](./AUTHORIZATION_MODEL.md), [DATA_OWNERSHIP_MODEL.md](./DATA_OWNERSHIP_MODEL.md), [ROLE_MATRIX.md](./ROLE_MATRIX.md)

---

## Scope concepts (future)

| Scope | Meaning |
|-------|---------|
| **OWNER** | Subject is the assigned owner (`assigneeId` / owner user id) |
| **TEAM** | Subject shares a team with the owner (sales team, supply cell, …) |
| **DEPARTMENT** | Subject is in the same department (org unit) as the resource’s owning unit |
| **ADMIN OVERRIDE** | Break-glass: Admin (or designated security role) may access beyond normal scope — must be audited |

Legacy Shirazeh labels `OWN` / `TEAM` / `ALL` map conceptually to OWNER / TEAM / (DEPARTMENT or global). Prefer the names above in new docs.

---

## How scopes apply (conceptual)

| Resource | OWNER | TEAM | DEPARTMENT | ADMIN OVERRIDE |
|----------|-------|------|------------|----------------|
| **Company** | Assigned sales/supply owner | Peer assignees in same team | Dept CRM view | Full party admin |
| **Order** | Order assignee | Team pipeline | Ops dept for logistics stages | Full order admin |
| **Opportunity** | Same as Company (lifecycle view) | Team board | Dept funnel | Full |
| **Activity** | Author or related Company/Order owner | Team feed | Dept | Full |
| **Documents** | Uploader or parent Order/Company owner | Team on parent | Dept | Full + delete |
| **Financial records** | Accounting owner / settlement role | Finance team | Finance dept | Full + void/reverse (audited) |

**Policy composition (future):** `Permission` ∧ `Scope` ∧ `Resource` (and optional stage constraints).

---

## Current vs future

| Today | Future |
|-------|--------|
| `assignee` string on Order/Company | `ownerUserId` (+ display name snapshot) |
| No list filtering by auth user | Repository/query applies OWNER/TEAM/… |
| Matrix scopes unused | Same scopes evaluated server-side |
| Saranjam “admin” checkbox | ADMIN OVERRIDE via real Admin role + audit |

---

## Enforcement rules (when built)

1. UI hiding is **not** access control.  
2. Mutations check policy; reads honor scope for list/detail.  
3. ADMIN OVERRIDE always writes an audit event.  
4. Cross-module access still uses stable entity ids (see data architecture rules).

---

## Explicit non-goals

No ownership filters, no scope wiring, no Admin override implementation in this phase.
