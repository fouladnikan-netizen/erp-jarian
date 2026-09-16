# Authorization Model

> **Status:** Living — Backend RBAC is authority; FE mirrors codes (2026-08).  
> **Related:** [IDENTITY_MODEL.md](./IDENTITY_MODEL.md), [ROLE_MATRIX.md](./ROLE_MATRIX.md)

---

## Authority

```
Backend permission catalog (`permissions` table, **DDL-36**)
  → `roles` CRUD + `role_permissions` (Shirazeh: `/api/v1/rbac`)
  → requirePermission on routes (canonical colon codes)
  → login/me returns permissions[]
  → FE catalog src/auth/permissions.catalog.js
  → can() / capabilities for UI
```

### Backend codes (canonical)

Colon form is still the stored PK and the value in JWT/`requirePermission`:

```
companies:read | companies:write
orders:read | orders:write
leads:read | leads:write | leads:convert
activities:read | activities:write
tasks:read | tasks:write
correspondence:read | correspondence:write | correspondence:finalize
products:read | products:write | products:lifecycle | products:manage-*
users:admin
```

Catalog rows also expose `resource`, `action`, `category`, `isSensitive`. Dotted aliases (`orders.read`, `orders.view`) resolve to the colon code when saving grants — they are **not** a second SoR.

Do **not** invent FE-only permission codes. Do **not** change `requirePermission` strings on operational routes without a later DDL.

`/api/v1/organization` (units, positions, assignments, tree) is gated by `users:admin`. Organization Position is not an RBAC role and does not grant permissions.

**Persona is not authorization (DDL-40 / DDL-42 / DDL-44).** Persona is persisted Definitions data. A Role may point to a Persona for UX identity (`persona_role_links`); that link does not grant permissions. Position does not grant permissions. Only Role → Permission controls `requirePermission`.

---

## Layers (do not conflate)

| Layer | Meaning | Example |
|-------|---------|---------|
| **Security permission** | May the user invoke the API action at all? | `orders:write` via Role |
| **Persona** | Product/cultural working-domain identity — **not** a permission source | شوالیه / سامورایی (`personas` + `persona_role_links`, DDL-42 / DDL-44) |
| **Position** | Organizational job title — **not** a permission source | کارشناس فروش |
| **Business rule** | Is this Order/Lead valid for the action? | stage machine / convert status |
| **Presentation** | Nabz nickname UX (margin editors) | `canEditProfitMargin` after write |

UI hide ≠ authorization. `403` must not log the user out (`401` does).

---

## Current FE systems

| System | Role |
|--------|------|
| `src/auth/*` + `useSessionStore` | **Canonical** ops capability mirror |
| Shirazeh `permissionsStore` | UI cache for Role CRUD + live `role_permissions` matrix (`users:admin`) |
| Nabz `orderEditPermissions` | Fine UX gated by `orders:write` first |
