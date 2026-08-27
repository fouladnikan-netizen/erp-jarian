# Authorization Model

> **Status:** Living — Backend RBAC is authority; FE mirrors codes (2026-08).  
> **Related:** [IDENTITY_MODEL.md](./IDENTITY_MODEL.md), [ROLE_MATRIX.md](./ROLE_MATRIX.md)

---

## Authority

```
Backend permission codes (seed)
  → requirePermission on routes
  → login/me returns permissions[]
  → FE catalog src/auth/permissions.catalog.js
  → can() / capabilities for UI
```

### Backend codes (canonical)

```
companies:read | companies:write
orders:read | orders:write
leads:read | leads:write | leads:convert
activities:read | activities:write
tasks:read | tasks:write
users:admin
```

Do **not** invent FE-only permission codes.

---

## Layers (do not conflate)

| Layer | Meaning | Example |
|-------|---------|---------|
| **Security permission** | May the user invoke the API action at all? | `orders:write` |
| **Business rule** | Is this Order/Lead valid for the action? | stage machine / convert status |
| **Presentation** | Nabz nickname UX (margin editors) | `canEditProfitMargin` after write |

UI hide ≠ authorization. `403` must not log the user out (`401` does).

---

## Current FE systems

| System | Role |
|--------|------|
| `src/auth/*` + `useSessionStore` | **Canonical** ops capability mirror |
| Shirazeh `permissionsStore` | Matrix design UI; adapter maps action ids → backend codes |
| Nabz `orderEditPermissions` | Fine UX gated by `orders:write` first |
