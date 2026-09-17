# Domain Decision Log

> **Status:** Active — record architectural decisions **before** database / Prisma / API design.  
> **Related:** [AGGREGATE_BOUNDARIES.md](./AGGREGATE_BOUNDARIES.md), [SSOT.md](./SSOT.md), [ENTITY_OWNERSHIP.md](./ENTITY_OWNERSHIP.md), [ENTITY_IDENTITY_AUDIT.md](./ENTITY_IDENTITY_AUDIT.md), [16-BACKEND_READINESS_AUDIT.md](./16-BACKEND_READINESS_AUDIT.md), [03-WORKSPACE_STRATEGY.md](./03-WORKSPACE_STRATEGY.md)  
> **Rule:** New persistence work must not contradict open decisions here without adding a superseding entry.

---

## How to use

| Field | Meaning |
|-------|---------|
| **Decision** | Binding choice for upcoming design |
| **Current state** | What the codebase does today |
| **Reason** | Why we lock this now |
| **Future migration impact** | What implementers must plan for |

Append new decisions at the bottom with `DDL-NN` ids. Do not silently rewrite history — supersede with a new entry.

---

## DDL-01 — Company is the primary customer aggregate

| | |
|--|--|
| **Decision** | **Company** (runtime Contact in `useContactsStore`) is the primary customer / party aggregate root for CRM and as the customer reference on Orders. |
| **Current state** | Contacts store holds customers, suppliers (`entityType`), and pipeline fields; Nabz customer/supplier helpers facade the store. |
| **Reason** | One party root avoids parallel customer registries and matches Kanoon/Ofogh write ownership already documented in SSOT / aggregate boundaries. |
| **Future migration impact** | First persist **Company** (not a separate “Customer” table that forks identity). Supplier remains a **facet/role** of Company unless a later decision splits it. Order APIs reference `companyId` (today’s contact id). |

---

## DDL-02 — ContactPerson is currently owned by Company

| | |
|--|--|
| **Decision** | **ContactPerson** remains **owned by Company** (embedded `relatedPersons[]`) for the near-term persistence model. |
| **Current state** | 1:N embed under contact; domain normalize helpers; UI kit under `src/components/contactPerson/`. Natural persons may use synthetic `self-{id}` for pickers. |
| **Reason** | Matches today’s consistency boundary; avoids premature Person aggregate and M:N graph before Company writes are stable. |
| **Future migration impact** | v1 schema: persons nested or child rows with `company_id` FK and cascade/ownership rules. **Do not** introduce a global Person root in the first migration. ID prefix collision (`cp` vs payments) must be resolved before dual tables. A future DDL may promote ContactPerson or Party links to M:N — that requires a new decision. |

---

## DDL-03 — Order is the primary operational aggregate

| | |
|--|--|
| **Decision** | **Order** is the primary **operational** aggregate root (Nabz). Lines, inquiries, quoting, stage, events, proforma, shipping, settlement payloads remain inside the Order consistency boundary until a later split decision. |
| **Current state** | Fat document in `useNabzStore`; mutations via Nabz services → `setOrders`; `OrderRepository` is read/status-only. |
| **Reason** | Operations, money-in-progress, and stage machines already cohere on one document; splitting Shipment/Payment/Invoice before durable Order writes increases migration risk. |
| **Future migration impact** | Persist Order as one aggregate (or document + append-only `events`) first. Child tables may be physical storage still loaded/saved as one unit-of-work. Extracting Shipment/Payment/Invoice as separate roots needs an explicit future DDL — not implied by this entry. |

---

## DDL-04 — Opportunity remains a Company capability (not standalone yet)

