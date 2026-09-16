# Security Risk Register

> **Status:** Living register from Security & Identity Audit.  
> **No remediation implementation in this phase.**  
> **Related:** [11-SECURITY_IDENTITY_AUDIT.md](./11-SECURITY_IDENTITY_AUDIT.md), [IDENTITY_MODEL.md](./IDENTITY_MODEL.md), [AUTHORIZATION_MODEL.md](./AUTHORIZATION_MODEL.md)

---

## Critical

| ID | Risk | Detail | Mitigation direction (future) |
|----|------|--------|-------------------------------|
| SC1 | **Mock authentication** | Any non-empty password; fake token | Real auth API; revoke mock in production |
| SC2 | **Hardcoded actors** | `CURRENT_USER` / `LEADER` drive ACL + audit | Identity Context → Domain Actor |
| SC3 | **Missing authorization enforcement** | Shirazeh matrix unused on Nabz/Ofogh; Ofogh unchecked | Enforce one policy at mutation + server |
| SC4 | **In-memory SoR + no locks** | Multi-user lost updates; client bypass | Persist + concurrency + server authz |

---

## High

| ID | Risk | Detail | Mitigation direction (future) |
|----|------|--------|-------------------------------|
| SH1 | **Multiple role vocabularies** | Nabz / Users / RBAC / Org / Calendar | Single vocabulary ([ROLE_MATRIX.md](./ROLE_MATRIX.md)) |
| SH2 | **Missing ownership rules** | Assignee display-only; OWN/TEAM unused | [DATA_ACCESS_POLICY.md](./DATA_ACCESS_POLICY.md) + queries |
| SH3 | **No logout / no token expiry** | Sticky browser session | Session lifecycle |
| SH4 | **Token in localStorage** | XSS exposure | httpOnly/secure session strategy |
| SH5 | **UI privilege toggles** | Saranjam `isAdmin` checkbox | Remove; use real Admin / OVERRIDE |
| SH6 | **Actor ≠ login user** | False financial/ops attribution | Bind audit to Identity Context |

---

## Medium

| ID | Risk | Detail | Mitigation direction (future) |
|----|------|--------|-------------------------------|
| SM1 | **Missing audit trail details** | No field-level before/after; payments lack `recordedBy` | Ledger + richer events |
| SM2 | **Unguarded preview/survey routes** | Auth bypass surfaces | Explicit public vs protected policy |
| SM3 | **No API 401 handling** | Stale Bearer | Interceptor → clear session |
| SM4 | **forcePasswordChange unused** | Flag without login enforcement | Wire when real users exist |
| SM5 | **Org audit actor hardcoded `admin`** | Fake trail in designer | Identity Context |
| SM6 | **Accounting/QC/Warehouse roles absent** | Gaps in product RBAC | Extend [ROLE_MATRIX.md](./ROLE_MATRIX.md) then implement |

---

## Low

| ID | Risk | Detail |
|----|------|--------|
| SL1 | Calendar roles unrelated to RBAC | Naming confusion |
| SL2 | ContactPerson job titles confused with RBAC | Documented separation |

---

## Explicit non-goals

No auth provider, no RBAC merge, no permission matrix edits, no UI security chrome in this phase.
