# Backend Readiness Audit

> **Status:** Audit only — no schema, no Prisma, no APIs, no code changes.  
> **Canvas:** open [`jarian-backend-readiness-audit.canvas.tsx`](/Users/ehsanmohammadi/.cursor/projects/Users-ehsanmohammadi-Documents-ERP-Jaryan/canvases/jarian-backend-readiness-audit.canvas.tsx) beside chat  
> **Related:** [PERSISTENCE_BOUNDARY.md](./PERSISTENCE_BOUNDARY.md), [10-DATA_ARCHITECTURE_AUDIT.md](./10-DATA_ARCHITECTURE_AUDIT.md), [DATA_OWNERSHIP_MODEL.md](./DATA_OWNERSHIP_MODEL.md), [DATA_MIGRATION_RISKS.md](./DATA_MIGRATION_RISKS.md), [SSOT.md](./SSOT.md)  
> **Backend Readiness Score: 2.8 / 10**

## Scale verdict

| Need | Fit? |
|------|------|
| Frontend prototype / single browser session | **Yes** |
| Durable multi-user ERP with financial audit | **No** |
| Safe FE→BE migration without contracts | **No** — Order writes bypass repository today |

---

## Scorecard

| Dimension | Score | Notes |
|-----------|------:|-------|
| Backend boundary readiness | 2.5 | Express AI-only; Axios aimed at missing `/api/v1` |
| FE→BE migration readiness | 2.0 | Fat documents; writes via `setOrders` / Zustand |
| API boundary clarity | 3.0 | One partial OrderRepository; no write API map |
| Domain service extraction | 4.5 | Nabz `*Service.js` + domain islands exist |
| Repository readiness | 2.0 | Order read/status only; others absent |
| DTO / contract readiness | 2.5 | Zod order schemas **unwired**; runtime ≠ types |
| Validation ownership | 3.5 | Imperative in services/UI; no API schema gate |
| Error handling strategy | 2.5 | `console.error`; NotificationEngine not on API |
| Transaction readiness | 1.5 | Single in-memory replace; no unit-of-work |
| Multi-user readiness | 1.5 | Spoofable actor; no concurrency/tenant |
| **Overall** | **2.8** | Logic-rich client; persistence-poor |

---

## 1. Current architecture map

```
Browser (system of record today)
├─ UI pages / drawers
├─ Zustand: useContactsStore (Company, ContactPerson, interactions)
├─ Zustand: useNabzStore (Order fat document) ← most writes
├─ Page useState: Vitrin Product, Kampayn, Calendar mocks
├─ Nabz *Service.js (application ≈ domain mix)
├─ domain/* (completion, revision, party, identity, unwired Zod)
└─ OrderRepository ──mock──► ordersData / ORDERS_MOCK
                 └─HTTP──► VITE_API_BASE_URL (localhost:8000) [absent]

Node sidecar (not ERP data plane)
└─ Express :3100
   ├─ GET  /api/health
   └─ POST /api/ai/rewrite  (keys server-side)
   Vite proxies /api → 3100  ≠  default Axios base 8000/api/v1
```

| Layer | Exists? | Role today |
|-------|---------|------------|
| UI | Yes | Collect + render + often orchestrate |
| Application services | Partial | Nabz `*Service.js`, store actions |
| Domain rules | Growing | completion, revision, quoting math, stage guards |
| Repository | Scaffold | Order get + status patch only |
| HTTP API (ERP) | **No** | Hypothetical `/orders` |
| Database | **No** | — |
| AuthN/Z server | **No** | localStorage session |

---

## 2. Missing backend layers

| Layer | Gap |
|-------|-----|
| **Write APIs** | Create/update Company, Order, lines, events, payments |
| **Read APIs** | Paged lists, get-by-id with ETag/version |
| **Auth service** | Real login, refresh, principal binding |
| **Authorization** | Server enforcement of roles/scopes |
| **Repositories + DB** | Aggregate persistence + constraints |
| **DTO / OpenAPI** | Versioned request/response contracts |
| **Validation at boundary** | Wire Zod (or equivalent) on ingress |
| **Transaction / UoW** | Multi-field Order mutations + cross-aggregate |
| **Ledger / audit store** | Immutable financial events |
| **Blob / document store** | Files beyond data-URL / filename on Order |
| **Error taxonomy** | Typed `ApiError` → NotificationEngine |
| **Idempotency / concurrency** | Keys, optimistic versions |
| **Tenant / org isolation** | Absent |

---

## 3. Recommended backend architecture (future — not implemented)

Align with [PERSISTENCE_BOUNDARY.md](./PERSISTENCE_BOUNDARY.md):

```
UI → Application (use-case) → Domain → Repository → DB
         ↑
    Zustand as cache (after successful writes)
```