| | |
|--|--|
| **Decision** | **Opportunity** is **not** a standalone aggregate yet. It remains a **Company capability** (primarily `lifecycle_stage` + Ofogh UX). |
| **Current state** | Ofogh pipeline still advances Company `lifecycle_stage` on verified contacts; no opportunity id/row. |
| **Reason** | Avoid a second CRM root and dual-write with Company before Company persistence exists. Aligns with aggregate-boundary “Opportunity is a view on Company.” |
| **Future migration impact** | v1 APIs expose lifecycle on Company (or a thin “opportunity view” DTO), not `/opportunities` as a separate SoR. Promoting Opportunity to its own entity/table requires a new DDL with identity, ownership, and sync rules. |
| **Supersession** | **Raw Lead** ownership/model formerly conflated with this entry is **superseded by [DDL-13](#ddl-13--raw-lead-is-an-independent-ofogh-aggregate)**. Opportunity-as-Company-capability **remains in force**. |

---

## DDL-05 — Activity ownership requires a future dedicated decision

| | |
|--|--|
| **Decision** | **No binding Activity aggregate owner yet.** Activity remains a **known split** until a dedicated decision. |
| **Current state** | At least three streams: Company `interactions[]`, Order `crmActivities[]`, Order `events[]`, plus unused activity-timeline mock data. |
| **Reason** | Forcing a unify-before-Company/Order persist would block backend priority 1–5; wrong early schema is costly. |
| **Future migration impact** | Do **not** invent a single Activity table as SoR in the first backend slice without DDL-05 follow-up. Interim: persist streams with their parent aggregates. A later DDL must choose: unify vs keep typed streams, and define `companyId` / `orderId` rules. |
| **Supersession** | **Resolved by [DDL-15](#ddl-15--pooyesh-activity-is-an-independent-postgresql-aggregate).** Pooyesh Activity (`activities` table) is the soft-CRM aggregate. Nabz Order `crmActivities` / operational `events` remain **out of unify**. Historical text above is retained for audit; do not implement against the “no Activity SoR” rule. |

---

## DDL-06 — Workspace architecture deferred

| | |
|--|--|
| **Decision** | **Company / Order workspace chrome and entity-first navigation remain deferred** — not part of pre-DB domain locking beyond this note. |
| **Current state** | Flat routes in `App.jsx`; no workspace shell ([03-WORKSPACE_STRATEGY.md](./03-WORKSPACE_STRATEGY.md)). |
| **Reason** | Workspace is UX/IA cost; it must not drive table design or block persistence. Product already deferred nav rewrite. |
| **Future migration impact** | APIs and aggregates must be **addressable by id** without requiring workspace URLs. Deep links can keep today’s paths until a funded IA project. Do not encode workspace hierarchy into the first schema. |

---

## DDL-07 — Persistence migration requires stable IDs

| | |
|--|--|
| **Decision** | **Persistence migration requires stable, collision-free IDs** before (or as the first step of) durable storage. New records should use shared identity helpers; legacy schemes are migration risk, not templates. |
| **Current state** | Mixed: numeric Company/Order ids, `JR…` codes, `cp-` / payment `cp` prefix collision, `max(id)+1` create order, `Date.now()` event ids, domain vs runtime type drift ([ENTITY_IDENTITY_AUDIT.md](./ENTITY_IDENTITY_AUDIT.md)). |
| **Reason** | Unstable or colliding ids make FK migration, multi-tab create, and audit trails unsafe. Backend readiness audit lists identity freeze as priority 1. |
| **Future migration impact** | Freeze ID policy (string vs number, generators, forbidden prefix reuse) **before** Prisma/schema. Map seed ids explicitly; do not renumber casually. Event/payment/person ids must be unique in their namespaces. Optimistic concurrency / ETags assume stable primary keys. |

---

## DDL-08 — Contact Person duplicate detection via mobile (forward compatibility)

| | |
|--|--|
| **Decision** | Introduce a **read-only domain policy** `lookupMobile(mobile)` that finds embedded ContactPersons sharing a normalized mobile across **all** Company aggregates (same company included). **Do not** create a Person registry, M:N junction, or standalone Person entity in this phase. Hits are **informational only** and must not block ContactPerson create/update. |
| **Current state** | ContactPerson remains embedded `relatedPersons[]` under Company (DDL-02). Domain helpers: `normalizeMobile` / `lookupMobile` / `toPossibleDuplicateMatches`; store exposes `useContactsStore.lookupMobile`; modal warns on any match. Create stores `possibleDuplicateMobile` + `possibleDuplicateMatches` and appends `contactPersonAuditLog`. Edit may pass `excludeContactPersonId` only (never `excludeCompanyId`). |
| **Reason** | Mobile reuse is a **data-quality signal**, not proven identity. Detecting same- and cross-company reuse prepares UX and future merge candidates without premature identity architecture. |
| **Future migration impact** | Replace only the internals of `lookupMobile` when Person becomes independent. Keep UI/audit contracts stable. Treat `possibleDuplicate*` fields as merge *hints*, never as identity assertions. |

### DDL-08 Duplicate Detection Semantics

1. ContactPerson remains embedded inside Company.
2. Mobile number is **NOT** a global identity key.
3. A mobile match represents a **possible relationship** between records, not confirmed identity.
4. **Allowed:** informational warning; audit metadata; store matched references (`possibleDuplicateMatches`).
5. **Forbidden:** block creation; auto-merge ContactPersons; replace existing data; create a global Person registry; company-scoped exclusion of lookup.
6. Future migration to an independent Person entity must remain possible.
7. Edit mode may exclude **only** the record being edited (`excludeContactPersonId`) to avoid self-match.

---

## DDL-09 — Pooyesh vs Gahshomar domain ownership on Customer Profile

| | |
|--|--|
| **Decision** | **Pooyesh** owns soft customer interactions (calls, meetings, follow-ups, sales notes, tasks, conversation history). **Gahshomar (دبیرخانه)** owns formal organizational correspondence (letters in/out, indicator numbers, document dates, PDF attachments, formal deadlines). `CustomerProfilePage` is a **composition layer only** and must not own either domain’s state. |
| **Current state** | Interaction history still persists temporarily on Company via `useContactsStore` / `company.interactions`. **All reads and writes must go through** `src/modules/pooyesh/interactionFacade.js`. Formal correspondence Phase 1 lives under Gahshomar `correspondenceService` (temporary in-memory store). Live `/gahshomar` → `GahshomarPage` (secretariat). `/pooyesh` → CommitmentEngine. |
| **Reason** | Prevent domain leakage that treated interaction timeline as Gahshomar and kept secretariat fiction mixed with CRM activity. Isolate Pooyesh ownership so UI/projections do not depend on the temporary Company storage location. |
| **Future migration impact** | When Activity SSOT is funded, swap facade internals to Pooyesh storage/API without changing profile composition or other callers. When Document/Correspondence persistence lands, implement it under Gahshomar and fill `listCompanyCorrespondence` — never by stuffing letters into `interactions` or CRM notes into دبیرخانه. |

### DDL-09 Boundary Rules

1. Profile tabs: `تعاملات` → Pooyesh panel only; `اسناد و مکاتبات` → Gahshomar secretariat panel only.
2. **Forbidden in Gahshomar correspondence:** phone calls, sales notes, follow-up activities, informal customer chat.
3. **Forbidden in Pooyesh interactions:** official letters, indicator numbers as document identity, formal secretariat PDFs.
4. Do not migrate databases in this decision — binding separation only until funded SSOT work.
5. **Interaction access rule:** All interaction reads and writes must go through the Pooyesh interaction facade. Current persistence remains temporary inside the Company aggregate until Activity SSOT migration. UI must not call `useContactsStore.addInteraction` or read `company.interactions` directly.

---

## DDL-11 — Timeline Ownership Boundary (Pooyesh vs Gahshomar)

| | |
|--|--|
| **Decision** | **Pooyesh** owns the company activity timeline UX, soft interactions, MagicInput, notes/calls/meetings/follow-ups, and the dynamic customer history stream. **Gahshomar** is strictly secretariat: incoming/outgoing letters, official numbering, templates, PDFs, signatures, stamps, formal references and deadlines. |
| **Current state** | Timeline UI lives in `src/modules/pooyesh/timeline/CompanyTimelinePanel.jsx` and reads via `companyTimelineFacade.getCompanyTimeline`. Soft writes go through `createActivity` → interaction facade. **Module landing swap (no UI redesign):** `/pooyesh` → same CommitmentEngine that previously lived at `/gahshomar`; `/gahshomar` → same ModulePage template that previously lived at `/pooyesh`. Profile: `?tab=timeline` / interactions → Pooyesh panels; `?tab=documents` → `GahshomarDocumentsPanel` only. |
| **Reason** | Correct a historical naming/ownership mix that treated the vertical activity timeline as Gahshomar. Preserve the valuable timeline UX while fixing module boundaries. |
| **Future migration impact** | Swap Pooyesh facade internals to Activity SSOT without changing profile composition. Implement letter persistence only under Gahshomar — never store official letters as activities, never render activities as correspondence. |

### Timeline Ownership Boundary Rules

1. **Pooyesh owns soft interactions and activity history** (including MagicInput and the vertical timeline experience).
2. **Gahshomar owns formal correspondence** only (secretariat).
3. **Timeline events are projections** and do not own source data (orders remain Nabz; soft activities remain Pooyesh; finance/ledger adapters future).
4. **Official letters must never be stored as activities.**
5. **Activities must never be represented as official correspondence.**
6. `CustomerProfilePage` remains composition-only: mounts Pooyesh and Gahshomar panels; does not own domain logic.
7. Tab IDs stay stable for URLs (`timeline`, `interactions`, `documents`); label for `timeline` may read «تعاملات و سوابق».

### DDL-11 Product Surface Rule

**No redesign.** Product migration is a **label / route swap** of existing surfaces:

1. **Sidebar پویش (`/pooyesh`)** opens CommitmentEngine (activity/commitment product surface).
2. **Sidebar گاه‌شمار (`/gahshomar`)** opens Secretariat foundation (`GahshomarPage` + correspondence service) — see DDL-12.
3. Do **not** mix Pooyesh activity UI into Gahshomar landings (or the reverse).
4. Profile ownership stays: timeline/interactions → Pooyesh components; documents → Gahshomar secretariat panel.
5. **Official documents must never appear as timeline activities**; **activities must never appear as secretariat documents.**
6. Legacy URLs: `/calendar`, `/commitments`, `/gahshomar/commitments` → redirect to `/pooyesh`.
7. `CompanyTimelinePanel` / facade remain Pooyesh-owned for profile composition — they are not a second module landing.

---

## DDL-12 — Gahshomar Correspondence Ownership

| | |
|--|--|
| **Decision** | **Gahshomar** owns official organizational correspondence (incoming/outgoing letters, internal official memos, correspondence records, attachment metadata, formal references). **Pooyesh** owns activities and soft interactions. Correspondence is not an activity; an activity is not official correspondence. `CustomerProfilePage` only composes both surfaces. |
| **Current state (Phase 1)** | Domain model in `src/modules/gahshomar/models/correspondence.js`. Reads/writes via `services/correspondenceService.js` (`listAllCorrespondence`, `listCorrespondenceByTab`, `listCompanyCorrespondence`, `createCorrespondence`, `updateCorrespondence`) over temporary in-memory `useCorrespondenceStore`. Module landing `/gahshomar` → correspondence-centric `GahshomarPage` (وارده / صادره). Profile tab `اسناد و مکاتبات` → `GahshomarDocumentsPanel` (company-scoped service only). **Out of scope this phase:** PDF generation, digital signatures/stamps, numbering engine, advanced approval workflow. |
| **Reason** | Establish a clean Secretariat foundation after DDL-11 so later document tooling plugs into Gahshomar without re-mixing CRM activity streams. |
| **Future migration impact** | Replace store internals with dedicated Correspondence / Document API without changing UI callers of the service. Later phases add numbering, templates, PDF preview, signatures, stamps, and approval — still under Gahshomar. |

### DDL-12 Boundary Rules

1. **Gahshomar owns official correspondence.**
2. **Pooyesh owns activities.**
3. **Correspondence is not an activity** — never write letters into Pooyesh interaction / timeline stores.
4. **Activity is not official correspondence** — never render calls/meetings/notes as secretariat documents.
5. **Customer profile only composes both** — documents tab reads correspondence service only; timeline/interactions remain Pooyesh.
6. UI must not access correspondence storage directly — only `correspondenceService` (binding shim may re-export).
7. Attachment fields store **metadata only** in Phase 1 (no binary / PDF pipeline).

### DDL-12 — Correspondence List and Internal Memo Ownership Rules

1. **Primary navigation is correspondence-centric**, not organization-centric. Main Gahshomar list has exactly two tabs: **وارده (Incoming)** and **صادره (Outgoing)**. Organization/company is metadata and optional filter/search only.
2. **Single Correspondence entity** for official external letters and internal official memos (`type: OFFICIAL | INTERNAL`). Do **not** invent a separate InternalLetter aggregate.
3. **Internal memo visibility without duplication:** one stored record with `senderUserId` / `receiverUserIds`. The same id appears in the sender’s outgoing view and each receiver’s incoming view via projection helpers (`isOutgoingViewRecord` / `isIncomingViewRecord`) — never clone rows in storage.
4. **Compose is letter-first:** direction, subject, category, priority, body, attachments are the primary fields. Related company, contact person, and related order live in an optional **ارتباطات** section — company selection is **not** mandatory to create correspondence.
5. **Detail stays on the list:** row detail opens a side drawer; do not navigate away for Phase 1 detail.
6. **KPI cards on the list are interactive filters** (e.g. new incoming, action needed, outgoing today) — not a separate static dashboard.
7. Profile documents tab remains **company-scoped reads** from Gahshomar only; Pooyesh timeline / activities remain untouched.

---

## DDL-10 — Company Timeline Projection Ownership

| | |
|--|--|
| **Decision** | The company profile timeline (`سوابق و وقایع`) is a **cross-domain read projection**, not a Kanoon (or any single domain) event store. Implementation lives under `src/projections/companyTimeline/`. |
| **Current state** | `buildCompanyTimelineEvents(contact, orders)` merges Pooyesh interactions, Nabz live orders (plus embedded payments/proforma), supplier inquiry/PO lenses, and a temporary `Company.relatedOrders` seed fallback. |
| **Reason** | Prevent treating a UI chronology helper as domain ownership after CustomerProfilePage became composition-only. |
| **Future migration impact** | Add Finance ledger and Gahshomar correspondence adapters into the projection; remove `relatedOrders` fallback when Nabz Orders is complete SSOT. Callers keep the same event shape. |

### Timeline Projection Ownership

1. **Timeline is a cross-domain read projection.** It does not own events.
2. **Event ownership remains with source domains:**
   - **Nabz** → orders (and order-embedded payment / proforma events today)
   - **Pooyesh** → interactions (via interaction facade)
   - **Finance** → ledger events (**future**)
   - **Gahshomar** → correspondence (Phase 1 service; adapters into timeline projection still future)
3. **Temporary fallback:** `Company.relatedOrders` is a legacy development seed path used only when a matching live Nabz order is absent. **Future SSOT:** Nabz Orders.
4. Kanoon may keep a deprecated re-export shim at `src/modules/kanoon/buildCompanyTimelineEvents.js`; new code imports from `src/projections/companyTimeline`.

---

## Open / explicitly not decided here

| Topic | Status |
|-------|--------|
| Product as aggregate root | Recommended in data docs; **not** locked in this log yet |
| Supplier as separate root | Remains Company facet until a DDL says otherwise |
| Payment / Invoice / Shipment split from Order | Deferred |
| Auth principal vs Actor / expert name | Security docs; not restated here |
| Database engine / Prisma | Out of scope for this log |
| Lead Activity stream vs Pooyesh Task port details | **Resolved by DDL-15** — Activity SSOT with subject `COMPANY`\|`RAW_LEAD`; Task remains separate |

---

## DDL-13 — Raw Lead is an independent Ofogh aggregate

> **Date:** 2026-08-26  
> **SUPERSEDES DDL-04** for **Raw Lead** ownership and persistence model only.  
> **Does not supersede** DDL-04 for **Opportunity** (Company `lifecycle_stage` capability).

| | |
|--|--|
| **Decision** | **Raw Lead** is an **independent Tier A aggregate** owned by **Ofogh**. It is **not** a Company, **not** a Company facet, and **must not** enter the verified-customer lifecycle continuum until conversion creates/links a **Company** (Kanoon). |
| **Current state** | **Implemented (v1):** PostgreSQL `raw_leads`, `/api/v1/leads`, `leadRepository` / `leadService`, FE `LeadRepository`, `useLeadsStore` = SERVER_FIRST cache. Conversion: atomic TX create/link Company + `lead.convert` audit. Identity: `CompanyIdentityResolverPort` + Linka production adapter (`backend/src/integrations/linka/`; Login JWT + CompanyBaseInfo, contract verified 2026-08-27). Entity Card `raw-lead.yaml` = `active`. |
| **Reason** | Business requires capturing unverified interest (inbound call, exhibition card, tip) without polluting Kanoon’s Company registry, without nationalId/Linka, and without enabling Order/finance. Traceability after conversion needs a durable Lead row (attribution: source → lead → company → orders). |
| **Future migration impact** | Implement via [ENTITY_DELIVERY_PIPELINE.md](./ENTITY_DELIVERY_PIPELINE.md): migration → `LeadRepository` → use case → API → FE repository → Zustand **cache**. Soft-delete/archive + append-only audit. Do **not** delete converted leads. |

### Options compared (decision record)

| Option | Model | Verdict |
|--------|--------|---------|
| **A** | Lead = Company facet (DDL-04 as written for “Lead”) | **Rejected for Raw Lead** — forces unverified data into Company; pollutes Kanoon; weak conversion history; Order gating hard to express |
| **B** | Raw Lead = independent Ofogh aggregate; Company = Kanoon | **Accepted (DDL-13)** — matches ownership, ERP gating, attribution, and code trajectory (`useLeadsStore`) |
| **C** | Hybrid temporary only, no durable Lead after convert | **Rejected** — loses attribution; “temporary forever” becomes dual SoR |

### Ownership (locked)

| Entity | Owner module |
|--------|----------------|
| Raw Lead | Ofogh |
| Company | Kanoon |
| ContactPerson | Kanoon (embedded under Company — DDL-02) |
| Activity (soft CRM) | Pooyesh (**DDL-15** — PostgreSQL `activities`; interim client storage until implementation) |
| Order | Nabz |

### Minimum Raw Lead fields (product)

**Required:** `companyName`, `personName`, `mobile`, `leadSource`, description/notes.  
**Optional:** `activityDomain`.  
**Not on Raw Lead:** nationalId required, Linka lookup, Company create in Kanoon (those belong to **conversion**).

### Allowed / forbidden before conversion (domain intent — enforce later)

| Allowed | Forbidden |
|---------|-----------|
| Activity / call / note | Order |
| Task / follow-up via Pooyesh | Quotation / financial ops |
| Qualify / reject | Campaign execution treating Lead as Company |
| | Contract / Company-level ERP ops |

### Lifecycle separation

**Raw Lead lifecycle (outside customer continuum):** `NEW` → `QUALIFYING` → `CONVERTED` \| `REJECTED`  
(Runtime today may still use `OPEN` as umbrella for NEW/QUALIFYING until backend vocabulary lands.)

**Customer lifecycle (Company only, after conversion):** نوپدید → دیدار → رویش → آستانه → نوپیمان → هم‌پیمان → سایه  
Raw Lead **never** receives these stages.

### Visual semantics (architecture only — no UI change in this DDL)

| Stage | Symbol intent |
|-------|----------------|
| Lead (Raw) | dashed circle |
| نوپدید | hollow circle |
| دیدار | 25% filled |
| رویش | 50% filled |
| آستانه | 75% filled |
| نوپیمان | full circle |
| هم‌پیمان | star |
| سایه | moon |

### Duplicate company-name detection (future requirement)

While typing `companyName` on Raw Lead create, suggest similar **existing Companies** in Kanoon so the user can open/link an existing Company instead of inventing a duplicate Raw Lead. Informational / guided UX — not auto-merge. Implementation deferred.

### Conversion contract (future use case — not implemented here)

```text
convertLeadToCompany({ leadId, nationalId, actorId })
  → { leadId, companyId, conversionStatus }
```

Intended transaction steps:

1. Validate Lead is convertible (not already CONVERTED/REJECTED)  
2. Resolve Company by nationalId / Linka / existing match  
3. Create Company **or** link existing Company (Kanoon)  
4. Set Lead `status=CONVERTED`, `convertedCompanyId`, `convertedAt`, `convertedBy`  
5. Append audit (Lead + Company)  
6. **Do not delete** the Lead row (attribution / history)

Converted Lead remains queryable for: Lead Source → Leads → Converted → Companies → Orders.

### Future backend boundary

```text
PostgreSQL leads
  → backend LeadRepository
  → LeadService / convertLeadToCompany use case
  → /api/v1/leads
  → src/api/repositories/LeadRepository
  → Zustand cache (replace useLeadsStore SoR role)
```

### Opportunity vs Raw Lead (do not conflate)

| Concept | Model |
|---------|--------|
| **Raw Lead** | Independent Ofogh aggregate (this DDL) |
| **Opportunity** | Still Company capability via `lifecycle_stage` (DDL-04 remains) |

---

## DDL-14 — Global Raw Lead Gate + Pooyesh polymorphic subject reference

> **Date:** 2026-08-26  
> **Builds on:** [DDL-13](#ddl-13--raw-lead-is-an-independent-ofogh-aggregate), [DDL-15](#ddl-15--pooyesh-activity-is-an-independent-postgresql-aggregate) (Activity SSOT), DDL-09/11 (Pooyesh ownership)

| | |
|--|--|
| **Decision** | Raw Lead may only participate in **Activity / Task / Follow-up / Note**. It is **forbidden** for Order, Quotation, Finance, Campaign audience, Formal Correspondence, and Contract. Pooyesh Task/Activity attach to a polymorphic **EntityReference** (`COMPANY` \| `RAW_LEAD`) via Port/Facade — never by forging a Company from a Lead. |
| **Current state** | Domain contract: `src/domain/entityReference/*`. Pooyesh: `taskFacade` + `interactionFacade` + `ports/subjectEntity.port.js`. Backend Order gate: `backend/src/domain/rawLeadGate.js` on create/update. Mowj `listLeads()` always `[]`; Gahshomar letter search excludes LEAD. Finance/Quotation: domain assert helpers until backends exist. Soft Activity storage still interim on parent aggregates until DDL-15 implementation. |
| **Reason** | Prevent Raw Lead leakage into Nabz/Mowj/Finance/Gahshomar after Lead API landed; keep Pooyesh as the only operational consumer of unverified parties. |
| **Future migration impact** | Implement Activity SSOT per **DDL-15** (`subject_type` / `subject_id`). Wire Finance/Quotation/Gahshomar APIs to the same gate codes. |

### Capability matrix (locked)

| Capability | Company | Raw Lead |
|------------|---------|----------|
| Activity / Task / Follow-up / Note | ✅ | ✅ |
| Order / Quotation / Finance / Campaign / Correspondence / Contract | ✅ (RBAC) | ❌ |

### EntityReference contract

```js
{ entityType: 'COMPANY' | 'RAW_LEAD', entityId: '...' }
```

Error codes: `RAW_LEAD_NOT_ELIGIBLE_FOR_ORDER` · `…_FINANCE` · `…_CAMPAIGN` · `…_CORRESPONDENCE` · `INVALID_ENTITY_REFERENCE`.

### After conversion

ERP mutations (Order, Finance, …) use **`companyId` only**. Lead row remains for attribution; modules must not use `leadId` for those capabilities.

---

## DDL-15 — Pooyesh Activity is an independent PostgreSQL aggregate

> **Date:** 2026-08-26  
> **RESOLVES / SUPERSEDES [DDL-05](#ddl-05--activity-ownership-requires-a-future-dedicated-decision)** for soft-CRM Activity ownership and SoR.  
> **Does not unify** Nabz Order `crmActivities`, Order operational `events`, stage history, financial events, or `audit_log`.  
> **Builds on:** DDL-09 / DDL-11 (Pooyesh owns soft interactions), DDL-14 (EntityReference `COMPANY` \| `RAW_LEAD`).

| | |
|--|--|
| **Decision** | **Activity** is an **independent Tier A aggregate** owned by **Pooyesh**. **SSOT = PostgreSQL** table `activities`. Each Activity holds only a **SubjectReference** `{ entityType: 'COMPANY' \| 'RAW_LEAD', entityId }` — it must **not** duplicate Company or Raw Lead data. |
| **Current state** | **Implemented (v1):** PostgreSQL `activities`, `/api/v1/activities`, `activityRepository` / `activityService`, FE `ActivityRepository`, `useActivitiesStore` = SERVER_FIRST cache. Facades rewired. Entity Card `activity.yaml` = `active`. Legacy parent `interactions[]` not auto-migrated. |
| **Reason** | DDL-09/11 already assigned soft CRM to Pooyesh; DDL-14 already standardized polymorphic subjects. DDL-05’s “no Activity table” rule blocked PostgreSQL SoR after that foundation landed. Closing DDL-05 enables Entity Delivery Pipeline without inventing a global event bucket. |
| **Future migration impact** | Funded implementation: migration `004_activities.sql` (or next version) → `activityRepository` → service/API `/api/v1/activities` → FE `ActivityRepository` → rewire facades SERVER_FIRST; Zustand/cache only. Soft-delete + append-only audit. Application-level subject integrity (v1) — no polymorphic FK registry table. |

### Scope boundary (locked)

| In Pooyesh Activity | Out of Pooyesh Activity (keep separate) |
|---------------------|------------------------------------------|
| Call, note, meeting, follow-up, soft human/CRM touch | Nabz Order `crmActivities` |
| Interaction on Company or Raw Lead | Order operational `events` / stage history |
| Timeline soft stream source (via facade) | Financial / settlement events |
| | System `audit_log` |

Activity **must not** become a dump for all ERP events.

### Task ≠ Activity (locked)

- **Task** remains a separate Pooyesh concept (`taskFacade` / future Task entity).  
- Task may create or reference an Activity; they are **not** the same aggregate.  
- This DDL does **not** change Task architecture.

### SubjectReference + integrity (v1)

```js
{ entityType: 'COMPANY' | 'RAW_LEAD', entityId: '...' }
```

- Unknown `entityType` → reject (`INVALID_ENTITY_REFERENCE`).  
- **COMPANY** → active company via `companyRepository.findById`.  
- **RAW_LEAD** → active lead via `leadRepository.findById` + DDL-14 Activity capability allowed.  
- **v1:** application-level validation only (no polymorphic reference registry table).

### Lifecycle (v1 — keep simple)

Soft CRM today is logging-oriented; no complex state machine.

| Status | Meaning |
|--------|---------|
| `OPEN` | Active / logged (default) |
| `COMPLETED` | Explicitly completed |
| Archived | Soft-delete (`deleted_at` / `deleted_by`) — not a status enum value |

Do not invent extra statuses without a new DDL.

### Ownership summary after DDL-15

| Entity | Owner | SoR |
|--------|-------|-----|
| Activity (soft CRM) | Pooyesh | PostgreSQL `activities` (when implemented) |
| Task | Pooyesh | Separate from Activity |
| Company | Kanoon | PostgreSQL `companies` |
| Raw Lead | Ofogh | PostgreSQL `raw_leads` |
| Order CRM activities | Nabz | Order document (not `activities`) |

---

## DDL-16 — Pooyesh Task is an independent PostgreSQL aggregate

> **Date:** 2026-08-26  
> **Builds on:** DDL-09 (Pooyesh owns tasks), DDL-14 (EntityReference), DDL-15 (Task ≠ Activity).  
> **Does not change** Activity SSOT, Mowj campaign domain model, or Nabz.

| | |
|--|--|
| **Decision** | **Task** is an **independent Tier A aggregate** owned by **Pooyesh**. **SSOT = PostgreSQL** table `tasks`. SubjectReference `{ entityType: 'COMPANY' \| 'RAW_LEAD', entityId }` required on create (same as current facade). **Task ≠ Activity**. |
| **Current state** | **Implemented (v1):** PostgreSQL `tasks`, `/api/v1/tasks`, repositories/services, FE `TaskRepository` + `useTasksStore`, `taskFacade` rewired. Entity Card `task.yaml` = `active`. Mock mode retains in-memory array for offline/unit tests. |
| **Reason** | In-memory `taskFacade` array is not durable; Mowj CREATE_TASK and Ofogh/Kanoon subjects need server SSOT while keeping Port/Facade boundaries. |
| **Future migration impact** | Soft-delete + audit; application-level subject integrity; assignment validates `users.id` when set. Mowj continues via `PooyeshTaskPort` → facade only. |

### Lifecycle (v1)

`OPEN` → `IN_PROGRESS` \| `COMPLETED` \| `CANCELLED`  
`IN_PROGRESS` → `COMPLETED` \| `CANCELLED`  
`COMPLETED` / `CANCELLED` → terminal (complete twice → `TASK_ALREADY_COMPLETED`)

Priority vocabulary (aligned with current facade): `low` \| `normal` \| `high` \| `urgent` (default `normal`).

### Scope boundary

| In Pooyesh Task | Out |
|-----------------|-----|
| Internal ERP follow-up tasks | Soft CRM Activity rows |
| Mowj CREATE_TASK via Port | Campaign aggregate itself |
| Subject COMPANY / RAW_LEAD | Order / Finance tasks |

---

## DDL-17 — Ofogh Personal Lead Pipeline (user-owned) vs Customer Lifecycle (system)

> **Date:** 2026-08-27  
> **Builds on:** DDL-13 (Raw Lead), DDL-04 (Opportunity/Customer Lifecycle on Company)

| | |
|--|--|
| **Decision** | Ofogh exposes **two views**: (1) **Lead Management** — one **personal** Kanban pipeline per user (`lead_pipelines` / `lead_pipeline_stages`, `raw_leads.pipeline_stage_id`); (2) **Customer Lifecycle Management** — fixed, system-controlled Company stages (نوپدید…هم‌پیمان). |
| **Current state** | Migration `007_lead_personal_pipeline.sql`; API `/api/v1/lead-pipelines/me`; Lead system status remains `NEW`/`QUALIFYING`/`CONVERTED`/`REJECTED` (+ archive with reason). Convert/Archive are explicit actions, not pipeline columns. Pipeline owner today = Lead `created_by` (no `assigned_to` yet). |
| **Reason** | Experts need personalizable workflow without polluting management reporting or Customer Lifecycle. Personal stage names are **not** business qualification and **must not** be used as canonical management dimensions. |
| **Future migration impact** | Org pipeline **template** copy-on-provision is allowed later; do not share mutable pipelines across users. Optional `assigned_to` + reassignment handoff needs a follow-up DDL when product requires it. |

### DDL-17 rules

1. **Personal Pipeline Stage ≠ System Lead Status ≠ Customer Lifecycle stage.**  
2. One active personal lead pipeline per user (v1).  
3. Cross-user stage mutation → forbidden (ownership enforcement on API).  
4. Management reports use system status / conversion / activity / order / customer lifecycle — **not** personal stage names.

---

## DDL-18 — Successful Purchase Event = Order.status SUCCESS (final close)

> **Date:** 2026-08-27  
> **Status:** **SUPERSEDED by DDL-18(B)**  
> **Builds on:** DDL-04 / Customer Lifecycle; Nabz `ORDER_WORKFLOW.md`; `orderLifecycle.js`

| | |
|--|--|
| **Decision** | **(A)** `Order.status == success` is the **only** Successful Purchase Event = **final close** (saranjam archive / settlement complete). Phase-2 entry uses a **separate signal**: `phase2EnteredAt` and/or `gatewayDecision.outcome === 'success'` while status remains **`current`**. |
| **Superseded** | Product final decision **DDL-18(B)** separates Outcome vs Closure. Do not implement (A) as current law. |

---

## DDL-18(B) — Outcome + Closure (supersedes DDL-18(A))

> **Date:** 2026-08-27  
> **Status:** **CLOSED — product final** (this conversation pack)  
> **Supersedes:** DDL-18(A)  
> **Builds on:** DDL-04; Nabz workflow; tax policy (VAT-inclusive commercial)

| | |
|--|--|
| **Outcome (`orders.status`)** | `current` \| `success` \| `failed` |
| **Closure (`payload.closure`)** | `open` \| `closed` (expand-only; default `open`) |
| **UI four views** | جاری=`CURRENT+OPEN`; موفق=`SUCCESS+OPEN`; ناموفق=`FAILED`; بسته‌شده=`SUCCESS+CLOSED` |
| **CURRENT** | Pre commercial decision (کاوش/مظنه/پیش‌کش) |
| **SUCCESS** | Sale committed (gateway / quotation accept). May still be in تدارک/رهسپار/سرانجام with `closure=open`. **SUCCESS ≠ CLOSED.** |
| **FAILED** | Failed before SUCCESS; `failReason` required; terminal for sales outcome |
| **CLOSED** | Only after SUCCESS + saranjam/settlement gates. `CURRENT→CLOSED` and `FAILED→CLOSED` forbidden. |
| **Successful Purchase Event** | Becoming **SUCCESS** (not CLOSED). 1→نوپیمان; 2→نوپیمان; 3+→هم‌پیمان. CLOSED must **not** increment purchase count again. |
| **Transitions** | Allowed: `CURRENT→SUCCESS`, `CURRENT→FAILED`, `SUCCESS→CLOSED`. Forbidden: `FAILED→SUCCESS`, `FAILED→CLOSED`, `CLOSED→*`, `SUCCESS→CURRENT` (reopen OOS). |
| **Migration** | `009_ddl18b_outcome_closure.sql` restores Phase-2 open rows demoted by 008 → `success`+`open`; saranjam-archived → `success`+`closed`. |
| **Tax** | Only two real prices: `purchasePrice` + `sellingPrice` (both VAT-inclusive commercial). Formal/Informal does **not** change those — formal only derives `displaySellingUnitPrice = round(sellingPrice/1.1)` and `VAT = sellingPrice − display` (line-level: economic − Σ display). Informal display = `sellingPrice`. Never add 10% on inclusive. Moghayer: **PRODUCT DECISION REQUIRED — MOGHAYER ALLOCATION RULES**. Backend authoritative; tamper reject; rate `0.10`; quotation snapshot. |
| **Supplier gate** | Supplier-only Company rejected on Order create (BE). Customer and BOTH allowed. Ownership remains Kanoon. |

---

## DDL-19 — Activity Type Registry is a Shirazeh-owned config aggregate (Tier B)

> **Date:** 2026-08-27
> **Status:** CLOSED — implemented
> **Builds on:** DDL-15 (Pooyesh Activity is an independent PostgreSQL aggregate)

| | |
|--|--|
| **Decision** | `activities.activity_type` values are governed by a new, centrally-owned lookup table `activity_type_registry` (key/label_fa/sort_order/is_active), managed by Shirazeh (Settings). This is a **config/registry aggregate (Tier B)**, not a copy of Activity data. |
| **Current state** | Migration `010_activity_type_registry.sql` creates the table and seeds the audited canonical list from every existing hardcoded FE list (`call`, `message`, `meeting`, `catalog`, `note`) plus `task` (migration `012_...`, kept for FE behavior parity in `OfoqRawLeadDetailModal.jsx` — a quick free-text "task-like" Activity note, distinct from the canonical Pooyesh Task entity). Backend `activityTypeRepository.js` / `activityTypeService.js` / `routes/activityTypes.js` provide CRUD (soft activate/deactivate only, no hard delete). `activityService.createActivity`/`updateActivity` validate `activityType` against **active** registry keys server-side (service-layer check, **not** a DB FK — see below). |
| **Reason** | At least 3 independent FE modules (Pooyesh, Ofogh, Nabz) each hardcoded their own Activity-type list with drifting labels. A single canonical, backend-persisted registry (owned by Shirazeh, per its existing "central configuration surface" role) removes drift and lets ops add/rename/retire types without a deploy. |
| **Why no DB-level FK** | `activities.activity_type` stays a free `TEXT` column (expand-only — no destructive constraint change). A hard FK would make deactivating (or, worse, any future rename) of a type break historical rows. Enforcement of "only active registry keys allowed" is intentionally a **service-layer** check applied only on **write** (create, or update when the type field itself changes) — historical rows keep an old/deactivated key and remain fully readable; the display layer resolves the label via the full (not just active) registry list. |
| **Future migration impact** | Any new Activity-creation surface **must** read types from `GET /api/v1/activity-types` (via `src/domain/activityTypes/activityTypesFacade.js`) — never hardcode a new local list. If a type needs renaming, `PATCH /activity-types/:key` (rename) is additive-only (key/slug is stable; only `label_fa`/`sort_order`/`is_active` change). |

---

## DDL-20 — Activity follow-up date creates/links a canonical Pooyesh Task (idempotent)

> **Date:** 2026-08-27
> **Status:** CLOSED — implemented
> **Builds on:** DDL-15, DDL-16 (Pooyesh Task is an independent PostgreSQL aggregate)

| | |
|--|--|
| **Decision** | When an Activity is created (or updated) with a future `followUpAt`/`dueAt`, `activityService` atomically (same DB transaction) creates-or-updates **one** linked canonical Task via a new first-class column `tasks.source_activity_id TEXT REFERENCES activities(id)` (migration `011_activity_task_followup_linkage.sql`, indexed). No `payload.sourceActivityId` shadow key is used — the FK column is the single source of truth for the linkage. |
| **Idempotency rule** | If a Task already linked to this `sourceActivityId` exists and is still `OPEN`/`IN_PROGRESS`, the existing Task's `title`/`dueAt` are updated in place (no duplicate). If the linked Task was already `COMPLETED`/`CANCELLED`, it is **never resurrected** — completed/cancelled work is never silently overwritten. |
| **Follow-up removed/cleared rule** | If the follow-up is cleared on Activity update and the linked Task is still `OPEN`/`IN_PROGRESS` (auto-created from this follow-up), it is transitioned to `CANCELLED` via the existing status-transition path. If it is already `COMPLETED`, it is left untouched (never destroyed). |
| **Reason** | Follow-up dates recorded on an Activity are a well-understood commitment; product intent is "this must show up as a real, actionable Task" (Task board, Calendar, Customer/Lead/Order projections) rather than a second, weaker reminder concept living only on the Activity row. |
| **Future migration impact** | Any Activity-creation surface funneling through `activityService.createActivity`/`updateActivity` (Kanoon/Company, Ofogh/RawLead, Nabz via `orderActivityBridge.js`) gets this behavior for free — no per-module wiring needed. Do not add a second, independent follow-up→reminder mechanism anywhere else. |

---

## DDL-21 — Lead lineage on Customer 360 is a read-time projection only (no copy/re-key)

> **Date:** 2026-08-27
> **Status:** CLOSED — implemented
> **Builds on:** DDL-13 (Raw Lead is an independent Ofogh aggregate), DDL-10/DDL-11 (Company Timeline Projection Ownership)

| | |
|--|--|
| **Decision** | Kanoon's Customer 360 timeline (`buildCompanyTimelineEvents.js`) merges pre-conversion Ofogh Lead Activities/Tasks (`subjectType=RAW_LEAD`) as a **read-time projection**, via a new optional `leadLineage` parameter (`Array<{ lead, activities, tasks, deepLink }>`, default `[]`, fully backward compatible). `companyTimelineFacade.js` (Pooyesh) computes this by calling Ofogh's existing public `fetchLeadsConvertedToCompany(companyId)` and then reading each lead's Activities/Tasks via Pooyesh's own `interactionFacade`/`taskFacade` with a `RAW_LEAD` subject reference — **no new Kanoon-owned or Pooyesh-owned Lead storage, no rewrite of any Activity/Task row's `subject_type`/`subject_id`.** |
| **Current state** | Projected events use distinct kinds (`lead-activity`, `lead-task`, `lead-conversion`) carrying `leadId` + a deep-link back to the Ofogh Lead detail (`buildOfoghLeadDeepLink`). A single company may have 0..N converted-from leads (structurally possible even if rare in practice) — **all** are projected, not just a single "primary origin" (`pickPrimaryOriginLead` remains available for callers that need a single-origin summary elsewhere, but is not forced here). |
| **Reason** | Lead stays Ofogh-owned, Activity/Task stay Pooyesh-owned, Company stays Kanoon-owned — copying rows into a new table (or re-keying `subject_id` from `RAW_LEAD` to `COMPANY` on conversion) would violate all three ownership boundaries and silently lose the pre-conversion audit trail. |
| **Future migration impact** | Any future Lead-lineage consumer must call the same `fetchLeadsConvertedToCompany` + Pooyesh subject-scoped Activity/Task read path — never introduce a second Lead→Company lineage lookup. |

---

## DDL-22 — Activity/Task mutation is ownership-scoped (assignee/creator or elevated role)

> **Date:** 2026-08-27
> **Status:** CLOSED — implemented
> **Builds on:** DDL-15, DDL-16; `Docs/architecture/AUTHORIZATION_MODEL.md`

| | |
|--|--|
| **Decision** | A mutation (`update`, `changeStatus`, `complete`, `archive`) on an Activity or Task is allowed only if the actor is the record's `assignedTo` or `createdBy`, **or** the actor's JWT-derived roles include an elevated role. `backend/src/domain/access/ownershipGate.js` (`assertOwnerOrElevated`) implements this and is used by both `activityService.js` and `taskService.js`; violation throws `403 OWNERSHIP_FORBIDDEN`. |
| **Elevated roles (enforceable minimum)** | Only `admin` bypasses ownership scoping today. **`sales_manager` does NOT bypass** — the seed data has no `manager_id`/`team_id` hierarchy field, so "manager of this specific user/team" cannot be safely scoped; granting `sales_manager` a blanket bypass would be broader than the actual product intent ("manager of their team"), so the conservative, correct-for-today choice is `admin`-only bypass. |
| **PRODUCT DECISION REQUIRED (open)** | No manager/team hierarchy field exists (`manager_id`/`team_id`) to scope `sales_manager` to only their own team's Activities/Tasks. Until that field exists, `sales_manager` is subject to the same ownership check as `sales`/`purchase`/`accounting`. |
| **Reason** | Before this decision, any actor holding `activities:write`/`tasks:write` could mutate **any** record regardless of assignment — a real cross-tenant-within-org data-integrity gap identified during the Pooyesh QA pass. |
| **Future migration impact** | If/when a manager/team hierarchy field is added to `users`, this DDL should be superseded with a scoped `sales_manager` rule (e.g. "assignee's `manager_id === actor.userId`"), not silently patched. Create is intentionally **not** ownership-scoped beyond existing subject-reference + permission checks (no per-Company/per-Lead ACL concept exists in this codebase; do not invent one without a new DDL). |

---

## DDL-23 — Gahshomar Correspondence is a real backend-persisted Tier A aggregate

> **Date:** 2026-08-27
> **Status:** CLOSED — implemented
> **Builds on:** DDL-12 (Gahshomar Correspondence Ownership), DDL-09/DDL-11 (Pooyesh vs Gahshomar boundary), DDL-15/16/19 (PostgreSQL aggregate + Type Registry pattern), DDL-14 (EntityReference / Raw Lead exclusion)

| | |
|--|--|
| **Decision** | **Correspondence** (official letters in/out + internal memos) is an **independent Tier A aggregate** owned by **Gahshomar**. **SSOT = PostgreSQL** table `correspondence` (+ `correspondence_attachments`, `correspondence_number_counters`, `correspondence_type_registry`). The legacy in-memory `officialRecordRepository.js` array becomes the **mock-mode-only** fallback (`VITE_USE_MOCK_API=true`, used by unit tests / offline dev) — never the source of truth when the API is live. Legacy duplicate model `models/correspondence.js` + `store/useCorrespondenceStore.js` + `services/correspondenceService.js` + `correspondenceBinding.js` + orphan components (`CorrespondenceList.jsx`, `CorrespondenceDetailDrawer.jsx`, `CorrespondenceComposeModal.jsx`) are **fully deleted** (verified zero remaining imports repo-wide via grep, plus green `typecheck`/`build`/unit-test suite) rather than kept as re-export shims — none of them were referenced by any mounted route or external caller once `officialRecordFacade.js` became the sole path, so a shim layer would have been dead code. |
| **Current state** | Migrations `013_correspondence.sql` + `014_correspondence_assignee_no_fk.sql` (see DDL-23f). Backend `repositories/correspondenceRepository.js` / `services/correspondenceService.js` / `services/correspondenceAiService.js` / `routes/correspondence.js` mounted at `/api/v1/correspondence`. FE `src/api/repositories/CorrespondenceRepository.js` + `src/modules/gahshomar/store/useOfficialRecordStore.js` (SERVER_FIRST cache) wired into `officialRecordFacade.js` (dual-path: mock in-memory when `useMockApi()`, real API otherwise — same pattern as `interactionFacade.js`/`taskFacade.js`). RBAC codes `correspondence:read` / `correspondence:write` / `correspondence:finalize` added to `backend/src/db/seed.js`. Entity Card `correspondence.yaml` = `active`. |
| **Reason** | Baseline audit found correspondence was 100% client-only mock with two parallel duplicate models, non-concurrency-safe client-computed numbering, zero backend attachment storage, and zero RBAC enforcement — a Tier A gap inconsistent with the Entity Delivery Pipeline already applied to Activity/Task/Lead. |
| **Future migration impact** | Any correspondence-creation surface must go through `officialRecordFacade.js` → repository → API — never a local array. Kanoon (`useCompanyOfficialRecords`) and future Nabz/Pooyesh consumers read the same facade; no shadow storage. |

### DDL-23(a) — Official numbering is server-authoritative, assigned only at FINALIZE, concurrency-safe

| | |
|--|--|
| **Decision** | Registry number format `{yy}/{IN\|OUT\|INT}/{seq}` (Persian digits, 3-digit zero-padded sequence — unchanged from `letterRegistryNumber.js` display contract, so `PrintableOfficialLetter.jsx` and list views need no rendering change) is computed **only in the backend**, **only at finalize** (`POST /api/v1/correspondence/:id/finalize`), inside a single DB transaction using a dedicated counter table `correspondence_number_counters (year_short, direction_code, next_seq)` with `INSERT ... ON CONFLICT DO UPDATE SET next_seq = next_seq + 1 RETURNING next_seq - 1` (atomic read-modify-write; no separate `SELECT MAX` + client compute, no race window). `correspondence.official_number` has a **DB-level `UNIQUE` constraint** — a second safety net if the counter path were ever bypassed. Client-supplied `number`/`registryNumber` on create/update is **always ignored** by the backend. |
| **Reason** | The old `nextRegistrySequence` scanned the client's in-memory array — two browser tabs (or even two calls in the same tab) could compute the same "next" number. An atomic `UPDATE ... RETURNING` (or equivalent `INSERT ON CONFLICT`) on a small counter row is the standard safe pattern and is verified by a real concurrent-finalize integration test (`Promise.all` of two finalize calls against the same running Postgres instance) asserting distinct numbers. |
| **Future migration impact** | Any future numbering scheme change (e.g. per-company prefixes) must keep the same atomic-counter-row pattern — never reintroduce client-side "scan existing records for max" logic. |

### DDL-23(b) — Attachment storage: DB-column base64 (no filesystem, no S3)

| | |
|--|--|
| **Decision** | Attachment bytes are stored **base64-encoded inside a PostgreSQL column** (`correspondence_attachments.data_base64 TEXT`) alongside `file_name`, `mime_type`, `size_bytes`, `created_at`, `created_by` — **not** a local uploads directory and **not** a cloud object store. |
| **Reason** | Simplest safe option consistent with "no S3/cloud dependency assumed" and this codebase's existing convention of not touching the host filesystem from the API process (no multer/static-uploads precedent anywhere in `backend/`). Avoids new backup/restore surface (uploads dir) beyond the existing `pg_dump`-based `BACKUP_RESTORE.md` flow — attachments are automatically included in any DB backup with zero extra ops work. Size is capped (`1MB` per attachment, enforced by `express.json({ limit: '2mb' })` bump on this route + a service-layer `MAX_ATTACHMENT_BYTES` check) since this is metadata-plus-small-scan storage, not a document management system. |
| **Future migration impact** | If attachment volume/size grows past what's comfortable in Postgres, a future DDL can move `data_base64` to an object-store URL column (`storage_url`) while keeping `file_name`/`mime_type`/`size_bytes` — additive column, no breaking change to the read contract (`{ id, fileName, mimeType, size, dataUrl }`). |

### DDL-23(c) — AI rewrite: real backend call wired via existing Liara/DeepSeek infra; critical-value-preservation validator is real and deterministic (P0, non-negotiable)

| | |
|--|--|
| **Decision** | **(a) chosen.** `backend/src/services/correspondenceAiService.js` ports the *real* AI-call logic already proven in `src/server/services/aiService.js` (`rewriteWithAI` — Liara-hosted DeepSeek, server-only API key via `LIARA_AI_KEY` env, already used live by the mounted-but-generic `/api/ai/rewrite` route in `backend/src/index.js`) behind a new, correspondence-specific, authenticated endpoint `POST /api/v1/correspondence/:id/ai-rewrite` (`correspondence:write` required) with a formal-letter system prompt (distinct from the meeting-notes prompt in `aiRoutes.js`). This reuses working, already-network-tested infrastructure instead of re-inventing a second AI client. |
| **Non-mutation safety (P0)** | Independent of whether the live network call succeeds in any given environment (unreliable in CI/sandbox — acknowledged per spec), `backend/src/domain/correspondence/criticalValuePreservation.js` (`checkCriticalValuePreservation(original, rewritten)`) is a **pure, deterministic, dependency-free function**: extracts amounts (with/without ریال, thousand separators, Persian+Latin digits), percentages, dates (Jalali `YYYY/MM/DD` and Gregorian `YYYY-MM-DD`), order/invoice/contract-style codes (`JR-######`, `##-##-####` style, generic `[A-Za-z]*[-/]?\d{3,}` tokens), and quantities-with-units (تن/کیلوگرم/عدد/متر) from both texts as **multisets**, and reports `{ ok, violations: [{ kind, before: string[], after: string[] }] }` when the rewritten text's multiset of any category is not a superset-preserving match of the original's (missing or changed values = violation; purely additive new values in the rewrite do not fail the check, since AI is allowed to add boilerplate/formatting, only forbidden from *losing or changing* a protected fact). The **route** always runs this check on every AI-rewrite response server-side (never the client) and returns `{ content, safety: { ok, violations } }` — the FE displays a hard warning banner and **must not** let the user silently accept a rewritten body with `safety.ok === false`; FINALIZE re-validates using the same function comparing the record's stored raw body against its final body (independent of whether AI was used at all), rejecting with `422 CRITICAL_VALUE_MUTATION` if violated. |
| **Reason** | Spec explicitly marks the AI text-generation call itself as conditionally-tested (network-dependent, acceptable to skip in E2E) but the critical-value safety net as a **hard P0 that must be real, unit+integration tested, and actually block/warn on FINALIZE** — this is honored literally: the validator has zero dependency on any AI provider being reachable and is exercised by a large deterministic unit-test matrix (`backend/src/domain/correspondence/__tests__/criticalValuePreservation.test.js`) covering amount/date/percentage/order-number mutation, safe rewrites (rewording only), and additive-safe rewrites. |
| **Future migration impact** | If a different AI provider replaces Liara/DeepSeek, only `correspondenceAiService.js`'s call site changes — the validator and its block/warn contract on FINALIZE do not change. |

### DDL-23(d) — Correspondence Type Registry (Shirazeh, Tier B) mirrors Activity Type Registry (DDL-19) exactly

| | |
|--|--|
| **Decision** | `correspondence.type_key` values are governed by `correspondence_type_registry` (key/label_fa/sort_order/is_active), owned by Shirazeh, CRUD at `/api/v1/correspondence-types` (`users:admin` for mutation, `correspondence:read` for list — same permission-split pattern as `activity-types`). `correspondence.type_key` stays free `TEXT` (no FK) so historical letters survive type deactivation, per the exact same reasoning as DDL-19. Seeded with the pre-existing hardcoded taxonomy (`OFFICIAL`, `INTERNAL` from `officialRecord.js`, plus common categories already used in UI templates: `استعلام`, `قرارداد`, `پاسخ`, `اعلامیه`). |
| **Reason** | Spec requires "one canonical registry, not a fixed enum" and explicitly says to reuse the Activity Type Registry pattern rather than inventing a new shape. |
| **Deferred (documented, not blocking)** | Full company writing-style / header-footer / print-branding visual configuration surface is **not** built in this phase beyond the Type Registry — numbering itself is already server-authoritative per DDL-23(a) (no separate "numbering configuration" UI needed yet: format is fixed and correct), and print header/footer/logo already exist client-side (`PrintableOfficialLetter.jsx` + `sarbarg.jpg`) with no product ask to make them admin-configurable yet. This gap is recorded in the backlog (see final report item AD), not silently dropped. |

### DDL-23(e) — Cross-module correspondence access stays read-time projection only

| | |
|--|--|
| **Decision** | Kanoon (`GahshomarDocumentsPanel` / `useCompanyOfficialRecords`), Nabz (new `OrderProfileCorrespondenceTab`), and Pooyesh (`buildCompanyTimelineEvents` correspondence events) all read correspondence via `officialRecordFacade.js` (Gahshomar's own public surface) — **none** of them copy correspondence rows into their own store/table. Nabz's Order Profile correspondence tab is a **read-only** list filtered by `orderId`; clicking a row deep-links to Gahshomar (`/gahshomar?recordId=...`), it does not open an embedded editor. Pooyesh's `CompanyTimelinePanel` subscribes to a dedicated `useOfficialRecordsVersion()` re-render hook (mirrors `useActivitiesVersion`/`useTasksVersion`) and `companyTimelineFacade.fetchSubjectTimeline` explicitly hydrates the correspondence cache for `COMPANY` subjects before building events — otherwise a fresh page load straight into the Timeline tab (no prior Documents-tab visit in the same session) would silently show zero correspondence events even though FINAL letters exist, since the correspondence Zustand cache is empty until something fetches it. |
| **Reason** | Matches the existing Kanoon pattern (DDL-12 boundary rule 6: "UI must not access correspondence storage directly") and DDL-11's "Pooyesh must not own/copy the document" instruction for the timeline event. The explicit hydrate-before-build fix was required because (unlike Activities/Tasks, which `fetchSubjectTimeline` already fetched) correspondence had no pre-existing fetch call in this facade, discovered only once Journey 012's E2E timeline assertion was run against a genuinely fresh SPA mount (Playwright `page.goto` = hard reload, not a soft client route change). |
| **Future migration impact** | Any new module needing correspondence data must call `officialRecordFacade.js`, never a new direct repository/API call of its own. Any future read-time projection that depends on an async-hydrated cache must both (1) trigger the fetch and (2) subscribe to that store's version counter for re-render — triggering the fetch alone is not sufficient. |

### DDL-23(f) — `assignee_user_id` is a free-text org-referral reference, not an authenticated-user FK

| | |
|--|--|
| **Decision** | `correspondence.assignee_user_id` (who an INCOMING letter is referred to internally) has **no foreign key** to `users(id)` (migration `014_correspondence_assignee_no_fk.sql`, dropping the FK the initial `013_correspondence.sql` shipped with). `assignee_name` carries the display label regardless of whether the id resolves to a real backend account. |
| **Reason** | `src/modules/gahshomar/services/orgPeople.js` (`getDefaultAssignee`/`listOrgPeopleForReferral`) is a lightweight org-chart directory (`ORGANIZATION_TREE` fixture) used to route physical incoming mail to a person inside the company — that person does not necessarily have (or need) an authenticated `users` row. Enforcing a hard FK made every ordinary INCOMING-letter creation fail with `23503 foreign_key_violation` the moment a real Postgres constraint was in play (caught by Playwright Journey 013, not by unit tests, since unit tests use the mock in-memory path). This mirrors how `attention_name`/`sender_party`/`receiver_party` are already plain text/JSONB with no referential integrity — assignee is the same kind of "display reference," not a security principal. |
| **Future migration impact** | If Gahshomar later needs real accountability/notifications tied to assignee (e.g. "notify this user"), that is a new, additive `assignee_user_id_verified` (or similar) column with a real FK — do not re-add a hard FK to the existing free-text `assignee_user_id`. |

---

## DDL-24 — Product Master: Shirazeh (taxonomy/schema/UOM/Brand) vs Vitrin (Product/SKU) ownership split; PostgreSQL SSOT

> **Date:** 2026-08-28
> **Status:** CLOSED — implemented
> **Builds on:** DDL-15/16/19 (PostgreSQL aggregate + Type Registry pattern proven for Activity/Correspondence Type Registries), DDL-23 (atomic-counter numbering pattern), `jarian-module-boundaries.mdc`, `jarian-client-state-ssot.mdc`

| | |
|--|--|
| **Decision** | **Product Master** is split into two Tier A/B aggregate families, each backend-persisted in PostgreSQL (SoR), never Zustand/localStorage: **Shirazeh owns** the *taxonomy + schema + controlled registries* — `product_groups` → `product_categories` → `product_types` (extensible N-level-ready but implemented as the exact 3-level hierarchy the contract specifies), `attribute_definitions` + `product_type_attributes` (schema binding), `uom_registry` + `uom_conversions`, `brands`. **Vitrin owns** the *actual Product/SKU aggregate* — `products` (SKU, generated/override name, lifecycle, UOM/weight-profile config, canonical identity key), `product_attribute_values` (structured values per the inherited schema), plus bulk-import bookkeeping (`product_bulk_import_batches`). Nabz is **not** touched — no new FK from any Nabz table into these new tables, no Nabz schema change, no Nabz code change. |
| **Current state** | Migrations `015_product_master_taxonomy.sql` → `018_product_master_bulk_import.sql`. Backend: `repositories/{productGroupRepository,productCategoryRepository,productTypeRepository,uomRepository,brandRepository,attributeDefinitionRepository,productTypeAttributeRepository,productRepository,productBulkImportRepository}.js` / `services/{productTaxonomyService,uomService,brandService,attributeDefinitionService,productService,productBulkImportService}.js` / `routes/{productTaxonomy,attributeDefinitions,uom,brands,products}.js` mounted under `/api/v1/{product-taxonomy,attribute-definitions,uom,brands,products}`. Domain helpers in `backend/src/domain/productMaster/{normalize,taxonomyCode,skuGenerator,nameGenerator,weightProfile}.js`. RBAC codes `products:read/write/lifecycle/manage-taxonomy/manage-brands/bulk-import` in `backend/src/db/seed.js`. Entity Cards: `product-taxonomy.yaml`, `attribute-definition.yaml`, `uom-registry.yaml`, `brand.yaml`, `product.yaml`. |
| **Reason** | Baseline audit found Vitrin was 100% client-only mock data (`catalogData.js`) with a 2-level taxonomy (no Category/Type distinction), unstructured free-text `specs` object, non-concurrency-safe client-computed product codes, zero backend, and a shadow `relatedOrders` projection of Nabz data — a Tier A gap identical in class to the pre-Correspondence Gahshomar state (DDL-23), and the module-boundary rule already names this exact ownership split (Shirazeh = taxonomy/schema/UOM/Brand, Vitrin = Product/SKU) as the target, so this DDL formalizes and implements it rather than inventing a new split. |
| **Future migration impact** | Any new taxonomy/attribute/UOM/Brand admin surface must go through Shirazeh's repositories/services — never a second registry. Any new Product-facing mutation (create/update/lifecycle) must go through Vitrin's `productService.js` — never a client-computed SKU or client-only duplicate check. Nabz's future Order Line → Product reference (see `Docs/architecture/product-master-nabz-future-contract.md`) must read via a Vitrin public facade, never a direct `products` table/store import. |

### DDL-24(a) — `catalogData.js` stays a static, shape-compatible shim; Nabz/Kanoon are not migrated to the real API in this phase

| | |
|--|--|
| **Decision** | `src/modules/vitrin/catalogData.js` is **not** deleted and **not** turned into an async API-fetching module. It remains a **synchronously-importable, static seed-shaped module** exporting `initialGroups`/`initialProducts` in the exact legacy shape (`{id, name, subgroups:[{id,name}]}` / product rows with `groupId`/`subgroupId`/`code`/`title`/`isActive`) that `src/modules/nabz/vitrinCategories.js` (frozen) and `src/modules/kanoon/supplierCapabilities.js` (read-only projection) already depend on via direct synchronous ES-module import. |
| **Reason** | Nabz's `ProductPickerModal.jsx` imports `vitrinCategories.js` at module-evaluation time (top-level `import`), which is synchronous by JS module semantics — there is no way to make that import await a real `fetch()` to the new `/api/v1/products` API without editing Nabz itself, which is an absolute constraint violation. Making `catalogData.js` real-API-backed would either require Nabz edits (forbidden) or a hidden async race (module loads before data arrives — silently broken product picker). A static, versioned seed shim is the only option that guarantees zero Nabz diff while the real Product Master (Shirazeh+Vitrin, backend+new Vitrin UI) is fully real and backend-authoritative. |
| **Future migration impact** | When Nabz is eventually unfrozen for a real product-picker migration, `vitrinCategories.js` should be rewritten to call a Vitrin public facade (`src/modules/vitrin/public/*`) backed by the real `/api/v1/products` API, and `catalogData.js`'s static shim can then be deleted. Do not extend `catalogData.js` with new mock rows for new taxonomy going forward — new taxonomy lives only in the real Shirazeh tables; `catalogData.js` is intentionally frozen as a compatibility fossil, not a second source of truth. |

### DDL-24(b) — SKU strategy: backend-generated, immutable 8-digit `GG-CC-TT-VV`, atomic per-Product-Type variant counter

| | |
|--|--|
| **Decision** | SKU = 8 ASCII digits, `GG` (Group taxonomy code) + `CC` (Category taxonomy code) + `TT` (Product Type taxonomy code) + `VV` (variant sequence, **not** a size code). `GG`/`CC`/`TT` are each 2-digit codes allocated atomically per-parent-scope at taxonomy-creation time via `product_taxonomy_code_counters (scope_type, parent_id, next_code)` using the same `INSERT ... ON CONFLICT DO UPDATE ... RETURNING` pattern as `correspondence_number_counters` (DDL-23a). `VV` is allocated atomically per-Product-Type via `product_sku_counters (product_type_id, next_seq)` with the same pattern, independent of any attribute value — a new Product under the same Type always gets the next `VV`, never a value derived from parsing/guessing attributes. SKU is written once on `INSERT` and the column is never included in any `UPDATE ... SET` list in `productRepository.js` — immutable by construction, not just by convention. |
| **Reason** | Matches the contract's explicit preferred format and explicit instruction to reuse the proven atomic-counter pattern rather than a client-side "scan max" (the exact bug class in today's `productCode.js` `nextSerial()`). Each of `GG`/`CC`/`TT`/`VV` is capped at 99 per scope (2 digits); `allocateTaxonomyCode`/`allocateSku` throw a clear `TAXONOMY_CODE_EXHAUSTED`/`SKU_VARIANT_EXHAUSTED` domain error rather than silently overflowing to 3 digits, so a real scalability hit surfaces as an explicit error to fix (extend to 3-digit segments), never silent data corruption. |
| **Future migration impact** | If any Group/Category/Type genuinely needs >99 children, or any Product Type needs >99 variants, this DDL must be superseded with a wider segment width — do not silently reformat existing SKUs; existing rows keep their SKU, only newly-exhausted scopes get a migration-safe widening. |

### DDL-24(c) — Attribute Engine: controlled `attribute_definitions` + `product_type_attributes` binding table, not raw EAV

| | |
|--|--|
| **Decision** | Attributes are centrally defined once in `attribute_definitions` (code, name, `data_type` ∈ `STRING/DECIMAL/INTEGER/BOOLEAN/ENUM/DATE/REFERENCE`, `unit_uom_id`, `allowed_values` JSONB for ENUM, `min_value`/`max_value`/`precision`, `searchable`/`filterable`/`reportable`/`sortable`, active/inactive, audit) — these are the reusable, Type-independent facts about an attribute. Each Product Type binds a subset of these via `product_type_attributes` (product_type_id, attribute_definition_id, `is_required`, `sort_order`, `is_identity_relevant`, `is_display_relevant`, `attribute_role` ∈ `MASTER_ONLY/TRANSACTION_OVERRIDE_ALLOWED/TRANSACTION_ONLY`, per-Type `override_min`/`override_max`/`override_default_value`, active) — **identity-relevance and master-vs-transactional role are per-binding, not per-definition**, since the same reusable attribute (e.g. "thickness") can be identity-relevant for one Product Type and merely display-relevant for another. Actual per-Product values live in Vitrin's `product_attribute_values` (product_id, attribute_definition_id, value stored as typed columns: `value_text`/`value_number`/`value_boolean`/`value_date`, plus `value_normalized` for identity/search). Products never redefine their own schema; they only store values validated against their inherited Type's bound attribute set. |
| **Reason** | Contract explicitly warns against "EAV chaos" while requiring queryability/validation/indexing/reporting — a definition+binding table (Attribute Definition ↔ Product Type ↔ typed value row) is the standard controlled-EAV compromise, keeps validation in one Zod-backed service layer (`attributeDefinitionService.js`/`productService.js`), and keeps `value_normalized` queryable/indexable for search and duplicate-identity matching without needing per-attribute dedicated columns on `products` (which would not scale across arbitrary industrial product families, violating the "not steel-only" requirement). |
| **Future migration impact** | Adding a new attribute or a new Product Type binding is purely additive (new row), never a schema (`ALTER TABLE products ADD COLUMN`) change. Changing a bound attribute's `required`/`min`/`max` after Products already exist does not retroactively invalidate existing `product_attribute_values` rows — validation only runs at write time (create/update), matching the contract's "do not silently invalidate historical products" instruction. |

### DDL-24(d) — Duplicate Detection: canonical identity key = Product Type + normalized identity-relevant attribute values, enforced as a real DB unique index

| | |
|--|--|
| **Decision** | `products.canonical_identity_key` is a generated, normalized string (`${productTypeId}::${sortedIdentityAttrs.join('|')}`) computed by `backend/src/domain/productMaster/normalize.js` (`buildCanonicalIdentityKey`) from the Product Type id plus every `identity_relevant = true` bound attribute's normalized value (Persian→ASCII digit folding, numeric-format folding `2`/`2.0`/`2.00`/`۲` → equal, trimmed/collapsed whitespace for text). This column has a **real Postgres `UNIQUE` constraint** (`products_canonical_identity_unique`), so exact duplicates are blocked at the DB layer even if the service-layer check were ever bypassed — not just an application-level `SELECT` check. A secondary token-overlap similarity heuristic (`tokenOverlapSimilarity`) runs at the service layer only, to **warn** (never block) on probable-but-not-exact duplicates (e.g. Brand name variants), with an explicit `confirmDuplicate: true` flag required on the create/update request body to proceed, which is itself audited (`duplicateOverride` in the audit detail). The identical normalize+exact-block+probable-warn flow is applied to `brands.normalized_name` (also DB-unique). |
| **Reason** | Contract requires DB-level uniqueness "not only frontend" and explicit Persian/Latin-numeral normalization; a generated+unique column is the only approach that is race-condition-safe under concurrent creates (two simultaneous `POST /products` with the same normalized identity cannot both succeed — the loser gets a real `23505 unique_violation` mapped to `409 PRODUCT_DUPLICATE`). Token-overlap is a cheap, dependency-free heuristic appropriate to this repo's scale — no external NLP/embedding service. |
| **Future migration impact** | If a Product Type's bound identity-relevant attribute set changes, this does **not** retroactively recompute `canonical_identity_key` for existing Products (would risk silent re-collision or historical drift) — only newly-created/updated Products under the new binding compute against it. A future DDL should specify a deliberate backfill+conflict-resolution procedure if retroactive recomputation is ever required. |

### DDL-24(e) — UOM Engine: registry-governed Base/Alternative/Sales/Purchase UOM with numerator/denominator conversions, no hardcoded unit enum in business logic

| | |
|--|--|
| **Decision** | `uom_registry` (code, name, category, active) plus `uom_conversions` (from_uom_id, to_uom_id, numerator, denominator, is_exact, notes) fully replace the hardcoded `PRODUCT_UNITS` array in `src/modules/vitrin/config.js` as the real source of truth (the array stays in the frozen legacy Vitrin file only as long as that file exists — the new Vitrin UI reads from `/api/v1/uom` instead). `products.base_uom_id`/`sales_uom_id`/`purchase_uom_id` reference `uom_registry`; alternative UOMs for a product are expressed via `uom_conversions` rows scoped to that UOM pair (not product-scoped — conversions are a Shirazeh-governed registry fact, e.g. "1 شاخه تیرآهن ≈ X KG" is registered once, reusable by any Product using that UOM pair). Self-referential (`from = to`) conversions and conversions referencing an inactive/unknown UOM are rejected at the service layer. |
| **Reason** | Contract explicitly says "don't hardcode these in business logic if a registry is more appropriate" and requires approximate-vs-exact metadata — `is_exact` boolean plus `notes` covers this without inventing a heavier unit-of-measure ontology than this repo needs. |
| **Future migration impact** | If a conversion genuinely needs to vary per-Product (not just per-UOM-pair) in the future (e.g. a specific beam's kg/m differs from the registry default), that is an additive product-scoped override table, not a rewrite of `uom_conversions`. |

### DDL-24(f) — Weight Calculation Profile stored as Product-level metadata (Vitrin), 4 supported strategies, no Nabz calculation implemented

| | |
|--|--|
| **Decision** | `products.weight_profile_type` ∈ `FIXED/PER_LENGTH/DIMENSIONAL/MANUAL_ACTUAL` plus `weight_profile_coefficients JSONB` (shape depends on type: `{fixedWeightKg}` / `{weightPerMeterKg}` / `{densityKgM3, thicknessMm, widthMm, lengthMm}` / `{}` for `MANUAL_ACTUAL`). `backend/src/domain/productMaster/weightProfile.js` (`validateWeightProfile`) validates the coefficient shape matches the declared type at create/update time. No weight-calculation endpoint is exposed for transaction-time use — this is master/theoretical metadata only; the contract explicitly forbids implementing the Nabz-side "actual weight overrides theoretical" rule now, and that requirement is instead documented in `Docs/architecture/product-master-nabz-future-contract.md`. |
| **Reason** | A typed-by-`weight_profile_type` JSONB coefficients column is simpler and more extensible than four separate nullable coefficient columns, while `validateWeightProfile` keeps the shape controlled (not free-form JSON) per-type. |
| **Future migration impact** | A 5th weight-profile type is additive (new enum value + new validator branch), never a breaking change to existing rows. |

### DDL-24(g) — Bulk Import / Mass Update: synchronous JSON-array API with DRY_RUN/APPLY modes; frontend owns file parsing, backend owns validation/duplicate-check/persistence

| | |
|--|--|
| **Decision** | `POST /api/v1/products/bulk-import` accepts `{ mode: 'DRY_RUN'|'APPLY', rows: [...] }` — CSV/XLSX **parsing happens client-side** (no new backend file-upload/multipart surface, consistent with DDL-23(b)'s "no filesystem uploads" precedent) and the backend receives already-parsed JSON rows. Each row is normalized → validated (Zod, same rules as single-Product create) → duplicate-checked (same canonical-identity logic as DDL-24d) → either previewed (`DRY_RUN`, nothing persisted) or applied (`APPLY`, each accepted row persisted in its own sub-transaction so one bad row does not roll back the whole batch) → recorded as a `product_bulk_import_batches` row (mode, actor, submitted/accepted/rejected counts, per-row results JSONB) for audit. Re-submitting the exact same accepted row in `APPLY` mode again is **not** a hard failure — it is reported as a skipped/duplicate row in the result report (idempotent-safe re-run), while a genuinely malformed row is always rejected with a row-level error, never silently imported. |
| **Reason** | Matches the mandated UPLOAD→PARSE→NORMALIZE→VALIDATE→MATCH→DUPLICATE CHECK→PREVIEW→APPLY→RESULT flow while reusing the exact same validation/duplicate/service logic as single-Product create (no parallel bulk-only business-rule implementation to drift out of sync). |
| **Future migration impact** | If true large-batch (thousands of rows) performance ever becomes a problem, a future DDL can move `APPLY` to an async job queue — the JSON-row contract and per-row result shape should stay stable so the FE result-rendering does not need to change. |

### DDL-24(h) — Master vs Transactional Attribute metadata is informational-only in this phase; no Nabz storage/implementation

| | |
|--|--|
| **Decision** | `product_type_attributes.attribute_role` (`MASTER_ONLY`/`TRANSACTION_OVERRIDE_ALLOWED`/`TRANSACTION_ONLY`, per Product-Type binding — see DDL-24c) is captured and exposed via the Attribute Definition/binding API, and every binding with `attribute_role = TRANSACTION_ONLY` is **rejected at the service layer** (`assertTransactionOnlyNotIdentity` in `attributeDefinitionService.js`, enforced on both create and update of a binding) from ever being marked `is_identity_relevant = true` — a `TRANSACTION_ONLY` attribute can never become part of a Product's canonical identity or force a new SKU. No Nabz table, column, or code is added to actually store per-order attribute overrides in this phase; that is fully deferred to `Docs/architecture/product-master-nabz-future-contract.md`. |
| **Reason** | Contract is explicit: "DO NOT implement Nabz-side storage now — only make Shirazeh/Vitrin metadata capable of declaring which attributes fall into which category." |
| **Future migration impact** | When Nabz implements transaction-level attribute overrides, it should read `transaction_attribute_role` from the Attribute Definition API to decide which fields are order-line-editable vs locked to the Product master value — this DDL's metadata shape should not need to change for that, only new Nabz-side code (out of scope here). |

### DDL-24(i) — Post-QA hardening pass: bulk import N+1 cache, explicit SKU-immutability rejection, 99-code ceiling verification (2026-08-28)

| | |
|--|--|
| **Decision** | Three narrowly-scoped hardening fixes on top of DDL-24 — no SKU format change, no architecture change: (1) `productBulkImportService.resolveRow` now resolves Group/Category/Product Type/Brand/UOM reference data via an in-memory lookup cache built ONCE per `runBulkImport` call (`buildBatchLookupCache`, request-scoped only — never a global/shared cache) instead of re-querying those tables once per row; measured before/after: ~10 DB queries/row → ~5 queries/row, ~3.3-3.6ms/row → ~1.2-1.4ms/row wall-clock (300/1000/2000-row DRY_RUN, local benchmark). (2) `productService.updateProduct` now explicitly REJECTS (`400 SKU_IMMUTABLE`, `details.field: 'sku'`) any PATCH body that includes an `sku` key at all (previously silently stripped by Zod and accepted as `200`) — applies to every role, no bypass, since the check runs unconditionally inside the service before any RBAC branching. `id`/`canonicalIdentityKey`/`createdBy`/`productTypeId` remain accepted-and-ignored (unchanged; audited/pinned by tests, not required to change for this pass). (3) The existing `allocateTaxonomyCode`/`allocateSku` 99-code-per-scope ceiling guard (DDL-24b) was audited and confirmed already correct (explicit range, no wrap, no truncation, deterministic `409` exhaustion error, concurrency-safe via the existing atomic counter pattern) and is now covered by dedicated boundary (98/99/100th) and concurrency-at-1-2-remaining tests. |
| **Reason** | An independent QA pass on the DDL-24 implementation flagged these three items before launch: unbounded per-row DB round-trips in bulk import at the 2,000-row schema cap, a silent-ignore (`200`) response to SKU tampering attempts instead of an explicit rejection, and an unverified/undocumented 99-code ceiling. All three were reproduced with real measurements first, then fixed/verified with no change to the agreed SKU format or Product Master architecture. |
| **Future migration impact** | If a future pass decides `id`/`canonicalIdentityKey`/`createdBy`/`productTypeId` should also get the same explicit-rejection treatment as `sku` (for full consistency of "server-owned field tamper attempts"), extend `IMMUTABLE_FIELDS_ON_UPDATE` in `productService.js` — the mechanism already generalizes, only the field list needs to grow. If any scope genuinely needs >99 children, this still requires a wider-segment DDL per DDL-24(b) — this pass only verified/tested the existing guard, it did not change the 2-digit width. |

### DDL-24(j) — Product Group Latin display name

| | |
|--|--|
| **Decision** | `product_groups.name_latin` is an optional display/export label (English or other Latin-script name). It is **not** identity: not in SKU (`GG-CC-TT-VV`), not in `canonical_identity_key`, and not a duplicate-detection key. Persian `name` remains the canonical group title. Empty string stores as NULL. Category/Type Latin names are out of this DDL. |
| **Current state** | Migration `039`. Shirazeh taxonomy create/edit can set `nameLatin`; Vitrin chips still show Persian `name`. |
| **Reason** | Catalog groups need a stable Latin label for bilingual documents and export without forking the taxonomy tree. |
| **Future migration impact** | Expand-only. Category Latin names are **DDL-24(k)**. Product Type Latin names remain out of scope until a later DDL. |

### DDL-24(k) — Product Category Latin display name

| | |
|--|--|
| **Decision** | `product_categories.name_latin` is an optional display/export label, same posture as Group `name_latin` (**DDL-24j**). It is **not** identity: not in SKU, not in `canonical_identity_key`, and not a duplicate-detection key. Persian `name` remains the canonical category title within a Group. Empty string stores as NULL. Product Type Latin names stay out of this DDL. |
| **Current state** | Migration `040`. Shirazeh taxonomy create/edit can set category `nameLatin`. |
| **Reason** | Bilingual catalog documents need Latin category labels under the new Group tree (مقاطع فولادی / استنلس استیل / …) without forking the taxonomy. |
| **Future migration impact** | Expand-only. Product Type Latin names are **DDL-24(l)**. |

### DDL-24(l) — Product Type Latin display name

| | |
|--|--|
| **Decision** | `product_types.name_latin` is an optional display/export label, same posture as Group/Category `name_latin` (**DDL-24j/k**). It is **not** identity: not in SKU, not in `canonical_identity_key`, and not a duplicate-detection key. Persian `name` remains the canonical Product Type title within a Category. Empty string stores as NULL. |
| **Current state** | Migration `041`. Shirazeh taxonomy create/edit can set type `nameLatin`. |
| **Reason** | Bilingual catalog needs Latin type labels (e.g. میلگرد آجدار / Deformed Rebars) without forking the taxonomy tree. |
| **Future migration impact** | Expand-only. Do not overload `name`. |

### DDL-24(m) — Mnemonic Latin SKU codes (supersedes product SKU format of DDL-24b)

| | |
|--|--|
| **Decision** | Product SKU is no longer the 8-digit `GGCCTTVV` string. Each Group, Category, Product Type, Attribute Definition, and Brand has a short Latin `sku_code` (2–16 `[A-Za-z][A-Za-z0-9]*`). Default allocation from the Latin name: two-letter initials of the first two significant words (`Carbon Steel Products` → `CS`, `Hot Rolled Sheets` → `HR`); a single long word collapses to two letters (`Profiles` → `Pr`); a short distinctive token is kept (`Black`, `IPE`). Collision in that item's scope uses three leading letters, then more leading letters; the operator may always override (`Black`, `Sq`, `ST52`). **Product SKU** = `{groupSku}-{categorySku}-{typeSku}-{identityValue…}` in binding sort order of `is_identity_relevant` attributes (values, not attribute sku_codes). Examples: `CS-HR-Black-10`, `CS-Pr-Sq-2-40-40`. Brand `sku_code` is stored but is **not** concatenated into the Product SKU. Issued Product SKU remains immutable. Changing a node's `sku_code` does not rewrite existing Product SKUs. Numeric GG/CC/TT `code` columns stay as unused-for-SKU internal counters (expand-only). |
| **Current state** | Migration `042_product_mnemonic_sku.sql`. Domain `skuCode.js` / rewritten `skuGenerator.js`. Taxonomy/Brand/Attribute APIs accept `skuCode` + auto from `nameLatin`. |
| **Reason** | Operators need human-readable catalog codes aligned with Latin names and reference attributes, not opaque 8-digit sequences. |
| **Future migration impact** | Do not parse Product SKU to reconstruct attributes in business logic — structured `product_attribute_values` remain canonical. If Nabz later snapshots SKU onto order lines, snapshot the mnemonic string. Unused `sku_code` values may be reused after a successful hard delete (DDL-24n); do not reuse a code while any Product SKU still contains it. |

### DDL-24(n) — Conditional hard delete of unused Product Master nodes

| | |
|--|--|
| **Decision** | Group / Category / Product Type / Attribute Definition / Product / **UOM Registry** / **Brand Registry** may be **hard-deleted** only when they have no *direct* dependents. Group blocked by Categories; Category blocked by Types; Type blocked by Products (including INACTIVE); Attribute Definition blocked by Type bindings (and any `product_attribute_values`); Product blocked by Orders whose `payload.items[].productId` (or snapshot `sku`) matches — archived orders included; **UOM blocked by Products (`base_uom_id` / `sales_uom_id` / `purchase_uom_id`) and Attribute Definitions (`uom_id`)**; **Brand blocked by Products (`brand_id`) and Product Types (`allowed_brand_ids`)**. Unused UOM may drop its `uom_conversions` rows with it (same pattern as empty Type dropping schema bindings). The 409 response lists dependents (count + sample names/codes). Deactivate remains available for in-use nodes. Mnemonic `sku_code` / UOM `code` is freed on delete so a replacement node can reuse `CS` / `HR` / `Black` / `KG` without a numeric-counter hole. Do not cascade-delete Products when a Brand is in use. |
| **Current state** | DELETE `/api/v1/product-taxonomy/groups\|categories\|types/:id`, `/api/v1/attribute-definitions/:id`, `/api/v1/attribute-definitions/bindings/:id`, `/api/v1/products/:id`, `/api/v1/uom/:id`, `/api/v1/brands/:id`. Operator unbind hard-deletes the Type↔Attribute binding row (blocked if that type’s products store values). Leftover inactive binding rows are purged on definition delete. No new table. |
| **Reason** | Catalog authors need to remove mistaken empty nodes; mnemonic SKUs make unused-code reuse safe. Sequential GG/CC/TT counters are not the Product SKU. |
| **Future migration impact** | When Nabz gains a real `product_id` FK on order lines, keep this same order-reference check (and prefer the FK). Do not cascade-delete a Group that still has Categories. |

### DDL-24(o) — One numeric attribute type (DECIMAL); INTEGER is an alias

| | |
|--|--|
| **Decision** | Product Master has a single numeric `data_type`: **`DECIMAL`**, shown in UI as **عدد**. It accepts whole numbers and fractions (`6` and `6.5`). `INTEGER` is no longer a stored type: create/API `INTEGER` is coerced to `DECIMAL`; existing `INTEGER` rows are migrated. Fractional values are no longer rejected. BOOLEAN / ENUM / STRING / DATE / REFERENCE are unchanged. |
| **Current state** | Migration `043`. `prepareAttributeDefinitionInput` + `attributeDefinitionService.createDefinition` coerce `INTEGER` → `DECIMAL`. Shirazeh dropdown has one «عدد» option (`DECIMAL`). |
| **Reason** | Catalog authors do not distinguish صحیح vs اعشاری; thickness/size/diameter may be integer today and fractional later. |
| **Future migration impact** | Do not reintroduce a separate INTEGER type. Precision/min/max remain optional on the DECIMAL definition. |

### DDL-24(p) — One binding flag (`is_required`); filled values always display; required values are identity/SKU

| | |
|--|--|
| **Decision** | Shirazeh schema binding exposes a **single operator flag: الزامی (`is_required`)**. `is_identity_relevant` is derived: **true iff `is_required`** (except `TRANSACTION_ONLY`, which is never required and never identity — DDL-24h). `is_display_relevant` is always true and is no longer operator-facing. **Generated Product name** includes every *filled* bound Master attribute (required or optional), in binding sort order; empty optional attributes are omitted. **Canonical identity + Product SKU** use only required (identity) attribute values. Existing Product SKUs and `canonical_identity_key` values are **not** recomputed by the binding backfill. |
| **Current state** | Migration `044` backfills bindings. `applyAttributeBindingPolicy` in `attributeBindingPolicy.js` is enforced on bind create/update. Shirazeh UI shows only «الزامی». |
| **Reason** | Catalog authors treated the three checkboxes as one decision; optional attributes (e.g. dimensions, grade) must still appear in the display name when filled, without becoming a distinct SKU. |
| **Future migration impact** | Do not re-expose independent identity/display checkboxes as a *derived* pair. **Superseded for the required=identity coupling by [DDL-46](#ddl-46--required-value-scope-and-type-level-allowed-values-are-independent):** required no longer writes `is_identity_relevant`. Existing identity flags and SKUs stay as stored. |

---

## DDL-25 — Identity & Duplicate Governance

| | |
|--|--|
| **Decision** | Centralized identity normalization (`backend/src/domain/identity/`), match classification (`EXACT`/`PROBABLE`/`POSSIBLE`/`NONE`/`CONFLICT`), reusable duplicate-check service/API (`/api/v1/identity/matches/*`), create policies (Company block on exact nationalId, Lead warn, Contact propose link), and `identity_decisions` audit (decisions only — not keystrokes). Active `companies.national_id` enforced by partial UNIQUE index (`deleted_at IS NULL`). |
| **Current state** | Pre-DDL-25: service-layer nationalId check only; scattered name ILIKE in Lead repo; no Contact-level dedup. |
| **Reason** | Independent audit found duplicate Company risk and scattered duplicate logic; Kanoon/Ofogh need one backend gate before persistence. |
| **Future migration impact** | Extend signals (domain, registry number) via identity domain only — no UI-only duplicate checks. Concurrency: `FOR UPDATE` on nationalId during create/convert. |

---

## DDL-26 — Canonical Contact Master + Safe Lead Conversion

| | |
|--|--|
| **Decision** | **Contact** is Kanoon-owned canonical person master (`contacts` table). **CompanyContactRelationship** links Contact↔Company (one primary per company; end relationship ≠ delete Contact). `contact_persons` backfilled via script — no unsafe name-only merges. Lead conversion: hardened TX with `SELECT FOR UPDATE`, identity resolution, Contact link/create, **no** `payload.interactions` merge, **no** Activity migration. Retire `company.payload.interactions` as SoR (Pooyesh Activity only in API mode). Retire Kanoon `recordType=LEAD` in API mode (Raw Lead stays in Ofogh). Customer 360 orders: Nabz only — no `relatedOrders` seed in API mode. |
| **Current state** | Embedded `contact_persons`; conversion copied lead interactions; Kanoon LEAD facet; seed orders on profile. |
| **Reason** | Same person may serve multiple companies; shadow interaction copy breaks Pooyesh SSOT; LEAD facet duplicates Ofogh Raw Lead. |
| **Future migration impact** | Compatibility phases A–E: read legacy `persons` + `canonicalContacts` until UI fully on `/api/v1/contacts`. Lifecycle backfill: `backend/scripts/recompute-customer-lifecycle.js`. See `Docs/architecture/CUSTOMER_360_PROJECTION.md`. |

---

## DDL-27 — Canonical Jarian order code is server-authoritative `JR-{Y}{MM}{DD}{NN}`

| | |
|--|--|
| **Decision** | New Order `code` is allocated **only** by Backend `orderRepository.nextOrderCode` inside the create transaction. Format: `JR-{Y}{MM}{DD}{NN}` where `Y` = last digit of Jalali year (1405 → 5), `MM`/`DD` = Jalali month/day (2 digits), `NN` = daily sequence starting at `01` and resetting at the next Jalali calendar day (`Asia/Tehran`). Counter is per full Jalali date via `order_code_daily_counters` (`INSERT … ON CONFLICT … RETURNING`, same pattern as DDL-23a). Existing `orders.code` values are **immutable** — no backfill, no rename. Optional client-supplied `code` remains for fixtures/tests only; Nabz UI create does not send `code` (`orderToApi` omits it). |
| **Current state** | Replaced global `COUNT(*) → JR-000001` allocator. Frontend `buildNewOrder` mock/optimistic path uses the same format string for offline mock only; API persist overwrites with server code. |
| **Reason** | Human-facing order identity is a daily Jalali serial, not a global 6-digit counter and not `JR-YY-MM-DD-SSS`. |
| **Future migration impact** | Do not rewrite historical codes. Decade wrap (`1405` vs `1415`) can theoretically collide on the 7-digit form; uniqueness stays on `orders.code`. If NN exceeds 99 in one Jalali day, allocation fails rather than widening the format. |

---

## DDL-28 — Organization Identity is a Shirazeh-owned singleton (not Kanoon Company)

| | |
|--|--|
| **Decision** | The operating company that owns Jarian is a **singleton** aggregate `OrganizationIdentity`, persisted in PostgreSQL table `organization_identity` (one row, PK `id = 'org'` with `CHECK (id = 'org')`). Owner module: **شیرازه**. Required fields: `trade_name`, `legal_name`, `national_id` (all TEXT). Optional: legal person type, registration/economic numbers, contact, official address, bank. Identifiers are TEXT so leading zeros are preserved. **Not** a Kanoon Company (those are customers/suppliers). **Not** multi-tenant / multi-company. **Not** the security org-tree. Logo binary is **not** stored here — existing static assets remain. Document consumers (Proforma / Invoice / Letters) stay on hardcoded `COMPANY_BRAND` until a later DDL wires them to this SSOT. |
| **Current state** | GET/PUT `/api/v1/organization-identity`; Shirazeh Definitions UI at `/shirazeh/definitions` (tab هویت سازمان). Empty GET returns empty fields until first PUT upsert. |
| **Reason** | Jarian is an internal system for one company. Company rows in Kanoon must not be reused as the system owner. |
| **Future migration impact** | Additive table only. Do not fold this into `companies`. Do not add tenant_id. Wiring documents to this row is a later task — do not change `COMPANY_BRAND` / `PROFORMA_BANK_ACCOUNTS` under this DDL. |

---

## DDL-29 — Live document chrome reads Organization Identity; issued docs snapshot at version creation

| | |
|--|--|
| **Decision** | Organization Identity is the canonical SSOT for **current** operating-company identity on live views (unsigned Proforma preview, current shipping print, current SooratBar, unissued Saranjam tax invoice, unlocked Gahshomar letter signatory). Issued Proforma versions store `viewModel.organization` at `issueProforma`. New Saranjam issues store `saranjam.organizationSnapshot`. Historical payloads without a snapshot keep `COMPANY_BRAND` / `LETTER_ORG_LINE` as a **frozen legacy fallback** — they must not overlay live Identity. `PROFORMA_BANK_ACCOUNTS` stays a separate multi-account list (case B). Logo/letterhead assets stay static files. |
| **Current state** | GET `/api/v1/organization-identity` is any authenticated session; PUT remains `users:admin`. FE access path: `OrganizationIdentityRepository` + `src/domain/organizationIdentity` facade/cache. |
| **Reason** | Hardcoded `COMPANY_BRAND` on print-time chrome would rewrite issued documents whenever Identity changed. |
| **Future migration impact** | Correspondence has no snapshot column — issued letters still use `LETTER_ORG_LINE` until a follow-up stores `organizationSnapshot` at finalize. Shipping vouchers / SooratBar reprints have no stored org snapshot (current print is live). Do not rewrite existing Proforma versions. Do not fold bank accounts into Identity. |

---

## DDL-30 — Issued shipping / SooratBar / official letters freeze Organization Identity at issue/lock

| | |
|--|--|
| **Decision** | At issue/lock, store a **document-local** `organizationSnapshot` (smallest field set that document renders). **Shipping:** `order.payload.shippingVoucher.organizationSnapshot` at `issueShippingVoucher`. **SooratBar:** `rahsepar.lineStates[].organizationSnapshot` (+ loading session) at first DISPATCHED. **Official letter:** `correspondence.organization_snapshot` JSONB at finalize (server reads Organization Identity). Unissued/draft/current preview stays live Identity. Existing rows without snapshot keep `COMPANY_BRAND` / `LETTER_ORG_LINE` — never overlay live Identity. Do not rewrite historical documents. Bank accounts stay out of these snapshots. |
| **Current state** | Proforma/Saranjam already snapshot (DDL-29). This DDL closes the three remaining historical gaps. |
| **Reason** | Reprint after an Identity edit must not mutate issued chrome. |
| **Future migration impact** | Additive JSON on order payload + additive JSONB column on `correspondence`. No backfill. Tagline may freeze on SooratBar snapshot only — not on Organization Identity schema. |

---

## DDL-31 — Organization Identity canonical logo is a sibling Postgres blob (not on the identity row)

| | |
|--|--|
| **Decision** | Canonical operating-company **logo** is owned by Organization Identity (شیرازه). Bytes are **not** stored on `organization_identity` (DDL-28). They live in sibling table `organization_identity_logo` using the same JSON/`data_base64` pattern as correspondence attachments (**DDL-23b**): no multer, no host filesystem, no object store. The identity row holds a single reference `logo_file_id`. Replace is insert-new → point `logo_file_id` → delete-old inside one transaction so a failed save keeps the previous logo. Allowed types: PNG / JPEG / WEBP (magic-byte sniff); max **2 MB**. SVG is out of scope (no sanitizer). Document consumers (Proforma, Shipping, SooratBar, Saranjam, Gahshomar letterhead, Login, Sidebar) stay on static assets until a later branding DDL. |
| **Current state** | `GET/PUT /api/v1/organization-identity/logo` (`users:admin` on PUT). GET identity returns `logoFileId` + metadata, never logo bytes. Shirazeh Definitions form uploads on Save only. |
| **Reason** | Identity form needs a replaceable canonical logo; putting base64 on the identity row would mix a large blob into every GET of trade/legal fields. Filesystem uploads would add a backup surface `BACKUP_RESTORE.md` does not cover. |
| **Future migration impact** | Additive table + nullable `logo_file_id`. No backfill. Do not delete `nikan2.png` / `nikan-proforma-header.jpg` / `sarbarg.jpg`. Wiring documents to this logo is a later task. |

---

## DDL-32 — Organization Identity collections: phones, addresses, bank accounts (first item is primary)

| | |
|--|--|
| **Decision** | Extend the Organization Identity singleton (**DDL-28**) with JSONB collections on the same row: `phones` (string[]), `addresses` (`{ province, city, officialAddress, postalCode }[]`), `bank_accounts` (`{ bankCode, bankName, accountNumber, iban }[]`). **First item is primary/default** — no `isPrimary` flag. Legacy scalar columns stay (expand-only; `legal_person_type` unused in UI) and are dual-written from `[0]` so live document consumers and snapshot writers that read `phone` / `officialAddress` / `province` / `city` / `postalCode` keep working. Bank name is chosen from a static Iranian bank master (`bankCode`); account numbers are TEXT (leading zeros, `.`, `-` preserved). Iranian IBAN is TEXT (`IR` + 24 digits, ISO 7064 mod-97). Province/city are dependent dropdowns from a Jarian geo master (Kanoon `IRAN_PROVINCES` is incomplete and Kanoon-internal — not reused). `PROFORMA_BANK_ACCOUNTS` stays document-settings data (DDL-29 case B) — not replaced. Historical snapshots are not rewritten. |
| **Current state** | GET/PUT `/api/v1/organization-identity` returns collections plus flattened primary scalars. Migration `027` backfills `[0]` from existing scalars. |
| **Reason** | Operating company has multiple phones, official addresses, and bank accounts; order in the array is the only priority. |
| **Future migration impact** | Additive JSONB + backfill from legacy columns. Do not drop scalar columns. Wiring Proforma bank rows to Identity `bankAccounts` is a later Document Settings task. |

---

## DDL-33 — Organization Identity structured collections (Organization Master v2)

| | |
|--|--|
| **Decision** | Same singleton JSONB collections (**DDL-32**) become structured items with stable `id` + `sortOrder`. **phones:** `{ id, sortOrder, label, type, number }` — `type` is only `landline` / `mobile`; first item is primary (`phone` = `phones[0].number`). **addresses:** `{ id, sortOrder, label, provinceCode, provinceName, cityCode, cityName, address, postalCode }` — province/city from the Jarian geo master by **code**; first item is primary. **bankAccounts:** `{ id, sortOrder, bankCode, bankName, accountHolderName, accountNumber, iban }` — first item is default; `accountHolderName` is required; bank from the static Iranian bank master. No `isPrimary`. No legal-person-type UI (`legal_person_type` column unused). Dual-write of `[0]` onto legacy scalar columns continues. Historical snapshots are not rewritten. `PROFORMA_BANK_ACCOUNTS` stays document-settings display data. |
| **Current state** | Migration `028` idempotently wraps string phones and name-only addresses; hydrates codes on GET/PUT. Live document consumers still read flattened primary scalars via the Identity facade. |
| **Reason** | Operating company needs labeled multi-value contact/address/bank data with stable identity; array order remains the only priority. |
| **Future migration impact** | Expand-only JSON reshape. Do not drop scalar columns. Document branding / letterhead / wiring logo into documents remains a later DDL. |

---

## DDL-34 — Organization Identity explicit primary + phone simplification

| | |
|--|--|
| **Decision** | Same JSONB collections (**DDL-33**) gain explicit `isPrimary`. Exactly one primary per non-empty collection; first item is default when none is flagged; selecting another clears the previous; deleting the primary promotes the first remaining item. Canonical selectors are `primaryPhone` / `primaryAddress` / `primaryBankAccount` (explicit flag, else `[0]`, else legacy scalar). Legacy scalar columns dual-write from **explicit primary**, not blindly `[0]`. Phone `type` (`landline`/`mobile`) is unused in UI/domain; persisted `type` may remain unread. Organization phones validate as Iranian numbers (leading zero preserved). Iranian IBAN keeps ISO 7064 MOD-97 and must match the selected bank's CBI `bankCode`. Account numbers stay TEXT with conservative digit/separator rules; no invented per-bank regex. Bank Master may carry local `logoAsset`. Historical snapshots are not rewritten. `PROFORMA_BANK_ACCOUNTS` stays document-settings data (duplicated until Document Settings). |
| **Current state** | Migration `029` idempotently sets `isPrimary: true` on the first item when a collection has no primary. Live document consumers resolve through the Identity facade selectors. |
| **Reason** | Operators must choose which phone, address, or bank account is current without reordering rows; first-item-only primary was insufficient. |
| **Future migration impact** | Expand-only JSON flag. Do not drop scalar columns or `type`. Wiring Proforma bank rows to Identity `bankAccounts` remains a later Document Settings task. |

---

## DDL-35 — Platform Role is administrable (soft-deactivate, immutable code)

| | |
|--|--|
| **Decision** | Table `roles` is the Role aggregate for Shirazeh. Additive columns: `description`, `is_active`, `created_at`, `updated_at`. `code` is PK and **immutable** after insert. No hard DELETE API — deactivate sets `is_active=false`. Deactivate is allowed even when active users still have the role; the API returns `activeUserCount` so the UI can warn (`این نقش به N کاربر فعال اختصاص دارد`) without blocking. `user_roles` and `role_permissions` are unchanged. `loadUserAuth` / `requirePermission` do **not** filter on `roles.is_active` — assigned users keep grants. Seed roles `admin`, `sales_manager`, `sales`, `purchase`, `accounting` are preserved. |
| **Current state** | CRUD at `/api/v1/rbac/roles` (`users:admin`). Grant editor remains `GET/PUT /api/v1/rbac/roles/:code/permissions`. Migration `030`. |
| **Reason** | Roles were seed-only; operators need to add/rename/deactivate roles without inventing a new permission model. |
| **Future migration impact** | Expand-only on `roles`. Do not add Resource/Action/Scope columns. Do not cascade-remove `user_roles` on deactivate. |

---

## DDL-36 — Permission catalog is structured (resource + action + sensitive flag)

| | |
|--|--|
| **Decision** | Table `permissions` remains the Permission catalog. **Canonical `code` stays the existing colon form** (`orders:read`) so JWT, login, and every `requirePermission` keep working. Additive columns describe the catalog: `resource`, `action`, `category`, `is_sensitive`, `is_active`. `id` in the API is the code (no second PK). Scope (Owner/Team/Department/All) is **out of this DDL**. `is_sensitive` is a **catalog flag for Shirazeh UI only** — it does not change `requirePermission` or hide fields in operational modules. A compatibility layer maps dotted aliases (`orders.read`, `orders.view` → `orders:read`) when writing `role_permissions`; stored grants remain canonical codes. New catalog-only sensitive rows (`orders:view_cost`, `orders:edit_sale_price`, `orders:view_profit`) may exist without route enforcement. |
| **Current state** | `GET /api/v1/rbac/permissions` returns structured rows. Migration `031`. Seed backfills metadata. Role grant editor still PUT canonical codes. |
| **Reason** | Flat `resource:action` strings cannot express category, sensitivity, or a stable resource/action split for a real ERP catalog. |
| **Future migration impact** | Expand-only on `permissions`. Do not rename or drop existing codes. Do not put Scope on this table. Do not change `loadUserAuth` / JWT claims. A later DDL may introduce dotted canonical codes or wire sensitive flags to enforcement. |

---

## DDL-37 — Organization structure persists and references users.id

| | |
|--|--|
| **Decision** | Shirazeh Organization Structure is a platform aggregate (not Company, not HR, not tenant). Tables: `organization_units` (tree), `organization_positions` (job title per unit — **not** RBAC role), `user_organization_assignments` (placement). Person nodes **must** reference `users.id`. Do not store username / displayName / password / roles as org SoR. One primary assignment per user (`PRIMARY KEY user_id`). `is_manager` is an assignment flag (at most one manager per unit) and is **not** inferred from `admin` / `sales_manager`. Removing an assignment does not delete the user. Scope (Owner/Team/All) is out. Mock tree people are **not** mapped to users. |
| **Current state** | CRUD + tree snapshot at `/api/v1/organization` (`users:admin`). Migration `032` seeds a root unit only. Gahshomar letter referral still uses the old fixture as a display directory (DDL-23 assignee is not a security principal). |
| **Reason** | The canvas stored independent person ids in Zustand; Users lived in Postgres. Placement could not survive refresh and was not real identity. |
| **Future migration impact** | New tables only. No drops. Do not auto-grant `user_roles` from Position. Do not put tenant_id / multi-company on these tables. |

---

## DDL-38 — Role display name is unique after normalization

| | |
|--|--|
| **Decision** | `roles.label_fa` uniqueness is **normalized**, including inactive rows. Normalize: trim, collapse whitespace, Arabic `ي`→`ی` and `ك`→`ک`, Latin lower-case. Generated `role_N` codes stay the technical PK and are unchanged. Duplicate create/rename returns `409 ROLE_NAME_ALREADY_EXISTS` with `existingRoleCode` + `existingRoleIsActive`. Do not auto-reactivate. Do not merge or delete colliding historical rows. |
| **Current state** | Migration `033` adds immutable SQL `jarian_normalize_role_label`, stored generated `label_fa_normalized`, and unique index `roles_label_fa_normalized_uidx`. |
| **Reason** | Code uniqueness does not stop operators from creating `مدیر فروش` twice with different `role_N` codes. |
| **Future migration impact** | Expand-only. If a unique index cannot be applied because of pre-existing normalized collisions, stop and report — do not arbitrarily merge roles. |

---

## DDL-39 — User profile (organizational mobile/email) + INVITED without password

| | |
|--|--|
| **Decision** | Platform **User** remains the system account (`users`). Canonical profile fields: `display_name` (fullName), `mobile` (organizational, unique, stored `09xxxxxxxxx`), `email` (organizational, unique when non-empty, stored lowercase), `account_status` ∈ {INVITED, ACTIVE, INACTIVE}. Organizational placement stays on `user_organization_assignments` — never free-text unit/position on User. Security stays `user_roles` → Role → Permission. Position ≠ Role. **Create User does not take a password**; new accounts are INVITED with `password_hash` NULL and an internal username `user_N`. Existing usernames and password hashes are never rewritten. INVITED / NULL hash / INACTIVE cannot authenticate. Login identifier is superseded by **DDL-41** (mobile + password). |
| **Current state** | Migration `034`. Admin create form: fullName, mobile, email, unit, position, roles. Username is generated, not shown. Login identifier and invitation tokens are **DDL-41**. |
| **Reason** | Operator must not invent another person's password. Mobile is the login identifier; username stays an internal compatibility key. Org placement and RBAC must stay independent. |
| **Future migration impact** | Expand-only. Do not drop username. **HR boundary (not built):** future همراهان / Employee profile may become owner of full name, organizational mobile/email, placement, and employment data; User remains owner of authentication identity, account status, security roles, and security state. Do not create employee tables now. |

---

## DDL-40 — Persona ≠ Position ≠ Role (product identity deferred)

| | |
|--|--|
| **Decision** | Jarian distinguishes three concepts that are **not interchangeable**. **Persona** is the product/cultural identity of the user's working domain. **Position** is the organizational job title (`organization_positions`). **Role** is the RBAC security principal (`roles` → `role_permissions` → Permission). **Only Role → Permission authorizes API actions.** Persona does not grant permissions and must not be inferred from Role. Position does not grant permissions. Canonical Personas: `SALES` شوالیه, `PROCUREMENT` سامورایی, `FINANCE` مُستوفی, `LOGISTICS` قافله‌سالار, `QUALITY` عیارگر, `SYSTEM` سپهسالار. |
| **Current state** | **Superseded for persistence by DDL-42.** The three-way distinction and the ban on Persona→Permission remain in force. Persona is still not on User, not inferred from Position/Role, and not used for dashboards/KPI/AI in this change. |
| **Reason** | Cultural product identity must not leak into the security model. Mixing Persona with Role or Position would create a second authorization path. |
| **Future migration impact** | Do not sneak persona into `users`, `roles`, or `organization_positions`. Assignment of Persona to User requires a later DDL. |

---

## DDL-41 — Authentication lifecycle (invitation + forgot-password + mobile login)

| | |
|--|--|
| **Decision** | Product login identifier is organizational **mobile** (`09xxxxxxxxx`) + password. `users.username` remains an internal compatibility key (generated `user_N`; existing usernames still authenticate). **Invitation:** creating an INVITED user issues a single-use hashed token (`auth_challenges.purpose=INVITATION`, 72h) and sends a Faraz SMS with a public set-password link. Completing set-password hashes the password, sets `ACTIVE`, and consumes the token. Admin may resend. **Forgot password:** mobile → Faraz SMS OTP (`purpose=OTP`, 10 min, attempt-limited) → verify issues a short-lived reset token (`purpose=PASSWORD_RESET`) → set new password. Generic responses must not reveal whether a mobile exists. INVITED / INACTIVE / missing hash still cannot authenticate. Persona is not part of this lifecycle (**DDL-40**). |
| **Current state** | Migration `035`. Public APIs under `/api/v1/auth/*` (no JWT). Admin resend: `POST /api/v1/users/:id/invitation` (`users:admin`). Faraz adapter uses env credentials; missing key → mock send in non-production (tokens/OTP never returned in API bodies). Admin password reset (`POST /users/:id/password`) remains an operator override and is not the product forgot-password path. |
| **Reason** | Operators must not invent another person's password. Invitation and recovery are authentication concerns owned by User, not by Role, Position, or Persona. |
| **Future migration impact** | Expand-only new table. Do not drop `username`. Do not store raw tokens or OTP in audit payloads. Do not add persona columns here. |

---

## DDL-42 — Persona persisted as Definitions data (extends DDL-40)

| | |
|--|--|
| **Decision** | Persona remains a working-domain identity, **not** authorization. It is now persisted as editable Shirazeh Definitions data in PostgreSQL `personas` (`code` unique and immutable after create; `name` and `domain` editable; `is_active` soft status; no hard delete). Seed inserts the six canonical codes only when missing (`ON CONFLICT DO NOTHING` — never overwrites edited name/domain). Persona is not on User, not inferred from Position or Role, and does not grant permissions. |
| **Current state** | Migration `036`. API `/api/v1/personas` gated by existing `users:admin`. Shirazeh Definitions UI lists/edits name, domain, and active status. No `personaId` on `users`. No Role/Position mapping. No new permission codes. |
| **Reason** | System admin must not re-enter initial Personas by hand. Display name and domain must be editable without a migration or source change. Persistence must not create a second authorization path. |
| **Future migration impact** | Expand-only. Do not add a persona FK to `users`, `roles`, or `organization_positions` without a later DDL. Do not grant permissions from Persona. Do not encode `if (persona === 'SALES')` business rules. |

---

## DDL-43 — Generated persona codes and optional Role catalog link

| | |
|--|--|
| **Decision** | Operator-created Personas receive an allocated technical code `persona_N`. The user never supplies `code`. Seed codes (`SALES`, …) stay immutable. A Persona may be linked to Roles as **catalog identity only**. |
| **Current state** | Migration `037` allocated `persona_N` and briefly stored a single `personas.role_code`. Cardinality is superseded by **DDL-44**. |
| **Reason** | Code is a technical key; display name must remain editable. |
| **Future migration impact** | Do not let clients set `code`. Do not grant permissions from the Role link. |

---

## DDL-44 — Role → Persona catalog (1 Role : 1 Persona, 1 Persona : N Roles)

| | |
|--|--|
| **Decision** | Each Role may link to **at most one** Persona. Each Persona may link to **many** Roles. Stored in `persona_role_links` (`role_code` PK → `personas.code`). Roles without a Persona are allowed during gradual migration. Attach/detach deletes only the association — never `roles`, `role_permissions`, or `user_roles`. Persona still does not grant permissions. Seed never writes or overwrites these links. |
| **Current state** | Migration `038`. API: create binds one Role; `POST /api/v1/personas/:code/roles` attaches; `DELETE /api/v1/personas/:code/roles/:roleCode` detaches; `GET /api/v1/personas/meta/roles` lists Active roles with occupancy. Shirazeh Definitions create form is Name + Role (no Code). |
| **Reason** | Several job titles (کارشناس فروش / مدیر فروش) can share one working identity (شوالیه) without merging RBAC Roles. |
| **Future migration impact** | Expand-only join table. Do not put `personaId` on `users`. Do not infer permissions from Persona. Do not auto-map Position titles to Personas. |

---

## DDL-45 — Product-level allowed ENUM subset (order-time options)

| | |
|--|--|
| **Decision** | A Product Type may bind an ENUM Attribute Definition (the global vocabulary, e.g. every steel grade). When that binding is **not required** (not identity / not SKU), Vitrin Product create/update stores a **subset** of those ENUM values on the Product (`product_allowed_attribute_values`). That subset is **not** a master identity value, **not** concatenated into SKU or `canonical_identity_key`, and **not** a second Attribute Definition per type. Required ENUM bindings stay a single `product_attribute_values` row (identity). Backend validates every selected value against `attribute_definitions.allowed_values`. Empty subset is allowed (legacy Products with no rows). Future Nabz order-entry must show only the Product's subset when it is non-empty; otherwise fall back to the definition catalog. Chosen order-line value stays Nabz `customAttributeValues` (DDL-24h) — never written back to Vitrin. |
| **Current state** | Migration `045`. API field `allowedAttributeValues` (`{ [attributeDefinitionId]: string[] }`) on Product create/update/get/search. Vitrin Product form shows a multi-select for non-required bound ENUMs (including `TRANSACTION_ONLY` ENUM). Nabz ProductPicker remains on the frozen `catalogData.js` shim (DDL-24a) — no Nabz schema/UI change in this decision. |
| **Reason** | Grade (and similar catalogs) differ per SKU: pipe grades ≠ rebar grades ≠ sheet grades, and two SKUs of the same type may still offer different mill certificates. Type-level override is not enough; the operator picks the related options on the Product. Forking `grade_pipe` / `grade_rebar` definitions would duplicate vocabulary. Making grade required would explode SKUs (A3 vs A4 as different products). |
| **Future migration impact** | Expand-only child table. **Superseded for product-form UX and order-time option lists by [DDL-46](#ddl-46--required-value-scope-and-type-level-allowed-values-are-independent).** The `product_allowed_attribute_values` table remains (expand-only, no SKU rewrite). New ENUM option lists are per Product Type binding (`override_allowed_values`). |

---

## DDL-46 — Required, Value Scope, and type-level Allowed Values are independent

| | |
|--|--|
| **Decision** | Three binding facts are independent. **(1) `is_required`** — the value is mandatory at the layer of its Value Scope (on Product create when Scope = PRODUCT; on the order line when Scope = TRANSACTION). It does **not** imply SKU/identity. **(2) `override_allowed_values`** — for ENUM bindings only, a subset of the Attribute Definition's global `allowed_values`. Null/empty inherit the full catalog. Vitrin Product form and future Nabz order-entry show this effective list; the server validates against it. **(3) `value_scope`** ∈ `PRODUCT` \| `TRANSACTION`. PRODUCT values persist on `product_attribute_values`. TRANSACTION values are not stored on Product (rejected on master write); they belong on the future Order Line (`customAttributeValues`, still deferred). **SKU / `canonical_identity_key`** use only `is_identity_relevant` attributes that are PRODUCT-scoped. Identity is **not** derived from required. Existing `is_identity_relevant` and issued SKUs are **not** rewritten. TRANSACTION can be required (order-time) but can never be identity (DDL-24h identity ban remains). `attribute_role` is kept in sync (`PRODUCT`→`MASTER_ONLY`, `TRANSACTION`→`TRANSACTION_ONLY`) so older readers still work. Optional-ENUM product-level multi-select (DDL-45 form) is withdrawn; a PRODUCT ENUM is a single stored value from the type's allowed list. |
| **Current state** | Migration `046` adds `value_scope` + `override_allowed_values`. Backfill: `TRANSACTION_ONLY`→`TRANSACTION`, else `PRODUCT`. Identity columns unchanged. Shirazeh bind UI: الزامی, سطح مقدار (کالا/تراکنش), گزینه‌های مجاز (ENUM), حداقل/حداکثر (عدد). |
| **Reason** | Grade must be required on the SKU without exploding identity, and mill-specific catalogs must be type-level subsets of one global ENUM — not forked definitions and not a second multi-select store on the Product. Custom length can be required at order time without becoming a Product field. |
| **Future migration impact** | Expand-only. Do not backfill SKUs. Do not drop `product_allowed_attribute_values` or `attribute_role`. When Nabz is unfrozen, TRANSACTION + required is an order-line validation, and ENUM dropdowns use the type's effective allowed values. Converting an existing STRING grade to ENUM is a separate operator-reviewed change. |

---

## DDL-47 — Product Type offer defaults copy onto Product at create

| | |
|--|--|
| **Decision** | Commercial offer settings are Type defaults, copied onto Product at create, then owned by the Product. **Product Type:** `default_count_unit_id`, `default_sales_unit_id` (FK → `uom_registry`), `default_unit_weight` (optional positive numeric), `custom_length_allowed` (boolean, default false). **Product:** count unit = existing `base_uom_id`; sales unit = existing `sales_uom_id`; plus `unit_weight` and `custom_length_allowed`. No parallel count/sales columns. `purchase_uom_id` and `weight_profile_*` stay as they are and are not part of this compact model. Changing Type defaults does **not** rewrite existing Products. Dynamic SKU create is `createProduct` and therefore copies the same defaults. Order lines consume Product values; they do not define these four settings. No purchase/report UOM, no conversion engine, no multi-sales-UOM in this phase. |
| **Current state** | Migration `047`. API aliases `countUnitId`/`salesUnitId` map to `baseUomId`/`salesUomId`. Shirazeh Type panel and Vitrin Product form show «واحد و عرضه». Nabz order UI stays frozen (DDL-24a); consume via `src/modules/vitrin/public` when unfrozen. |
| **Reason** | Pipe Type (لوله درزدار) sells in kg and counts in branches with optional custom length — those facts belong on the Type, then the SKU, not on every order line. |
| **Future migration impact** | Expand-only. Do not add `count_unit_id` beside `base_uom_id`. An optional later "apply Type defaults to existing Products" job needs its own DDL. |

---

## DDL-48 — Product Structure Latin lexicon is a Postgres catalog

| | |
|--|--|
| **Decision** | FA→Latin suggestions for Product Structure (Group / Category / Type / Brand names, Attribute codes, UOM codes) are a **Shirazeh-owned lookup catalog** in PostgreSQL (`latin_lexicon`), not a frontend-only dictionary and not an external translation API. Matching stays longest-phrase / never letter-by-letter romanization. Operators grow the catalog by saving a Persian label together with its Latin/code — the next suggestion uses that row. Bundled `latinLexicon.js` is seed + mock/offline fallback only. |
| **Current state** | Migration `048`. API `/api/v1/latin-lexicon` (`products:read` list, `products:manage-taxonomy` upsert). Unique `(fa_normalized, kind)` with `kind` ∈ `phrase` \| `attribute_code` \| `uom_code`. Seed on empty table / `npm run seed` does not overwrite operator latin. Vitrin `/vitrin/structure` hydrates the FE cache and upserts on taxonomy/brand/attribute/UOM save. |
| **Reason** | The app is web-hosted; adding «آلومینیوم → Aluminum» must not require a code deploy. Google Translate (or any third-party MT) is out of scope — steel vocabulary is operator-owned. |
| **Future migration impact** | Expand-only. A dedicated lexicon admin tab is optional; learning-on-save is the first surface. Do not call external translation APIs from this table. |

---

## DDL-49 — Product SKU is internal; identity is backend-derived

| | |
|--|--|
| **Decision** | Product SKU (`products.sku`, taxonomy/brand/attribute `sku_code`) is an **internal unique key**. Operators never see, type, preview, or edit SKU. The UI works with Persian/Latin names, Product Type, and human attributes. Backend generates SKU deterministically on create; issued SKUs stay immutable. Exact canonical-identity match **reuses the existing Product** (no second SKU). `is_identity_relevant` is **not** an operator flag: PRODUCT-scoped **numeric** attributes (`DECIMAL` / `INTEGER`) participate in unique identity; STRING / ENUM / BOOLEAN / DATE / REFERENCE do not; TRANSACTION never does. Required remains validation-only. Value Scope remains storage (Product vs Transaction). Client `isIdentityRelevant` / UI `skuCode` are ignored. |
| **Current state** | No schema migration. Existing SKU columns and stored identity flags stay. New/updated bindings write identity from the type rule above. Vitrin list/form/structure/brand UI hide SKU and «در کد کالا». Nabz stays frozen. |
| **Reason** | Operators identify goods by name and specs; SKU uniqueness and duplicate-find are system concerns. Grade can be required without entering identity (DDL-46). |
| **Future migration impact** | Do not drop SKU columns. Do not backfill issued SKUs. Stored identity flags are rewritten when a binding is saved (DDL-50). |

---

## DDL-50 — Required PRODUCT identity is numeric or ENUM; free text cannot be required

| | |
|--|--|
| **Decision** | Supersedes the identity type list in DDL-49. PRODUCT-scoped **DECIMAL / INTEGER** stay identity (filled values join SKU). **Required PRODUCT ENUM** is also identity (e.g. grade A2 vs A3, Ck45 vs Mo40). Optional ENUM is display-only. STRING / BOOLEAN / DATE / REFERENCE must not be required on PRODUCT; bind them optional or convert to ENUM. TRANSACTION may be required at order time and is never identity. SKU remains `{group}-{category}-{type}-{identity values…}` and internal (DDL-49). Exact identity match still reuses the Product. Defining a Product with a required value left empty, then find-or-create a sized SKU at order time, is **not** in this decision — Nabz stays frozen. |
| **Current state** | `applyAttributeBindingPolicy` derives identity and rejects active required STRING. Catalog: mill `grade` is ENUM with type subsets; profile `dimensions` replaced by `width`+`height` DECIMAL; bed width is ENUM `bed_width`. Alloy rebar identity is required PRODUCT `grade` only; `size` is not required and not identity. **Fastener identity restored by [DDL-64](#ddl-64--fasteners-identity-is-type-shape--fastener_grade)** (required PRODUCT `fastener_grade`; size/length TRANSACTION). |
| **Reason** | Operators need Ck45 and A3 to be distinct catalog identities without free-text required fields. |
| **Future migration impact** | Expand-only. Order-time required TRANSACTION → find-or-create Product is a later Nabz DDL. Do not rewrite issued SKUs. **Superseded for identity derivation and SKU segment shape by [DDL-51](#ddl-51--required-attribute-is-the-only-product-identity).** |

---

## DDL-51 — Required Attribute is the only Product identity

| | |
|--|--|
| **Decision** | Three binding kinds, stored as `value_scope` + `is_required` (no new column). **(1) Required Attribute** = PRODUCT + required. This is the only identity: `canonical_identity_key` and Product SKU use these values only. Must be DECIMAL/INTEGER or ENUM (DDL-50 free-text ban stays). **(2) Optional Attribute** = TRANSACTION + required. Not stored on Product; **required on the order line** when Nabz is unfrozen. Never identity. **(3) Offer Variant** = TRANSACTION + not required. Optional even at order (e.g. حالت عرضه, فرمینگ, گرید لوله مانیسمان). Never identity. Optional PRODUCT numeric is **not** identity (supersedes DDL-50 «every PRODUCT number is identity»). **Product SKU** (internal, DDL-49) is 5–6 hyphenated 2-character parts when the Type has 2–3 Required Attributes: `{GG}-{CC}-{TT}-{R1}-{R2}[-{R3}]`. `GG`/`CC`/`TT` are the 2-digit taxonomy `code` values. Each Required Attribute contributes one 2-char token (integers 0–99 → `pad2`; one-decimal values under 10 → tenths; larger numbers → first two digits of the integer; ENUM → first two alphanumeric characters of the stored value). Types with 0–1 Required Attributes have a shorter SKU. Issued SKUs are not rewritten (catalog was empty). Nabz stays frozen: Optional Attribute / Offer Variant are not validated on order lines in this DDL. |
| **Current state** | Migration `048`. `applyAttributeBindingPolicy` identity = PRODUCT ∧ required ∧ (numeric \| ENUM). Length / `alloy_size` / `strip_width` backfilled to TRANSACTION required. Shirazeh bind UI labels the three kinds. **تسمه فولادی mill width** is refined by [DDL-57](#ddl-57--steel-flat-mill-width-is-product-identity). |
| **Reason** | Operators describe identity as Group-Category-Type plus only the Required Attribute values, in compact 2-char parts. Order-time length must be mandatory without exploding SKUs. Forming and supply form stay optional extras. |
| **Future migration impact** | Expand-only. Do not backfill issued SKUs. Nabz order-line `customAttributeValues` must enforce TRANSACTION+required when unfrozen. Do not put Offer Variant into SKU. **Mill-produced steel flat width** is Product identity per [DDL-57](#ddl-57--steel-flat-mill-width-is-product-identity). |

---

## DDL-52 — Product Type display-name rule is independent of SKU

| | |
|--|--|
| **Decision** | Each Product Type may store a `display_name_rule` JSON document: `{ separator, tokens[] }`. Tokens are `group` \| `category` \| `type` \| `attribute` (attribute tokens reference `attribute_definitions.id`). The rule is the only operator-defined source for Product display names when present. Empty optional values are omitted (no leftover separators). Unbound/deleted attributes stay in the rule as invalid until an admin removes them; new bindings are not auto-inserted. Types without a rule keep the legacy Type + ` \| ` attribute formatter. **SKU / `canonical_identity_key` are unchanged.** GET/search **derive** `generatedName` from the live Type rule + binding defaults (DDL-55); the stored column is a cache for search/sort/duplicate only and must not be the catalog list source. Saving the Type rule still rewrites the stored cache. |
| **Current state** | Migration `050`. `productService` GET/search apply live names. PATCH `/api/v1/product-taxonomy/types/:id` with `displayNameRule` (and binding `overrideDefaultValue`) refreshes the stored cache. Vitrin `/vitrin/structure` Accordion «نحوه نمایش نام محصول». Domain helper `displayNameRule.js`. |
| **Reason** | Operators want a stable, per-type commercial name (type + grade + thickness + size) that can include optional and transaction attributes, without coupling that string to internal SKU identity. The catalog list must follow the rule after it is saved. |
| **Future migration impact** | Expand-only JSONB. Do not put SKU segments into this JSON. Do not rewrite issued SKUs. |

---

## DDL-53 — Display-name unit is resolved from the UOM registry

| | |
|--|--|
| **Decision** | Attribute tokens in `display_name_rule` may store `includeUnit` (boolean). Default is `true` when omitted so existing rules keep current names. The unit **text** is never persisted in the rule — at generate/preview time it is read from Attribute Definition `uomId` → UOM registry `nameFa`. `includeLabel` (field title) stays independent. Taxonomy tokens (group/category/type) have no unit. Changing a UOM label or Type rule does not rewrite existing `generated_name` until that Product is created or its attributes are updated (same as DDL-52). |
| **Current state** | JSONB expand-only on `product_types.display_name_rule`. Domain `displayNameRule.js` (BE + FE). Builder switch only when the attribute has `uomId`. |
| **Reason** | Size/length/slot without «میل / اینچ / متر» is commercially ambiguous; the title switch must not be the only way to get a unit into the name. |
| **Future migration impact** | No SQL. Do not store «میل» inside the JSON. Do not convert mm↔inch inside the display name. |

---

## DDL-54 — Display-name literals are catalog glue, not identity

| | |
|--|--|
| **Decision** | `display_name_rule` tokens may include `sourceType: 'literal'` with `literalId` from a **closed domain catalog** (`branch` شاخه, `sheet` برگ, `dims` ابعاد, `times` ×, `star` *). Persian text is never persisted in the JSON. Literals are display glue only: they do not enter Product SKU or `canonical_identity_key` (DDL-51 still owns identity via required attributes). The same literal may appear more than once. Prefix literals (شاخه، برگ، ابعاد) are omitted when the next non-literal token is empty; join literals (×، *) are omitted unless both neighboring non-literal tokens have values. Join glyphs concatenate without the Type separator (`1500×3000`). Changing a catalog label or Type rule does not rewrite existing `generated_name` until that Product is created or updated (DDL-52). |
| **Current state** | JSONB expand-only on `product_types.display_name_rule`. Catalog in `displayNameRule.js` (BE + FE), same home as separators. Builder palette on `/vitrin/structure` Accordion «نحوه نمایش نام محصول». No new table. |
| **Reason** | Commercial names need words and joiners that are not Attribute Definitions and not the measurement UOM of a field (شاخه before length while length stays متر). A third master-data bank would duplicate UOM labels. |
| **Future migration impact** | No SQL. Do not store «شاخه» as free text in the rule. Do not add these tokens to بانک ویژگی‌ها. A Postgres lexicon is only needed if operators must add new glue words without a deploy. |

---

## DDL-55 — Type-binding display default is operator-owned, not identity

| | |
|--|--|
| **Decision** | When an Attribute is bound to a Product Type, the operator may tick **پیش‌فرض** and enter a value. That value is stored on the binding as `override_default_value` (existing column; no new table). If the live value is empty, this default is used in create-form preview, `generated_name`, and the product catalog/list. An entered value always wins. **Attribute Definition `default_value` is not a display/catalog default** — empty slots do not inherit it. **TRANSACTION** defaults and **optional PRODUCT** defaults are display/order-time only: they are **not** written to `product_attribute_values` at create, **not** SKU, and **not** `canonical_identity_key` (DDL-51 unchanged). Required PRODUCT still persists (identity). Clearing the tick stores `NULL` on the binding and removes leftover stored values on that Type that equal the previous optional default. At order entry, Nabz may preselect this default; the operator can pick another allowed or entered value. There is **no** bar-family mill-length catalog (۱۲/۶ m by category). Mill-sheet millimetre length is a separate domain catalog — **DDL-56**. There is **no** law that empty ورق `supply_form` (حالت عرضه) displays «شیت برش خورده». |
| **Current state** | Bind/edit UI on `/vitrin/structure` attribute assignment (`AttributesTab`). Preview via `bindingDefaultValue`. Backend `resolveGeneratedName` applies the same default without persisting optional PRODUCT fallbacks. PATCH of `overrideDefaultValue` refreshes `products.generated_name`; clearing an optional default also deletes leftover stored values that equal the previous default (SKU / identity unchanged). Repository update can clear the column. |
| **Reason** | Standard mill length (and similar offer defaults) differ by Type and must be set where the attribute is assigned, not as a hidden taxonomy law. |
| **Future migration impact** | Nabz order-line `customAttributeValues` should start from this default when unfrozen. Do not promote TRANSACTION defaults onto Product identity. **Mill-sheet millimetre length** is refined by [DDL-56](#ddl-56--mill-sheet-length-is-a-conditional-transaction-default). |

---

## DDL-56 — Mill-sheet length is a conditional TRANSACTION default

| | |
|--|--|
| **Decision** | Mill sheets use a dedicated Attribute Definition **طول ورق** (`sheet_length`, DECIMAL, UOM `MM` / میل), bound **TRANSACTION** (order-required is allowed; never identity). Shared meter `length` stays on bars/profiles/pipe and is unbound or deactivated on mill-sheet Types so two lengths do not compete. When live طول ورق is empty, the default is evaluated from the Product's stored **عرض** + **ضخامت** by a **closed domain catalog** (`sheetMillLength.js`), more-specific rules first: 2000×thickness>40 → 12000؛ 1250×thickness>10 → 6000؛ width 1000 → 2000؛ width 1250 → 2500؛ width 1200 / 1500 / 2000 → 6000. An entered value always wins. If no rule matches, DDL-55 scalar `override_default_value` is the fallback. The computed millimetre default is display/order-time only: **not** written to `product_attribute_values`, **not** SKU, **not** `canonical_identity_key`. Existing mill-sheet identity (thickness × width) is unchanged. |
| **Current state** | Domain catalog + Type bindings. Postgres remains SoR for the Attribute Definition and bindings. GET/search `generatedName` and create-form preview apply the same resolver as DDL-55. Nabz line preselect is the same helper when unfrozen. |
| **Reason** | Mill sheet sizes are millimetres (۲۰۰۰ میل ≠ ۲ کیلومتر). A single Type scalar cannot express width/thickness-dependent mill lengths. A 12/6 m *bar* family catalog (reverted under DDL-55) is a different law and stays forbidden. |
| **Future migration impact** | No new table. Do not persist mill length on Product. Do not invent per-SKU mill-length variants. Nabz `customAttributeValues` should preselect the resolved millimetre default. |

---

## DDL-57 — Steel flat mill width is Product identity

| | |
|--|--|
| **Decision** | On Product Type **تسمه فولادی**, Attribute **عرض تسمه** (`strip_width`, DECIMAL) is a **required PRODUCT** identity attribute together with **ضخامت**. Commercial mill sizes are thickness×width SKUs (e.g. ۳×۲۰، ۵×۴۰، ۱۵×۶۰، ۲۰×۱۰۰). DDL-51's global backfill of `strip_width` → TRANSACTION required is **superseded for this Type only**. Meter **طول** stays TRANSACTION (Type default ۶ m, DDL-55) and is not identity. Kind (فابریک / پرسی / ماشینکاری شده) stays optional PRODUCT / not identity. The mill width catalog is a closed domain matrix (`steelFlatCatalog.js`); it is not a second SoR. |
| **Current state** | Binding rewrite on تسمه فولادی + domain catalog + Product seed. Postgres remains SoR. No issued SKUs to rewrite on this Type at the time of the decision. |
| **Reason** | Iranian mill flat bar is sold and stocked as thickness×width. Treating mill width as an order-time cut (DDL-51 Optional Attribute) would collapse every thickness into one SKU and could not express the operator catalog. Length-in-metres remains the order-time dimension. |
| **Future migration impact** | Expand-only binding. Do not move `strip_width` back to TRANSACTION on تسمه فولادی. Do not multiply SKUs by kind. Other Types that bind `strip_width` (none at this DDL) stay on DDL-51 unless a later Type-specific DDL says otherwise. |

---

## DDL-58 — NPS inch size display on pipe Types

| | |
|--|--|
| **Decision** | On listed pipe Product Types, required PRODUCT size (`size` or seamless `size_pipe`) is stored as a **decimal inch** (0.5 = ½"). Catalog/list `generatedName` formats that stored number with a **closed domain map** (`npsInchDisplay.js`) to «۱/۲ اینچ», «۳/۴ اینچ», «۱ ۱/۴ اینچ», «۱۰ اینچ», … Thickness keeps UOM **میل**. This is **not** millimetre↔inch conversion (DDL-53). SKU / `canonical_identity_key` keep the decimal (`CS-Pi-GL-0.5-2.5`). The shared Attribute Definition `size` UOM stays میل for IPE and other mill-number Types. Closed Type list: لوله تست گاز، لوله API، لوله تست آب، لوله گالوانیزه، لوله جدار چاه، لوله اسپیرال، لوله درزدار، لوله مانیسمان. |
| **Current state** | Domain catalogs + Type display-name rules (size without field title; thickness with «ضخامت» + میل; seamless uses `size_pipe` + «رده»). GET/search derive the live name. FE create preview uses the same helper. |
| **Reason** | Iranian pipe is sold as NPS inch × wall millimetres (seamless also by schedule). Showing «0.5 میل» for ½" is commercially wrong; changing the global `size` UOM would mislabel تیرآهن IPE. |
| **Future migration impact** | No SQL. Do not rewrite issued SKUs. Add other pipe Types to `NPS_INCH_SIZE_TYPE_NAMES` only with an operator catalog. Do not persist «اینچ» inside `display_name_rule`. |

---

## DDL-59 — Product Relationships retired

| | |
|--|--|
| **Decision** | Vitrin **does not** model Product-to-Product relationships (جایگزین / قابل‌جایگزینی / ضریب تبدیل). The `product_relationships` table, `/api/v1/products/relationships` routes, `products:manage-relationships` permission, and the Product profile «روابط کالا» tab are **removed**. Product SKU remains the aggregate. Company–Contact relationships (DDL-26) are unrelated and stay. |
| **Current state** | Migration `053_ddl59_drop_product_relationships.sql`. Catalog seed no longer grants the permission. |
| **Reason** | The operator does not use substitute/alternative SKU links; the tab was unused surface and a second graph over the catalog. |
| **Future migration impact** | Do not re-add Product Relationships without a new DDL. Do not infer substitutes in Nabz from SKU naming. |

---

## DDL-60 — Operator Product Master catalog is live Postgres (not test data)

| | |
|--|--|
| **Decision** | The operator Product Master (taxonomy, Attribute Definitions + Type bindings, UOM, Brands, Products/SKUs and stored master values) is **production catalog data**. PostgreSQL remains SoR. `backend/src/db/snapshots/product-master.catalog.json` is the **git-versioned copy** of that catalog for empty-database restore and GitHub transfer. Domain JS mill matrices stay seed helpers, not a second SoR. Do not add further test SKUs into this catalog, and do not treat it as integration-test fixtures. After UI structure edits, re-run `node backend/scripts/snapshot-product-master.js` before push. Empty `npm run seed` restores the snapshot; a populated catalog is not overwritten. Wiping requires `JARIAN_WIPE_PRODUCT_MASTER=YES` and is blocked in production. |
| **Current state** | Snapshot + restore in `productMasterCatalog.js`. Seed restores only when groups and products are empty. Incremental brand/offer seeds skip Types that already have bindings. |
| **Reason** | Operator structure edits were already in Postgres but were still framed as test/seed leftovers. The catalog is now the official mill list and must survive clone/setup without being mistaken for disposable fixtures. |
| **Future migration impact** | Do not load extra demo Products into Vitrin. Integration tests must create/delete their own ids (`productMasterFixtures.js`). Do not `pg_dump` secrets into git; this snapshot is Product Master tables only. |

---

## DDL-61 — Mill-sheet length catalog (operator millimetre matrix)

| | |
|--|--|
| **Decision** | Supersedes the numeric matrix in [DDL-56](#ddl-56--mill-sheet-length-is-a-conditional-transaction-default) only. `sheet_length` stays TRANSACTION, never identity/SKU, never stored on Product. Closed domain catalog, more-specific first: **thickness > 40 → display phrase «طول»** (no millimetre, no UOM); **width 1250 and thickness > 8 → 6000**; **width 1000 → 2000**; **width 1250 → 2500**; **width 1200 / 1500 / 2000 → 6000**. An entered millimetre value always wins. The «طول» phrase is display-name only; order-line preselect does not put it into a DECIMAL field. |
| **Current state** | `sheetMillLength.js` (BE authority, FE mirror). Attribute Definition and mill-sheet Type bindings unchanged from DDL-56. |
| **Reason** | Operator mill list: 1250 plates thicker than ۸ میل ship as ۶۰۰۰ میل, and plates thicker than ۴۰ میل are named with «طول» rather than a fake ۱۲۰۰۰ millimetre default. |
| **Future migration impact** | No SQL. Do not revive 2000×>40 → 12000. Do not persist «طول» on Product. |

---

## DDL-62 — Welded fittings identity is Type shape + fitting_material

| | |
|--|--|
| **Decision** | Seamed and seamless **welded fittings** (اتصالات جوشی درزدار / اتصالات جوشی مانیسمان) share one identity contract: **Product Type is the shape** (elbow / tee / reducer / cap / stub end) and the only Required Attribute is PRODUCT ENUM `fitting_material` (فولادی / گالوانیزه / استیل ۳۰۴ / استیل ۳۱۶). **Size and schedule are not Product identity.** They bind as DDL-51 **Optional Attribute** (TRANSACTION + required): single-port Types use `size_pipe` + `sch`; reducing tee uses `size_run` + `size_branch` + `sch` with domain rule `size_branch < size_run`; concentric/eccentric reducer uses `size_large` + `size_small` + `sch` with `size_small < size_large`. Inch range is **0.5–48** via Type binding `overrideMin`/`overrideMax` (do not rewrite global `size_pipe` min/max shared with pipes). `sch` is exactly `SEAMLESS_PIPE_SCH_VALUES` (re-export, no forked list). Elbows may bind Offer Variant `elbow_radius` (`LR`/`SR`, default `LR`, TRANSACTION not required). Offer units are **عدد** / **عدد**. Do not cartesian size×sch into SKUs. Do not put millimetre `size`, mill `grade`, or meter `length` on these Types. Seamless load is **9 Types × 4 materials = 36 Products**. Seamed Types use the same contract when loaded; this DDL does not require seamed SKUs. |
| **Current state** | Domain catalogs `weldedFittingCatalog.js` + `seamlessWeldedFittingCatalog.js`. Taxonomy Types already exist (`seed-steel-fittings-taxonomy.js`). Attribute Definitions `fitting_material`, `elbow_radius`, `size_run`, `size_branch`, `size_large`, `size_small` are created on first seed. Postgres remains SoR. |
| **Reason** | Fitting commercial identity is the shape plus material. NPS size and schedule are order-time selection (same Optional Attribute pattern as alloy-rebar size). Cartesian SKUs would explode the catalog without changing identity. |
| **Future migration impact** | Expand-only. Do not rewrite issued SKUs. Nabz order-line `customAttributeValues` must enforce TRANSACTION+required size/sch (and reducing/reducer inequalities) when unfrozen. Seamed product seed may reuse the shared catalog without changing this identity law. |
| **TODO** | Stub End Lap (MS/LP) Offer Variant is **not** bound. Codes/labels (MS vs LP vs ASME A/B) were ambiguous; bind as TRANSACTION not-required when the operator catalog is confirmed. Not a blocker for the 36 identity SKUs. |

---

## DDL-63 — Forged / threaded / flange fittings identity is Type + fitting_material

| | |
|--|--|
| **Decision** | Three remaining steel-fittings families share DDL-51 identity with welded fittings ([DDL-62](#ddl-62--welded-fittings-identity-is-type-shape--fitting_material)): **Product Type is the shape** and the only Required Attribute is PRODUCT ENUM `fitting_material` (فولادی / گالوانیزه / استیل ۳۰۴ / استیل ۳۱۶ — reuse the shared definition; do not fork a second ENUM). Display name is **Type + material label** only (e.g. فلنج کور فولادی). Size and class are never master identity and are not stored on Product. **(1) Forged high-pressure (ASME B16.11)** — 11 Types × 4 = 44 Products. `forged_class` ENUM `3000`/`6000`/`9000` is TRANSACTION required. It is **not** pipe `sch` (`SEAMLESS_PIPE_SCH_VALUES` stays 17 values). Single-port Types bind `size_pipe` + `forged_class`. Reducing SW tee binds `size_run` + `size_branch` + `forged_class` with `size_branch < size_run`. Olet (one Type «تردوولت / ساکوولت») binds `size_run` (header) + `size_branch` (olet) + `forged_class` with **`size_branch ≤ size_run`**, plus Offer Variant `olet_style` (`sockolet`/`threadolet`, TRANSACTION not required). Taxonomy has a single «زانو ساکت‌ولد»; Offer Variant `elbow_angle` (`90`/`45`, default `90`, TRANSACTION not required) covers 90 vs 45. **(2) General threaded** — 9 Types × 4 = 36 Products under «اتصالات دنده‌ای». Do not bind these onto «زانو دنده‌ای فشار قوی» / «سه راهی دنده‌ای فشار قوی». Iranian default: **size is the only order-required dimension**. `threaded_class` (`standard`/`150`) is Offer Variant, TRANSACTION **not** required. Reducing tee uses `size_run`/`size_branch`; bushing (روپیچ توپیچ) uses `size_large`/`size_small`; smaller < larger. Elbow and street elbow reuse `elbow_angle` default 90. **(3) Flanges (ASME B16.5 Iranian market)** — 6 Types × 4 = 24 Products. `size_pipe` + `flange_class` (`150`/`300`/`600`/`900`/`1500`/`2500`) are TRANSACTION required. `flange_class` is **not** `sch` and **not** `forged_class`. Offer Variant `flange_facing` (`RF`/`FF`/`RTJ`, default `RF`) is not identity. Pipe `sch` is not bound. Inch range is **0.5–48** via Type binding `overrideMin`/`overrideMax` (do not rewrite global `size_pipe` min/max). Offer units are **عدد** / **عدد**. NPS overlay (DDL-58) adds these Type names and already-shared `size_run`/`size_branch`/`size_large`/`size_small` codes. |
| **Current state** | Domain catalogs `forgedFittingCatalog.js`, `threadedFittingCatalog.js`, `flangeCatalog.js`. Shared materials / inch sizes / reducing validators from `weldedFittingCatalog.js`. Taxonomy Types already exist. Postgres remains SoR. |
| **Reason** | Iranian stock identity for these fittings is shape + material. Pressure class, NPS, facing, and olet style are order-time. Cartesian size×class SKUs would explode the catalog. Forged class numbers are ASME B16.11 pressure classes, not pipe schedules. |
| **Future migration impact** | Expand-only. Do not rewrite issued SKUs. Nabz order-line `customAttributeValues` must enforce TRANSACTION+required size/class (and reducing/olet inequalities) when unfrozen. |
| **TODO** | `thread_gender` (روپیچ / توپیچ) is **not** bound. Iranian orders are not ambiguous enough on the 9 general-threaded Types once size (and bushing large/small) are present. Bind as TRANSACTION not-required if a later catalog needs it. `flange_standard` is skipped — this catalog is B16.5 only. |

---

## DDL-64 — Fasteners identity is Type shape + fastener_grade

| | |
|--|--|
| **Decision** | **پیچ و مهره / Fasteners** (28 Types: 7 bolts, 7 nuts, 5 washers, 5 anchors, 4 self-drilling) follow the alloy-rebar / DDL-51 contract: **Product Type is the shape** and the only Required Attribute is PRODUCT ENUM `fastener_grade` (`4.8`, `5.6`, `8.8`, `10.9`, `12.9`, `A2-70`, `A4-70`, `A4-80`). Do **not** reuse mill `grade` (A1/A2/A3, Ck45, pipe ASTM…). **Size and length are not Product identity.** They bind as Optional Attribute (TRANSACTION + required) on dedicated definitions: ENUM `fastener_size` (`M3`–`M36`, expandable toward M64) and DECIMAL `fastener_length` (mm, min 5 max 1000). Bolts / anchors / self-drilling bind size+length; nuts and washers bind size only. Do not convert shared millimetre `size` or meter `length` to this contract. **Coating** (`سیاه` / `گالوانیزه` / `گالوانیزه گرم` / `بدون پوشش`) is Offer Variant (TRANSACTION not required) on bolts/nuts/anchors/self-drill, not washers. `tooth_style` (internal/external) is Offer Variant **only** on واشر ستاره‌ای (خورشیدی). `head_style` is unbound on self-drilling (it is in the Type name). `alloy` STRING must not be required (DDL-50); deactivate leftover mill `size`/`grade`/`length` PRODUCT identity bindings. Display name is Type + grade (`includeLabel` false). Offer units **عدد** / **عدد**. One Product per Type×grade subset: washers `4.8`/`A2-70`/`A4-80`; self-drill `8.8`/`A2-70`/`A4-80`; bolts/nuts/anchors full eight (including wing/acorn). **179 Products.** No M×length cartesian SKUs. Do not rewrite issued SKUs. Unused leftover sized Products on these Types may be hard-deleted; in-use Products stay. |
| **Current state** | Domain catalog `fastenerCatalog.js`. Taxonomy Types already exist (`seed-fasteners-taxonomy.js`). Attribute Definitions `fastener_grade`, `fastener_size`, `fastener_length`, `coating`, `tooth_style` are created on first product seed. Postgres remains SoR. |
| **Reason** | Fastener commercial identity is the shape plus property class. Metric diameter and rod/screw length are order-time (same Optional Attribute pattern as alloy-rebar size). Cartesian M×length SKUs would explode the catalog. Mill `grade`/`size` vocabularies must not mix fastener classes into pipe or rebar Types. |
| **Future migration impact** | Expand-only (`fastener_size` toward M64). Do not rewrite issued SKUs. Nabz order-line `customAttributeValues` must enforce TRANSACTION+required size/length when unfrozen. |

---

## DDL-65 — Russian wood identity (footboard cartesian; plywood thickness only)

| | |
|--|--|
| **Decision** | Rename live group `چوب` / Timber & Wood Products to **`چوب روسی` / Russian Wood**. Keep empty legacy categories `چوب طبیعی` and `فرآورده‌های چوبی`. Add `تخته زیرپایی` and `تخته چندلایه`. **Footboard** Type `تخته زیرپایی روسی`: identity is required PRODUCT DECIMAL `board_thickness_cm` (only 5) × `board_width_cm` (20, 22, 25, 28, 30) × `board_length_m` (only 4 and 6). **Length is Product identity, not mill TRANSACTION cut** — do not reuse meter `length` on this Type. 5×1×2 = **10 Products**. Offer **شاخه / شاخه**. Create UOM `CM` / `سانت` if missing. **Plywood** four Types (معمولی / ضد رطوبت / ضد آب / لاکی): identity is required PRODUCT `plywood_thickness_mm` closed 3, 4, 5, 6, 8, 10, 12, 15, 18, 21, 25 (no 4.5). Sheet 1220×2440 is TRANSACTION not-required Offer Variant defaults (`plywood_width_mm` / `plywood_height_mm`) — **not stored, not SKU**. 4×11 = **44 Products**. Offer **برگ / برگ**. Do **not** add plywood to `STEEL_TYPE_OFFER_UNITS` (`millSheetTypeNames()` would treat them as mill sheets). Seed offer units from `RUSSIAN_WOOD_OFFER_UNITS`. **Total 54 Products.** Do not expand into الوار / MDF. Do not rewrite issued SKUs. |
| **Current state** | Domain catalog `russianWoodCatalog.js`. Taxonomy seed `seed-russian-wood-taxonomy.js`. Product seed `seed-russian-wood-products.js`. Postgres remains SoR. |
| **Reason** | Footboard commercial identity is a closed mill size (thickness × width × stock length). Plywood is sold as a standard 1220×2440 sheet differentiated by Type (moisture class) and thickness; cartesian sheet-dimension SKUs would duplicate the mill-sheet identity mistake. |
| **Future migration impact** | Expand-only closed lists. Do not rewrite issued SKUs. Do not fold plywood into the mill-sheet `sheet_length` catalog. |

---

## DDL-66 — Shared Attribute Definition vocabulary (class, length_mm, size_branch)

| | |
|--|--|
| **Decision** | Product Types differ by **binding + `overrideAllowedValues`**, not by forked Attribute Definition codes. **CREATE** shared ENUM `class` / `کلاس` (union of threaded/flange/forged pressure class). **CREATE** DECIMAL `length_mm` / `طول` (sku `LNMM`, UOM MM) — **not** mill-sheet `sheet_length` and **not** metre `length`. Wave map: `threaded_class`/`flange_class`/`forged_class` → `class`; `fastener_length` → `length_mm`; `board_length_m` → metre `length`; `plywood_thickness_mm`/`plywood_width_mm`/`plywood_height_mm` → `thickness`/`width`/`height`; `elbow_angle`/`surface_alloy`/`flange_facing` → `supply_form`; `olet_style`/`tooth_style`/`coating`/`frame_model` → `kind`; `size_run`/`size_large` → `size_pipe`; `size_small` → `size_branch` (rename nameFa «سایز دوم»). Keep `board_thickness_cm` / `board_width_cm` (centimetre UOM gap). Lock mill-sheet `supply_form` to `roll`/`mill`/`cut` **before** expanding the catalog with elbow/facing/alloy extras. Merge frame models into `kind`; do not replace the shared catalog. **Do not delete Products.** |
| **Current state** | Domain map `attributeDedupMap.js`. Idempotent migrate `backend/scripts/dedup-attribute-definitions.js` (`--dry-run` / `DRY_RUN=1`). Postgres remains SoR. |
| **Reason** | Three class ENUMs and several millimetre/inch/kind forks were the same commercial questions. Fastener millimetre length is not mill-sheet length (DDL-56) and not metre bar length. |
| **Supersedes** | **DDL-64 for fastener LENGTH only:** `fastener_length` deactivates; bolts/anchors/self-drill bind TRANSACTION `length_mm`. Grade/size/coating contract unchanged. **DDL-65 for footboard length only:** footboard reuses metre `length` with **PRODUCT required** binding (still identity, not mill TRANSACTION cut). Plywood thickness maps onto mill `thickness`. |
| **Debt** | `frame_model` → `kind` is temporary. Prefer splitting پروفیل چهارچوب into 7 Types; doing that now would break 17 live Products. Type-split remains future work. |
| **Future migration impact** | Expand-only. Do not rewrite issued SKUs. Do not bind `sheet_length` onto fasteners. |

---

## DDL-67 — Product display name and description use Persian digits only

| | |
|--|--|
| **Decision** | All numerals in Product **display name** (`generatedName`, `displayNameOverride`) and **product description** (ویترین «شرح کالا», create-form preview, frozen `catalogData` title/description, and `JarianProductCell` name/description) are Persian digits (`۰–۹`). No mixed Latin/Persian/Arabic-Indic digit scripts. **SSOT** is the display-name builder: `buildDisplayNameFromRule` / `buildGeneratedName` / `formatProductDisplayText` (`normalize.js` backend; `productDisplayText.js` FE preview mirror). Attribute values, SKU, and `canonical_identity_key` stay ASCII for identity (DDL-24c / DDL-51). GET/search still derive `generatedName` live (DDL-52); the stored `generated_name` cache and override are also written in Persian so search/sort match what the operator sees. |
| **Current state** | Builder + live GET/search + override write/read. FE create-form preview uses the same helper. Vitrine «شرح کالا» also presents via `formatProductCatalogName` / `presentCatalogProduct` so a stale local API cache (NPS overlay already Persian, thickness/size still ASCII) cannot mix digit scripts. NPS inch overlay (DDL-58) already emitted Persian fractions; the final join step now converts remaining Latin numerals (thickness, mill size, grade `304L` → `۳۰۴L`). No SQL / no SKU rewrite. |
| **Reason** | Commercial names concatenated raw DECIMAL/ENUM values (`ضخامت 2 میل`, `1500×3000`) next to Persian type labels. Operators read one digit script. |
| **Future migration impact** | No SQL. Do not rewrite issued SKUs. Do not convert identity storage. Existing `generated_name` cache is rewritten on create/update/type-rule save; list/GET already live-derive. Text search `ILIKE` on a still-Latin cache row may miss Persian queries until that row is refreshed. |

---

## Change control

1. Propose a new `DDL-NN` when a persistence or aggregate choice would contradict or refine the above.  
2. Reference the DDL id from schema/API design notes and PRs.  
3. Do not invent a standalone **Opportunity** or global ContactPerson root without superseding DDL-02 / DDL-04.  
4. **Raw Lead** is an independent Ofogh aggregate per **DDL-13** (supersedes DDL-04 for Raw Lead only). Do not fold Raw Lead back into Company without a new superseding DDL.  
5. **Raw Lead capabilities** are gated per **DDL-14** (Pooyesh Activity/Task only). Do not accept `leadId` / `RAW_LEAD` on Order, Finance, Campaign, or Formal Correspondence paths.  
6. **Activity** is a Pooyesh PostgreSQL aggregate per **DDL-15** (resolves DDL-05). Do not unify Nabz `crmActivities` / Order events into `activities` without a new superseding DDL.  
7. **Task** is a Pooyesh PostgreSQL aggregate per **DDL-16**. Do not merge Task into Activity without a new superseding DDL.  
8. **Personal Lead Pipeline** is user-owned per **DDL-17**. Do not make Customer Lifecycle customizable or report on personal stage names as business status.  
9. **Order Outcome + Closure** per **DDL-18(B)** (supersedes DDL-18(A)). Successful Purchase = `status=success`; final close = `closure=closed`.  
10. **Persona ≠ Position ≠ Role** per **DDL-40** / **DDL-42** / **DDL-44**. Persona is persisted Definitions data; Role→Persona is catalog identity only and must not grant permissions or live on User.
11. **Auth lifecycle** per **DDL-41** (mobile login, Faraz invitation, forgot-password OTP). Do not fold Persona into that work.
12. **Required ≠ identity; type-level ENUM subsets; Value Scope PRODUCT/TRANSACTION** per **DDL-46** (supersedes DDL-24p derivation and DDL-45 product-form multi-select). Do not rewrite issued SKUs. Nabz order-line storage remains deferred.
13. **Product offer units + custom length** per **DDL-47**. Count/sales are UOM relations (`base_uom_id` / `sales_uom_id` on Product; defaults on Product Type). Do not add parallel unit columns, a conversion engine, or rewrite existing Products when Type defaults change.
14. **Latin lexicon** per **DDL-48**. Postgres is SoR for FA→Latin suggestions. Do not treat `latinLexicon.js` as the live dictionary, and do not call an external translation API.
15. **SKU is internal** per **DDL-49**. Do not surface SKU or «در کد کالا» in Product Master UI.
16. **Required PRODUCT ENUM is identity; required free text is forbidden** per **DDL-50** (refines DDL-49 type list). Transaction never identity. Exact identity match reuses the existing Product.
17. **Only Required Attribute is Product identity; Optional Attribute is order-required TRANSACTION; Offer Variant is optional TRANSACTION; SKU is 2-char parts from taxonomy `code` + required values** per **DDL-51**. Do not put Optional/Offer values in SKU. Nabz order-line enforcement remains deferred.
18. **Product display name is a Type-level token rule** per **DDL-52**. Do not merge it with SKU generation, and do not persist Persian attribute labels inside the rule.
19. **Display-name unit comes from the UOM registry** per **DDL-53**. Do not persist unit labels in `display_name_rule`; `includeUnit` is a flag only.
20. **Display-name literals are a closed catalog** per **DDL-54**. Do not persist «شاخه» / «×» as free text, do not treat them as attributes or identity, and do not add a parallel variables bank on بانک ویژگی‌ها.
21. **Type-binding «پیش‌فرض»** per **DDL-55** is operator-owned `override_default_value`. Do not invent a bar-family mill-length catalog (۱۲/۶ m). TRANSACTION defaults never become Product identity.
22. **Mill-sheet length** per **DDL-56** / **DDL-61** is TRANSACTION attribute `sheet_length` (طول ورق) plus a domain rule from stored width×thickness. Thickness > 40 displays «طول», not ۱۲۰۰۰ میل. Do not store mill length on Product, do not put it in SKU, and do not reuse meter `length` for mill sheets.
23. **Steel flat mill width** per **DDL-57** is required PRODUCT identity (`strip_width` + thickness) on تسمه فولادی. Do not treat mill width as order-time TRANSACTION on that Type. Length stays TRANSACTION.
24. **NPS inch display** per **DDL-58** formats stored decimal inch `size` / `size_pipe` on the closed pipe Type list as «۱/۲ اینچ». Do not convert millimetres to inches, do not rewrite SKU (`0.5`), and do not change the shared `size` UOM.
25. **Product Relationships retired** per **DDL-59**. Do not add substitute/alternative SKU links, a «روابط کالا» tab, or `products:manage-relationships`.
26. **Operator Product Master catalog** per **DDL-60** is live Postgres plus the git snapshot. Do not add test SKUs, and do not wipe without `JARIAN_WIPE_PRODUCT_MASTER=YES`.
27. **Welded fittings** per **DDL-62** identity is Type shape + required PRODUCT `fitting_material`. Size and `sch` are TRANSACTION required (Optional Attribute), not cartesian SKUs. Seamless is 9 Types × 4 materials = 36. Seamed uses the same contract when loaded. Do not rewrite SKUs.
28. **Forged / threaded / flange fittings** per **DDL-63** identity is Type shape + required PRODUCT `fitting_material`. Forged class ≠ pipe sch; flange class ≠ sch ≠ forged_class; threaded Iranian default is size-only required (`threaded_class` Offer Variant). Do not rewrite SKUs.
29. **Fasteners** per **DDL-64** identity is Type shape + required PRODUCT `fastener_grade`. Metric `fastener_size` / `fastener_length` are TRANSACTION required; coating is Offer Variant. 28 Types; 179 grade-only Products. Do not rewrite SKUs. Do not mix fastener classes into mill `grade`.
30. **Russian wood** per **DDL-65** identity is footboard thickness×width×stock length (10) and plywood thickness-only (44). Sheet 1220×2440 is TRANSACTION Offer Variant, never SKU. Do not put plywood `برگ` on `STEEL_TYPE_OFFER_UNITS`. Do not rewrite SKUs.
31. **Shared Attribute Definition vocabulary** per **DDL-66**. CREATE `class` and `length_mm` (not `sheet_length`). DDL-64 fastener LENGTH and DDL-65 footboard metre length are superseded only as mapped. Do not delete Products. `frame_model`→`kind` is Type-split debt.
32. **Product display name and description numerals** per **DDL-67** are Persian digits only. Do not concatenate Latin attribute values into commercial names, and do not convert SKU / identity storage.
