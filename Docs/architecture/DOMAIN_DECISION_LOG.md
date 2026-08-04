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
| **Current state** | Ofogh pipeline reads/writes the same contact records; no opportunity id/row. |
| **Reason** | Avoid a second CRM root and dual-write with Company before Company persistence exists. Aligns with aggregate-boundary “Opportunity is a view on Company.” |
| **Future migration impact** | v1 APIs expose lifecycle on Company (or a thin “opportunity view” DTO), not `/opportunities` as a separate SoR. Promoting Opportunity to its own entity/table requires a new DDL with identity, ownership, and sync rules. |

---

## DDL-05 — Activity ownership requires a future dedicated decision

| | |
|--|--|
| **Decision** | **No binding Activity aggregate owner yet.** Activity remains a **known split** until a dedicated decision. |
| **Current state** | At least three streams: Company `interactions[]`, Order `crmActivities[]`, Order `events[]`, plus unused activity-timeline mock data. |
| **Reason** | Forcing a unify-before-Company/Order persist would block backend priority 1–5; wrong early schema is costly. |
| **Future migration impact** | Do **not** invent a single Activity table as SoR in the first backend slice without DDL-05 follow-up. Interim: persist streams with their parent aggregates. A later DDL must choose: unify vs keep typed streams, and define `companyId` / `orderId` rules. |

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

---

## Change control

1. Propose a new `DDL-NN` when a persistence or aggregate choice would contradict or refine the above.  
2. Reference the DDL id from schema/API design notes and PRs.  
3. Do not implement backend schema that invents a standalone Opportunity or global ContactPerson root without superseding DDL-02 / DDL-04.
