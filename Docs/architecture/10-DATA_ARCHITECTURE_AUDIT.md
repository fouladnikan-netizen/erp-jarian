# Data Architecture & Persistence Readiness Audit

> **Status:** Audit only — no schema, no migration, no implementation.  
> **Canvas:** open [`jarian-data-architecture-audit.canvas.tsx`](/Users/ehsanmohammadi/.cursor/projects/Users-ehsanmohammadi-Documents-ERP-Jaryan/canvases/jarian-data-architecture-audit.canvas.tsx) beside chat  
> **Overall Score: 3.0 / 10**

## Scale verdict

| Requirement | Fit? |
|-------------|------|
| Current single-session prototype | Yes |
| 20 modules / 300 screens / 1000 features | **No** |
| Multiple concurrent users | **No** |
| Financial audit / accuracy | **No** (mutable payments; spoofable actor) |

---

## Scorecard

| Dimension | Score |
|-----------|------:|
| Data Modeling | 4.0 |
| Entity Relationships | 4.0 |
| Persistence Readiness | 2.0 |
| Identity Strategy | 3.5 |
| Consistency | 3.0 |
| Auditability | 3.0 |
| Security Model | 2.0 |
| Scalability | 2.0 |
| **Overall** | **3.0** |

---

## 1. Data sources (summary)

| Source | Entities | Owner | Risk |
|--------|----------|-------|------|
| `useContactsStore` | Company, ContactPerson, Interaction | Shared | Critical — memory |
| `useNabzStore` | Order (fat) | Nabz | Critical — `setOrders` local |
| `OrderRepository` | Order read/status | API | High — incomplete |
| Vitrin / Kampayn `useState` | Product, Campaign | Page | High |
| Shirazeh stores | User, RBAC, org, integrations | Shirazeh | High — mock |
| Seeds | Boot demos | Modules | Medium after boot |
| `localStorage` | Auth + UI prefs | Shell | Domain not stored |
| Registries | Config-as-data | Config | Low |

**Survives refresh:** auth token/user, theme, sidebar, column widths, print preview keys.  
**Does not:** Company, Order mutations, catalog, campaigns, users, RBAC, org tree.

Full map: Canvas §1.

---

## 2. Entities (summary)

| Entity | Representation | ID | Problems |
|--------|----------------|-----|----------|
| Company | Contact in store | number | Thin domain TS |
| ContactPerson | Embedded `relatedPersons[]` | string `cp-` / `self-` | Prefix collision with payments |
| Order | Fat document | number + `JR…` code | Domain `id: string` drift |
| OrderItem / Inquiry | Embedded | counters | Weak product FK |
| Product | Page state | `Date.now()` | No store |
| Supplier | Company facet | same | OK via facade |
| Opportunity | `lifecycle_stage` | n/a | Not a row |
| Activity | 3 streams | mixed | Split ownership |
| Calendar | Synthetic + MOCK | string | Not durable |
| Document | Metadata on order | mixed | No blob store |
| Invoice / Proforma | Embedded | `pf-v-n` | Domain PreInvoice unused |
| Payment | saranjam + CRM | `cp-`/`sp-` | Mutable dual write |
| Shipment | voucher + rahsepar | `LA-` / `BB-` | Embedded |
| User / Permission | 3+ role spaces | string | Fragmented |

---

## 3. Relationships

- **1:N embeds:** Company→ContactPerson, Company→Interaction, Order→items/inquiries/docs/payments/shipment/events  
- **Refs:** Order.`customerId` → Company; Inquiry.`supplierId` → Company (number)  
- **Weak / denorm:** line product snapshots; `order.customer` name; seed `relatedOrders` using **codes** not ids  
- **M:N:** none implemented as join entities  
- **User→Activity/Order:** display strings / `CURRENT_USER`, not FKs  

---

## 4. Identity

| Pattern | Backend-ready? |
|---------|----------------|
| `domain/identity` `createEntityId` | Needs ULID/UUID later |
| `createNumericId` / counters / `Date.now()` events | No |
| Order business code `JR…` | Needs DB sequence |
| `crypto.randomUUID` (notifications) | Yes |

---

## 5. Persistence readiness

| Target | Ready | Blocked |
|--------|-------|---------|
| PostgreSQL / Prisma | Aggregate intent | No durable writes; runtime ≫ types |
| REST | OrderRepository stub | No contact/product/full order write API |
| GraphQL | — | Absent |
| Multi-user | — | No concurrency, tenant, enforced RBAC |
| Financial accuracy | Proforma versions | No ledger; actor spoofable |

No soft-delete protocol, no optimistic concurrency, no transactions. Zod order schemas exist but are **unwired** at the repository.

---

## 6–8. Consistency / history / security

- **Consistency:** Product & Activity multi-source; CRM↔saranjam payment copy; domain vs Nabz Order shape.  
- **History:** `events[]`, `revisions[]`, proforma versions (strongest); `statusHistory` can be synthesized; payments weak; `by` ≈ hardcoded `CURRENT_USER`.  
- **Security:** No tenant; auth session ≠ Nabz actor; RBAC matrix not enforced on ops.

---

## 9. Migration risk matrix

| Rank | Risks |
|------|--------|
| **Critical** | No durable store; Order write bypass; no multi-user/concurrency; no money ledger; actor≠auth; no tenant |
| **High** | ID type drift; `cp` collision; Product page-state; Activity split; fat Order blob; role vocabularies; stale relatedOrders |
| **Medium** | Unwired Zod; soft-delete absent; dual timestamp fields; page-local campaigns/calendar; filename-only docs |
| **Low** | Seed `max(id)+1` create races in multi-tab |

---

## 10. Future recommendations (not implemented)

1. Persist **Company** and **Order** behind complete repositories before other modules.  
2. Standardize IDs (ULID/UUID); stop new `Date.now()` event ids.  
3. Bind audit `by` to `authSession`; unify RBAC.  
4. Introduce immutable payment/ledger entries for financial audit.  
5. Wire Zod (or equivalent) at API boundaries.  
6. Decide Product store + line snapshot policy before catalog scale.  
7. Do **not** invent Prisma schema or GraphQL until write contracts exist.  
8. Keep ContactPerson 1:N under Company; do not invent M:N Person registry early.

---

## Explicit non-goals

No database, no Prisma schema, no data migration, no implementation in this phase.

## Cross-links

- [ENTITY_OWNERSHIP.md](./ENTITY_OWNERSHIP.md)  
- [SSOT.md](./SSOT.md)  
- [ORDER_STATUS_AUDIT.md](./ORDER_STATUS_AUDIT.md)  
- [08-STATE_ARCHITECTURE_AUDIT.md](./08-STATE_ARCHITECTURE_AUDIT.md)  
- `src/domain/identity/`
