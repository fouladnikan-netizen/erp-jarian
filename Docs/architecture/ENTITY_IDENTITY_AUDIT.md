# Entity Identity Audit

> **Status:** Inventory only — **do not rewrite existing seed/persisted ids**.  
> **Related:** `src/domain/identity/`, [10-DATA_ARCHITECTURE_AUDIT.md](./10-DATA_ARCHITECTURE_AUDIT.md), [DATA_MIGRATION_RISKS.md](./DATA_MIGRATION_RISKS.md)

Classifications:

| Class | Meaning |
|-------|---------|
| **Safe** | Prefer for **new** records going forward (session-local still OK until DB) |
| **Temporary** | Acceptable for demos / ephemeral UI; replace before multi-user persistence |
| **Migration risk** | Will break or collide when introducing a real database / multi-tab / multi-user |

---

## Shared factory (preferred for new string ids)

| Mechanism | Location | Class | Notes |
|-----------|----------|-------|-------|
| `createEntityId(prefix, …)` | `src/domain/identity/createEntityId.js` | **Safe** (interim) | Prefix + time36 + seq; not ULID/UUID yet |
| `createNumericId()` | same | **Temporary** | Session-local number for Company/legacy numeric paths |
| `createContactPersonId` / `createInteractionId` | same | **Safe** (interim) | |
| `naturalPersonSelfId` | same | **Safe** (stable format) | Synthetic; not a DB row today |
| `crypto.randomUUID()` | NotificationEngine (preferred path) | **Safe** | Backend-friendly |

**Prefixes in use:** `cp`, `sp`, `int`, `ntf`, `u`, `cmp`, `survey`, `blk`, `rev`, `tl`, `dept`, `user`, `LA`, `pf`, `self`, `fu`.  
**Collision:** `cp` = ContactPerson **and** customer payment — **Migration risk**.

---

## UUID / random

| Pattern | Where | Class |
|---------|-------|-------|
| `crypto.randomUUID` | Notifications; some document tracking | **Safe** |
| `Math.random` entropy inside `createEntityId` | identity module | **Safe** (interim) |
| `Math.random` ad-hoc elsewhere | Older UI slots / file keys | **Temporary** |

---

## Date.now() as identity

| Pattern | Where (examples) | Class |
|---------|------------------|-------|
| `id: Date.now()` on order events | `rahseparLoadingService`, `tadarokStageService`, `gatewayDecisionService`, `parvaneStageService`, `shippingService`, `operationalRecordsService`, `orderProfileService` (some paths) | **Migration risk** |
| `Date.now() + 1` twin events | rahsepar finalize paths | **Migration risk** |
| Product id `Date.now()` | `VitrinPage` create | **Migration risk** |
| Slot ids `s${Date.now()}` | Inquiry UI panels | **Temporary** (UI-only) |
| Document/voucher numbers with time slices | `HV-…`, `BB-…` PO/shipping | **Temporary** → need sequences |

**Guardrail:** new business data must not use `Date.now()` as identity (see `.cursor/rules/jarian-data-architecture.mdc`).

---

## Index / counter / max(id)+1

| Pattern | Where | Class |
|---------|-------|-------|
| Module `*IdCounter++` | `orderProfileService` comments/attachments; inquiry/event counters in Nabz services | **Migration risk** |
| `orders.reduce(max id) + 1` | `createOrder.js` | **Migration risk** (multi-tab race) |
| Array index as id | Avoid; line `sourceItemIndex` is a **pointer**, not a durable id | **Migration risk** if used as PK |
| Tadarok line `tl-{orderId}-{index}` | Initial build in tadarok service | **Temporary** → stable line ids later |

---

## Hardcoded / seed ids

| Pattern | Where | Class |
|---------|-------|-------|
| Company `1…8`, `rp-1-1` style persons | `contactsData.js` | **Temporary** (demo); freeze on first DB load |
| Order numeric ids + `JR…` codes in seed | `ordersData.js` | **Temporary**; code is business key |
| Org `root`, `sales`, `user-ali` | organization mock tree | **Temporary** |
| Users `u-1` … | usersStore MOCK | **Temporary** |
| Campaign / catalog seed ids | kampayn / vitrin data | **Temporary** |

---

## Business codes (not surrogate PKs)

| Code | Generator | Class |
|------|-----------|-------|
| Order `JR{yy}{mm}{dd}{serial}` | `orderCode.js` | **Safe** as human key; needs DB sequence for multi-user |
| Proforma document numbers | proforma services | **Temporary** until sequence service |
| Loading assignment `LA-…` | `createEntityId` | **Safe** (interim) |

---

## Type drift (migration risk)

| Issue | Detail |
|-------|--------|
| Company / Order runtime **number** vs domain Order **string** | Contract mismatch for API/Prisma |
| `customerId` / `supplierId` compared via `String()` in places | Hides type bugs |
| Order `code` used in denorm `relatedOrders` instead of numeric id | Stale / ambiguous FK |

---

## Summary recommendation (future — not now)

1. New string entities → `createEntityId` or UUID.  
2. Stop new `Date.now()` / counter PKs when touching those call sites.  
3. Before DB: pick ULID/UUID for surrogates; keep `JR…` as alternate business key.  
4. Resolve `cp` prefix collision before payment + ContactPerson share a global id space.  
5. **Do not** rewrite existing in-memory/seed ids in this phase.
