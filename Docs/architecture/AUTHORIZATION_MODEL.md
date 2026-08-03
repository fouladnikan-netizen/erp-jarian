# Authorization Model

> **Status:** Inventory + **future** target model. **Do not merge** permission systems in this phase.  
> **Related:** [11-SECURITY_IDENTITY_AUDIT.md](./11-SECURITY_IDENTITY_AUDIT.md), [ROLE_MATRIX.md](./ROLE_MATRIX.md), [DATA_ACCESS_POLICY.md](./DATA_ACCESS_POLICY.md)

---

## Future model (target — not implemented)

```
User  →  Role(s)  →  Permission(s)  →  Policy (scope + resource + action)
```

| Concept | Meaning |
|---------|---------|
| **User** | Authenticated subject (`userId`) |
| **Role** | Named job function (Sales, Purchase, …) — single vocabulary |
| **Permission** | Atomic capability (`VIEW_ORDER`, `EDIT_MARGIN`, …) |
| **Policy** | Permission + **scope** (OWNER / TEAM / DEPARTMENT / ALL) + optional conditions |

Enforcement order (future): **server/mutation boundary first**; UI may hide controls but is never sufficient alone.

---

## Current permission systems (do not merge)

### 1. Shirazeh permissions (RBAC matrix)

| Field | Value |
|-------|--------|
| **Location** | `permissionsRegistry.js`, `permissionsStore.js`, Permissions UI |
| **Roles** | `sales_manager`, `procurement_manager`, `sales_expert`, `ops_coordinator` |
| **Scopes** | `OWN`, `TEAM`, `ALL` |
| **Examples** | `VIEW_ORDER`, `EDIT_ORDER`, `VIEW_MARGIN`, `VIEW_PURCHASE_PRICE` |
| **Enforced on Nabz/Ofogh?** | **No** — admin UI / in-memory only |

### 2. Nabz permissions (operational ACL)

| Field | Value |
|-------|--------|
| **Location** | `orderEditPermissions.js`, `canViewSupplierIdentity` in `nabz/constants.js` |
| **Roles** | `knight`, `explorer`, `leader`, `branch`, `watcher`, `manager` |
| **Checks** | `canEditInquiryPrices`, `canEditProfitMargin`, `canEditWholeOrder`, supplier visibility |
| **Default role** | Compile-time `CURRENT_USER_ROLE = LEADER` |
| **Enforced on Nabz?** | **Yes** — against that constant (so effectively full access) |
| **Enforced on Ofogh?** | **No** |

### 3. UI-only checks

| Location | Behavior |
|----------|----------|
| `SaranjamTab` `isAdmin` checkbox | Local `useState` — not RBAC |
| Calendar role filter | Display filter (`rahbar`, …) — not ACL |
| Optional assignee column filters | User choice — not ownership policy |
| `RequireAuth` | Authentication only (token present) |

### 4. Adjacent (not system RBAC)

| System | Role-like ids | Used for ACL? |
|--------|---------------|---------------|
| Shirazeh `usersRoles` | `ceo`, `sales`, `supply`, `ops`, `admin` | Users admin labels only |
| Org tree | `SALES_MANAGER`, `MEMBER`, … | Designer only |
| ContactPerson jobs | `warehouse`, `finance_manager`, … | Party titles — **not** permissions |

---

## Conflicts (documented, unresolved)

| Conflict | Detail |
|----------|--------|
| **Vocabulary** | Nabz nicknames ≠ Shirazeh RBAC ids ≠ usersRoles ≠ org tree casing |
| **Source of truth** | Matrix can deny `VIEW_MARGIN` while Nabz `LEADER` always allows margin edit |
| **Scope** | Shirazeh OWN/TEAM/ALL never applied to queries |
| **Ofogh** | No permission checks beyond login |
| **UI vs policy** | Hiding controls ≠ authorization |

**Decision this phase:** leave all systems as-is; new work must not invent a fifth vocabulary (see security Cursor rule). Prefer documenting intended permission against [ROLE_MATRIX.md](./ROLE_MATRIX.md) until a funded merge.

---

## Explicit non-goals

No RBAC implementation, no merging role ids, no changing `orderEditPermissions` behavior.
