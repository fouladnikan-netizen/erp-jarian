# Identity Model

> **Status:** Documentation — **no auth provider, no session rewrite**.  
> **Related:** [11-SECURITY_IDENTITY_AUDIT.md](./11-SECURITY_IDENTITY_AUDIT.md), [AUTHORIZATION_MODEL.md](./AUTHORIZATION_MODEL.md)

---

## Current state (as-is)

| Concept | Implementation | Notes |
|---------|----------------|-------|
| **Mock login** | `src/modules/auth/authSession.js` → `authenticate` | Any non-empty username/password; token `mock.{btoa(user)}.{time}` |
| **Session storage** | `localStorage`: `jarian_auth_token`, `jarian_auth_user`, `token` | Gate for `RequireAuth` only |
| **CURRENT_USER** | `src/modules/nabz/constants.js` → `'علی رضایی'` | **Actual ops / audit actor** for Nabz events, assignees, issuedBy |
| **LEADER (role)** | `CURRENT_USER_ROLE = USER_ROLES.LEADER` | Default input to `orderEditPermissions` → full edit access |
| **Audit actor** | `events[].by`, `revision.returnedBy`, CRM `author`, etc. | Almost always `CURRENT_USER`, **not** login username |
| **Platform users** | Shirazeh `usersStore` | Disconnected from login and Nabz actor |
| **Org tree people** | Organization mock nodes | Disconnected identity |

```
Login username ──► localStorage ──► RequireAuth (token present?)
                                         │
                                         ▼
                              ERP shell (any “user”)

CURRENT_USER / LEADER ──► Nabz services / canEdit* / events.by
```

`getAuthUsername()` is stored but **not** consumed as domain actor today.

---

## Identity stability

| Question | Answer today |
|----------|----------------|
| Stable user id? | **No** — display name constant + mock username string |
| Backend-ready? | **No** — mock token, no subject claims |
| Multi-user ready? | **No** — one hardcoded ops identity |

---

## Future recommendation (not implemented)

```
User (directory / IdP subject)
        ↓
Session (server-issued token + expiry)
        ↓
Identity Context (app-wide: userId, displayName, roles[])
        ↓
Domain Actor (stamped on events, revisions, payments, assignees)
```

| Layer | Responsibility |
|-------|----------------|
| **User** | Durable account; unique id; status; credentials/federation |
| **Session** | Authenticated period; refresh/revocation |
| **Identity Context** | Resolved claims for the running client/request |
| **Domain Actor** | `id` + display label used by domain/services for audit and ACL |

**Rules for that future:**

1. Domain Actor **must** derive from Identity Context — never a module constant.  
2. Login username alone is not enough; prefer opaque `userId`.  
3. `CURRENT_USER` / hardcoded LEADER remain **legacy** until Identity Context exists — do not add new hardcodes (see `.cursor/rules/jarian-security.mdc`).

---

## Explicit non-goals

No authentication implementation, no IdP, no Identity Context code in this phase.
