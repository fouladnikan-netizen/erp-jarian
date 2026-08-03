# Security, Identity & Multi-user Architecture Audit

> **Status:** Audit only — no auth providers, no permission changes, no implementation.  
> **Canvas:** open [`jarian-security-identity-audit.canvas.tsx`](/Users/ehsanmohammadi/.cursor/projects/Users-ehsanmohammadi-Documents-ERP-Jaryan/canvases/jarian-security-identity-audit.canvas.tsx) beside chat  
> **Overall Score: 2.3 / 10**

## Capability verdict

| Need | Fit? |
|------|------|
| Multiple employees | **No** |
| Role-based access (real) | **No** — Nabz ACL vs constant `LEADER`; Shirazeh unused |
| Department separation | **No** |
| Enforceable data ownership | **No** |
| Approval workflows (trustworthy) | Partial revisions only; actor spoofable |
| Audit requirements | **No** for finance-grade attribution |

---

## Scorecard

| Dimension | Score |
|-----------|------:|
| Identity | 2.0 |
| Authentication | 2.5 |
| Authorization | 2.5 |
| Role Model | 2.0 |
| Data Ownership | 2.0 |
| Auditability | 3.0 |
| Multi-user Readiness | 1.5 |
| Scalability | 2.0 |
| **Overall** | **2.3** |

---

## 1. Identity

| Source | Role today | Multi-user ready? |
|--------|------------|-------------------|
| `authSession` username + mock token | Gate for `RequireAuth` | No — username unused as ops actor |
| `CURRENT_USER` / `CURRENT_USER_ROLE` (`nabz/constants.js`) | **Actual** Nabz actor + ACL input | No — hardcoded |
| `usersStore` | Shirazeh user admin UI | No — not linked to login |
| Org tree user nodes | Designer | No — free-text roles |

`getAuthUsername` has **no consumers** outside `authSession.js`.

---

## 2. Authentication

| Concern | Current | Missing |
|---------|---------|---------|
| Login | Any non-empty user/pass → mock token | Real verify, lockout, MFA |
| Token | `mock.btoa(user).time` in localStorage | JWT/opaque server token, expiry, refresh |
| Guard | `RequireAuth` on ERP shell | Per-module guards; logout UI |
| Unguarded | `/login`, surveys, proforma/shipping previews | Review exposure |
| Password | Plain; `forcePasswordChange` unused at login | Hash, policy, change flow |
| API | Bearer from `token`/`authToken` | 401 → clear session |

---

## 3. Authorization

| System | Enforced Nabz? | Enforced Ofogh? |
|--------|----------------|-----------------|
| Token present | Yes | Yes |
| `orderEditPermissions` / `canViewSupplierIdentity` | Yes vs **constant LEADER** | No |
| Shirazeh OWN/TEAM/ALL | **No** | **No** |
| usersRoles / org roles | **No** | **No** |
| Saranjam `isAdmin` checkbox | Local UI only | — |

**Duplication/conflict:** Fine-grained Shirazeh matrix vs coarse Nabz constants — only Nabz matters for ops; matrix is theater.

---

## 4. Role model

Incompatible ID spaces: Nabz (`knight`…), Users UI (`ceo`…), RBAC (`sales_manager`…), Org (`SALES_MANAGER`…), Calendar (`rahbar`…).

| Business need | Coverage |
|---------------|----------|
| Sales / Purchase / Manager | Mapped inconsistently across systems |
| Admin | Users/org only |
| Accounting / QC / Warehouse | Largely **missing** as system RBAC |

Granularity and scalability are poor until one vocabulary owns enforcement.

---

## 5. Data ownership

Assignee fields exist on Company/Order as **display**. Shirazeh `OWN`/`TEAM`/`ALL` never filters queries. Ownership **cannot** be enforced today.

---

## 6. Multi-user conflicts

- Single-tab Zustand memory; no cross-tab sync, websockets, or locks  
- Concurrent edits → last-write-wins  
- Permission bypass: edit constant or log in as anyone  
- Business SoR is browser memory (see data audit)

---

## 7. Audit trail

| Question | Support |
|----------|---------|
| Who? | `events.by` / `returnedBy` ≈ `CURRENT_USER` — not login |
| When? | Present; format mixed |
| Before/after? | Proforma versions strong; payments weak |
| Approvals? | `revisions[]` for returns |
| Financial? | Payments often lack `recordedBy` |

---

## 8. Top risks (Critical)

1. Mock auth accepts any password  
2. Ops actor ≠ login user  
3. `CURRENT_USER_ROLE = LEADER` always  
4. Shirazeh RBAC unused on ops  
5. No concurrency control / in-memory SoR  

Full Top 20 + maps: Canvas.

---

## 9. Future recommendations (not implemented)

1. Real authentication API; stop mock “any password.”  
2. Bind session user id + role into Nabz actor (`events.by`, ACL).  
3. One role vocabulary; enforce at mutation boundaries (client + server).  
4. Apply ownership scopes to Company/Order lists when product requires.  
5. Logout, expiry, httpOnly/secure session strategy.  
6. Concurrency tokens once persistence exists.  
7. Do not add an IdP before server-side authorization exists.

---

## Explicit non-goals

No auth provider integration, no permission matrix changes, no implementation in this phase.

## Cross-links

- [10-DATA_ARCHITECTURE_AUDIT.md](./10-DATA_ARCHITECTURE_AUDIT.md)  
- [DATA_OWNERSHIP_MODEL.md](./DATA_OWNERSHIP_MODEL.md)  
- [BUSINESS_RULE_OWNERSHIP.md](./BUSINESS_RULE_OWNERSHIP.md) (permissions row)