| Concern | Recommendation |
|---------|----------------|
| Style | Resource APIs per aggregate + command endpoints for multi-step Order ops |
| First aggregates | **Company**, **Order** (events append-only) |
| Auth | Server session/JWT; Actor ≠ free-text expert name |
| Money | Append-only payment/settlement events; stop mutable dual-write |
| Product | Promote to root aggregate before deep Order FK integrity |
| Activity | Unify streams with `companyId` / `orderId` (later) |
| Calendar | Read model / projection over commitments — not a write SSOT |
| Documents | Metadata on Order + object storage; print preview not SSOT |

**Do not** invent GraphQL/Prisma in the same step as first write contracts — freeze identity and Order write path first ([DATA_MIGRATION_RISKS.md](./DATA_MIGRATION_RISKS.md)).

---

## 4. Domain evaluation (FE → BE)

| Domain | Today | API boundary (future) | Service candidates | Repository | DTO / validation | TX needs | Multi-user risk |
|--------|-------|----------------------|--------------------|------------|------------------|----------|-----------------|
| **Company / Customer** | `useContactsStore` + seeds | CRUD + lifecycle patch; list/search page | completion policy already domain | CompanyRepository | CompanyDTO; nationalId uniqueness | Low–med (person links) | High — shared CRM |
| **ContactPerson** | Embedded `relatedPersons[]` | Nested under Company or `/companies/:id/persons` | normalize + role rules | Part of Company aggregate initially | ContactPersonDTO; fix `cp` id collision | With Company write | Medium |
| **Order** | Fat Zustand doc; services mutate; repo read-only-ish | Commands: create, transition stage, inquiry, quote, ship, settle + get | Existing Nabz services → application layer | OrderRepository (expand writes) | OrderDTO + command DTOs; wire Zod | **Critical** (stage+events+revisions) | **Critical** |
| **Opportunity** | Company `lifecycle_stage` + Ofogh UI | Prefer Company lifecycle API — not separate table yet | Ofogh → store actions | Company | Stage enum DTO | With Company | Medium |
| **Product** | Vitrin `useState` | Product CRUD + catalog search | Thin catalog service | ProductRepository | ProductDTO; SKU | Low | Medium once ordered |
| **Supplier** | Company facet | Filter Company by type / roles | Facade already | Company | Same as Company | — | Medium |
| **Activity** | Split: interactions / crmActivities / events / unused mock | Unify later: Activity API | Merge policy TBD | ActivityRepository (phase 2) | ActivityDTO | Append-only | High if split persists |
| **Calendar** | Mocks + derived commitments | Read-model API | Projection builder | No write repo first | CommitmentDTO | N/A | Low |
| **Documents** | On Order + print localStorage | Upload + metadata; link `orderId` | DocumentAppService | DocumentRepository + blob | DocumentMetaDTO | With Order version | Medium |
| **Financial** | Embedded payments / proforma / saranjam | Ledger commands; no silent mutate | settlement + quoting services | Ledger + Order | MoneyDTO; payment events | **Critical** | **Critical** |

---

## 5. API boundaries (required when funded)

### Priority surfaces

1. **Auth** — login, me, logout  
2. **Companies** — list (page), get, create, update, persons nested  
3. **Orders** — list (page), get, create  
4. **Order commands** — `transition-stage`, `complete-inquiry`, `issue-proforma`, `record-payment`, … (map 1:1 from services that today return a new order object)  
5. **Products** — list, get, create, update  
6. **Documents** — upload/metadata  
7. **Activities** — after unification design  
8. **Calendar commitments** — read projection  

### Anti-patterns to avoid

- Exposing Zustand shape 1:1 as public API forever  
- PATCH entire fat Order from the client without server policy  
- Dual Axios bases (8000 vs proxied 3100) without documenting which is ERP  

---

## 6. Domain service candidates (extract / keep pure)

Already closest to application/domain (keep logic; later call repositories):

| Candidate | Source today |
|-----------|--------------|
| `evaluateCompanyCompletion` | `domain/customerCompletion` |
| `revisionEngine` / revision apply | `domain/order`, `revisionService` |
| `orderStageService` | stage transitions |
| `quotingService` | money math |
| `proformaService` | issue/update versions |
| `orderCrmService` | CRM + payment sync (redesign dual-write) |
| `saranjamSettlementService` | settlement gates |
| Inquiry / gateway / tadarok / rahsepar / shipping | stage ops services |

**Principle:** UI calls application services; services load aggregate → domain decide → repository save → return DTO. Zustand updates from server result.

---

## 7. Repository requirements

| Repository | First methods | Notes |
|------------|---------------|-------|
| **CompanyRepository** | get, list(page), save, addPerson | SSOT for CRM |
| **OrderRepository** | get, list(page), save, appendEvent | Expand beyond get/status; **all** mutations |
| **ProductRepository** | get, list, save | Replace Vitrin-only state |
| **DocumentRepository** | saveMeta, getByOrder | Blobs elsewhere |
| **LedgerRepository** (or Order payment append) | appendPayment, listByOrder | Immutable |
| **UserRepository** | later with real auth | Shirazeh mocks today |
| **ActivityRepository** | after model unify | — |

