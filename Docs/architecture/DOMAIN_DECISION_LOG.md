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
