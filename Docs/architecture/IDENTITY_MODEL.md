# Identity Model

> **Status:** Living — Client session SSOT aligned with Backend JWT (2026-08).  
> **Related:** [AUTHORIZATION_MODEL.md](./AUTHORIZATION_MODEL.md), [CLIENT_STATE_SSOT.md](./CLIENT_STATE_SSOT.md)

---

## Canonical path (as-is)

```
Login / GET /auth/me
  → accessToken + user { id, username, displayName, roles, permissions[] }
  → authSession (localStorage profile)
  → useSessionStore (React)
  → can(permission) / capabilities
  → UI hide/disable
```

| Concept | Implementation |
|---------|----------------|
| **Production login** | `POST /api/v1/auth/login` → JWT + permissions |
| **Session refresh** | `hydrateAuthProfile()` → `GET /api/v1/auth/me` on bootstrap |
| **Client SSOT** | `src/modules/auth/authSession.js` + `src/stores/useSessionStore.js` |
| **Display actor** | `getCurrentUser()` / `getSessionDisplayName()` — **UX stamps only** |
| **Audit actor (writes)** | Backend `req.auth.userId` from JWT — never trust FE actorId |
| **Mock mode** | `VITE_USE_MOCK_API=true` → `MOCK_AUTH_FIXTURE` (full permission set for offline UX) |

**Security boundary = Backend `requirePermission`.** Frontend permissions are presentation only.

---

## Deprecated / legacy

| Legacy | Status |
|--------|--------|
| Hardcoded `CURRENT_USER = 'علی رضایی'` as ops identity | Replaced by `getCurrentUser()` reading session |
| Shirazeh `permissionsStore` matrix | Admin design UI only — use `backendPermissionAdapter` for ops mirrors |
| Nabz `USER_ROLES` nicknames | Presentation fine-grain **after** `orders:write` |