---

## 8. DTO requirements

| DTO family | Need |
|------------|------|
| **Request DTOs** | Create/Update Company, nested Person, Create Order, command payloads |
| **Response DTOs** | Stable public shapes — strip UI-only fields |
| **List DTOs** | Summary rows for tables (not full fat Order) |
| **Error DTO** | `{ code, message, details?, correlationId }` |
| **Money** | integer minor units + currency; align `domain/money` |
| **Ids** | Explicit string vs number policy; migrate off `max+1` / `Date.now()` |

Wire existing `order.schemas.ts` at repository/API boundary — do not leave Zod as dead code.

---

## 9. Validation ownership

| Layer | Owns |
|-------|------|
| **UI** | UX hints only |
| **Application** | Use-case preconditions (e.g. can complete quoting) |
| **Domain** | Invariants (revision, completion %, stage locks) |
| **API boundary** | Schema parse (Zod/OpenAPI) — **missing today** |
| **Database** | Constraints / FKs — **missing** |

Today validation is **imperative in services and forms**. Migration risk: duplicating rules in API without deleting UI-only copies.

---

## 10. Error handling strategy (recommended)

| Concern | Today | Future |
|---------|-------|--------|
| HTTP errors | `console.error` in Axios | Map to typed errors → NotificationEngine |
| Domain reject | `{ accepted: false, reason }` | Same + HTTP 409/422 |
| Boundaries | Shirazeh ErrorBoundary only | Route-level + API error banner |
| AI sidecar | 400/502/504 | Keep separate from ERP error codes |

---

## 11. Transaction requirements

| Use-case | Must be atomic |
|----------|----------------|
| Stage transition + event (+ revision fields) | Yes |
| Proforma issue (version archive + events + stage) | Yes |
| CRM activity + saranjam payment sync | Yes — or redesign to single write |
| Settlement finalize + invoice flags | Yes |
| Company create + first ContactPerson | Yes |
| Order create referencing Company | Company must exist (FK); optional single TX |

Without DB transactions, last `setOrders` wins and multi-tab `max(id)+1` races.

---

## 12. Multi-user implications

| Topic | Implication |
|-------|-------------|
| Concurrent Order edits | Need version/ETag; today silent overwrite |
| Actor identity | Expert names ≠ authenticated user |
| RBAC | Shirazeh matrix is UI mock — not enforced on writes |
| Tenancy | None — single flat dataset assumption |
| Audit | `events[]` helps but ids/`Date.now()` and mutable payments weaken evidence |
| Notifications | Client-only queues — not multi-device |

---

## 13. Migration risks (FE → BE)

| ID | Risk | Severity |
|----|------|----------|
| M1 | Order mutations bypass repository | Critical |
| M2 | Fat Order document as API dump | Critical |
| M3 | No durable store / refresh loss | Critical |
| M4 | Payment dual-write + mutable arrays | Critical |
| M5 | ID schemes (`cp` collision, `max+1`, `Date.now()`) | High |
| M6 | Split Activity ownership | High |
| M7 | Product not SSOT | High |
| M8 | Axios base (8000) ≠ Express (3100) confusion | Medium |
| M9 | Zod unwired / domain PreInvoice unused | Medium |
| M10 | Auth theater (localStorage only) | Critical for multi-user |

Suggested freeze order: identity policy → Company persist → Order writes through repository → ledger → Product → Activity unify → auth/RBAC ([DATA_MIGRATION_RISKS.md](./DATA_MIGRATION_RISKS.md)).

---

## 14. Priority order for backend creation

| Priority | Deliverable | Why |
|---------:|-------------|-----|
| 1 | Identity + ID policy freeze | Stop new collisions |
| 2 | AuthN (real principal) | Multi-user prerequisite |
| 3 | Company API + repository | CRM SSOT |
| 4 | Order read/write via repository (stop `setOrders`-only) | Core ops |
| 5 | Order command endpoints + transactions | Stage/proforma/settlement |
| 6 | Payment/ledger append model | Financial integrity |
| 7 | Product API | Catalog integrity on lines |
| 8 | Document blob + metadata | Replace data-URL sprawl |
| 9 | Activity unification API | CRM/ops timeline |
| 10 | Calendar read-model | Projection only |
| 11 | Opportunity-as-resource (optional) | Only if product needs beyond lifecycle |

---

## Explicit non-goals (this audit)

- No database schema, Prisma, migrations  
- No new HTTP routes or repositories  
- No Zustand replacement  
- No refactor of Nabz services  

---

## Bottom line

Jarian is a **logic-heavy frontend ERP** with a **non-ERP Express sidecar** and a **dormant Order HTTP client**. Domain/service candidates are the main asset for a future backend; **persistence, write APIs, transactions, DTOs, and multi-user auth are the main deficits**. Backend readiness **2.8 / 10** — not ready to scale to concurrent financial operations without the priority program above.
