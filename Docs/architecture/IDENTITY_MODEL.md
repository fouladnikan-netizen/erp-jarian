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

## Persona vs Position vs Role (DDL-40)

These three are **not interchangeable**. Do not infer one from another.

| Concept | Meaning | Grants permissions? | Stored now? |
|---------|---------|---------------------|-------------|
| **Persona** | Product/cultural identity of the working domain | **No** | **Yes** — `personas` (DDL-42) + `persona_role_links` (DDL-44); **not** on User |
| **Position** | Organizational job title (`organization_positions`) | **No** | Yes — org assignment |
| **Role** | RBAC security principal (`roles` → permissions) | **Yes** — only this path | Yes — `user_roles` |

Canonical Personas are **seeded data** (codes immutable; name/domain editable in Definitions). Seed defaults:

| Code | Display (seed) | Domain (seed) |
|------|----------------|---------------|
| `SALES` | شوالیه | فروش |
| `PROCUREMENT` | سامورایی | تأمین |
| `FINANCE` | مُستوفی | مالی و حسابداری |
| `LOGISTICS` | قافله‌سالار | لجستیک |
| `QUALITY` | عیارگر | کنترل کیفیت |
| `SYSTEM` | سپهسالار | مدیریت سیستم |

Do **not** add `personaId` on `users` or Create/Edit User persona fields. Do not rename Roles/Positions to Persona names. Do not treat seed names as constants in business rules. Role → Persona is a **catalog identity** only (`persona_role_links`, **DDL-44**): one Role may have at most one Persona; one Persona may have many Roles. That link does not grant permissions.

---

## User account vs future HR (DDL-39 / DDL-41)

| Owner | Canonical for |
|-------|----------------|
| **User (now)** | Authentication identity (login **mobile** + `password_hash`), internal `username`, `account_status`, `user_roles` |
| **User (now, until HR exists)** | `display_name`, organizational `mobile` / `email`, org assignment |
| **Future همراهان / Employee** | Employee profile: full name, organizational mobile/email, placement, employment — **linked to** User, not replacing the account |
| **Not now** | Employee tables, Persona→User assignment |

`account_status`: INVITED (created, no password yet), ACTIVE (may authenticate), INACTIVE (administratively disabled).

Authentication lifecycle (**DDL-41**):

```
INVITED → Faraz SMS invitation → /set-password?token= → password → ACTIVE → login(mobile + password)
ACTIVE  → forgot password → Faraz SMS OTP → verify → new password → login(mobile + password)
```

`users.username` remains an internal compatibility key (generated `user_N`; existing seeded usernames still authenticate).

---

## Deprecated / legacy

| Legacy | Status |
|--------|--------|
| Hardcoded `CURRENT_USER = 'علی رضایی'` as ops identity | Replaced by `getCurrentUser()` reading session |
| Shirazeh permission matrix | Admin UI for `role_permissions` (`GET/PUT /api/v1/rbac`); Zustand is cache/pending only |
| Nabz `USER_ROLES` nicknames | Presentation fine-grain **after** `orders:write` |
