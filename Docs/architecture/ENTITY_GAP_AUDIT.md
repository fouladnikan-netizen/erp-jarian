# Entity Gap Audit — Company & Order vs Delivery Pipeline

> **Status:** Updated after repository extraction + SERVER_FIRST + integration tests (2026-08-26).  
> **Related:** [ENTITY_DELIVERY_PIPELINE.md](./ENTITY_DELIVERY_PIPELINE.md), entity cards `company.yaml` / `order.yaml`

Legend: ✓ meets law · ⚠ partial / legacy debt · ✗ missing for Tier A target

---

## Company

| Area | Status | Notes |
|------|--------|-------|
| DDL / ownership | ✓ | DDL-01/02; owner Kanoon |
| Entity Card | ✓ | `entity-cards/company.yaml` |
| Migration + soft-delete | ✓ | `companies.deleted_at` / `deleted_by` |
| API thin routes | ✓ | `routes/companies.js` → service |
| Zod validation | ✓ | in `companyService` |
| Error contract | ✓ | AppError / middleware |
| RBAC | ✓ | `companies:read` / `write` |
| Audit on write | ✓ | `writeAudit` in TX |
| Transactions | ✓ | create/update/archive + audit |
| Backend Repository | ✓ | `backend/src/repositories/companyRepository.js` |
| Frontend repository | ✓ | `CompanyRepository.js` |
| SSOT Postgres | ✓ | when `VITE_USE_MOCK_API=false` |
| Update policy SERVER_FIRST | ⚠ | FE write-through after mutate still common in contacts store |
| Domain rules outside UI | ⚠ | Much CRM logic still in FE domain/stores |
| BE integration tests | ✓ | `backend/src/__tests__/company-order.integration.test.js` |
| Observability | ⚠ | Request ID foundation; no rich APM |
| Backup before migrate | ⚠ | Scripts exist; **not** production-proven (scheduler/off-site/verify) |

**Summary — Company**

```text
Company
✓ API, RBAC, audit, soft-delete, BE+FE repository, Entity Card, integration tests
⚠ contacts store write-through UX; domain still FE-heavy; backup ops not proven
```

---

## Order

| Area | Status | Notes |
|------|--------|-------|
| DDL / ownership | ✓ | DDL-03; owner Nabz |
| Entity Card | ✓ | `entity-cards/order.yaml` |
| Migration + soft-delete | ✓ | `orders.deleted_at` / `deleted_by` |
| API thin routes | ✓ | `routes/orders.js` |
| Zod + version conflict | ✓ | `version` / `VERSION_CONFLICT` |
| RBAC | ✓ | `orders:read` / `write` |
| Audit on write | ✓ | in TX |
| Backend Repository | ✓ | `backend/src/repositories/orderRepository.js` |
| Frontend repository | ✓ | `OrderRepository.ts` |
| SSOT Postgres | ✓ | hydrate via `fetchOrders` |
| Update policy SERVER_FIRST | ✓ | `commitOrders` / `saveOrder`; debounce removed; `setOrders` → void commitOrders |
| Stage machines server-side | ✗ | Transitions still largely FE Nabz services |
| BE integration tests | ✓ | same integration file |
| Cross-module ports | ⚠ | Ofogh/Kanoon still bridge via stores/context in places |

**Summary — Order**

```text
Order
✓ API, RBAC, audit, soft-delete, version, BE+FE repository, SERVER_FIRST persist, tests
⚠ FE stage machines still client-side; setOrders fire-and-forget wrapper around commitOrders
✗ server-owned stage transition engine (future)
```

---

## Lead (explicit non-work)

- No `leads` table / API until DDL gate resolves DDL-04.  
- `raw-lead.yaml` remains **deferred**.

---

## Backup ops note (separate from architecture)

Scripts `backup-pg.sh` / `restore-pg.sh` are **architecture-ready**, not **production-proven** until:

1. A successful dump is taken on the target host  
2. Restore is verified on a scratch DB  
3. Daily scheduler is installed  
4. Off-site copy is confirmed  

Do not treat script presence as operational backup.

---

## Recommended next (after this pass)

1. Production backup verify drill (ops)  
2. Final Foundation Audit prompt  
3. Migrate next modules only via Entity Delivery Pipeline  
