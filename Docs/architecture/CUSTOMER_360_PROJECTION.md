# Customer 360 Projection Contract (DDL-26.12)

## Orders tab (Kanoon Customer Profile)

| Source | API mode | Mock mode |
|--------|----------|-----------|
| Live Nabz orders | `useOrders()` filtered by `customerId === company.id` | Same |
| Seed `company.relatedOrders` | **Not shown** | Shown when no live order with same code |

## Timeline (Pooyesh)

| Event type | Source |
|------------|--------|
| Activities | Pooyesh `activities` via `CompanyTimelinePanel` / `interactionFacade` |
| Orders | Nabz order store / API |
| Seed order rows on `contact.relatedOrders` | Mock only — excluded in API mode projections |

## Interactions

| Mode | SoR |
|------|-----|
| API (`VITE_USE_MOCK_API=false`) | Pooyesh Activity (`/api/v1/activities`) |
| Mock | Legacy `company.interactions[]` on Contact document |

**Forbidden in API mode:** writing or reading `company.payload.interactions` as SoR.

## Contacts / persons

| Phase | Read path |
|-------|-----------|
| A–C (compat) | `company.persons` (legacy embed) + `company.canonicalContacts` |
| D+ | Prefer `GET /api/v1/contacts/company/:id` |

## Lifecycle

System-controlled via `customerLifecycleService.recomputeCustomerLifecycle`.
Backfill: `node backend/scripts/recompute-customer-lifecycle.js [--apply]`.
