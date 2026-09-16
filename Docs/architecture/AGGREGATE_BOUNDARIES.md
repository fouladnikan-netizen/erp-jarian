# Aggregate Boundaries

> **Status:** Documentation only — **no aggregate split or refactor** in this phase.  
> **Related:** [ENTITY_OWNERSHIP.md](./ENTITY_OWNERSHIP.md), [07-DOMAIN_MODEL_AUDIT.md](./07-DOMAIN_MODEL_AUDIT.md)

Consistency boundary today = in-memory Zustand document. There is no transactional DB; treat the following as **logical** aggregates.

---

## Company Aggregate

**Root:** Contact record in `useContactsStore` (domain name: Company).

**Consistency boundary includes:**

- Party identity: `entityType`, `personType`, legal/natural profile fields
- `relatedPersons[]` (ContactPerson) — 1:N only
- `interactions[]` (Company-scoped activity)
- Ofogh pipeline fields: `lifecycle_stage`, follow-up / last interaction dates
- Behavioral / assignee / financial-legal snapshots used by Kanoon cards

**Outside the boundary (references only):**

- Orders (`contactId` / customer id on Order)
- Campaigns, Users, Org nodes

**Invariant notes (current code):**

- Opportunity is **not** a child aggregate — it is a **view** on Company
- Natural person may expose a synthetic ContactPerson id (`self-{companyId}`) for UX pickers; that is not a second party root

**Write owners:** Kanoon + Ofogh (stage) + shared ContactPerson UI. Nabz must not fork a contact registry.

---

## Order Aggregate

**Root:** Order document owned by Nabz (`useNabzStore` / orders context).

**Consistency boundary includes (embedded):**

| Area | Typical fields / services |
|------|---------------------------|
| Header | code, status/tab, stageId, contactId, assignees |
| Lines | `items[]` with nested inquiries / targets |
| Quoting | mozene / quoting services |
| Gateway | decision + events |
| Proforma | versions, sign/archive |
| Ops phase2 | parvane → tadarok → rahsepar → saranjam |
| Shipping / loading | load lines, assignments (`LA-…`) |
| QC / documents | inspections, profile attachments |
| CRM on order | `crmActivities`, settlement payment stubs |
| Timeline | `events[]`, revisions |

**Outside the boundary:**

- Company profile (read via customer helpers)
- Product catalog master (only snapshots on lines)
- Shirazeh User/RBAC

**Invariant notes:**

- Dual status vocabularies exist (UI pipeline buckets vs domain `OrderStatus`) — bridge in `domain/order`; **do not** unify in a rush (see Future Recommendations)
- Order is intentionally a **god-aggregate** for current product size; splitting requires persistence + clear APIs

**Write owners:** Nabz services only. Ofogh may deep-link or create drafts but must not own Order nested mutations.

---

## Embedded Entities (not roots)

These are **not** independent aggregates today. Treat them as value objects / child entities of Company or Order.

| Concept | Parent | Notes |
|---------|--------|--------|
| ContactPerson | Company | Domain kit under `src/domain/contactPerson/` |
| Interaction | Company | Distinct from Order CRM activity |
| Order line / inquiry | Order | |
| Proforma version | Order | |
| Tadarok line / PO | Order | |
| Loading assignment | Order | |
| Saranjam payment stub | Order | Prefixes `cp`/`sp` legacy; not ContactPerson |
| Order event / revision | Order | Prefer `createNumericId` for new numeric event ids |
| Calendar event (derived) | Projection | Not a write root |

---

## Future Aggregate Candidates

Documented for planning only. **Do not extract now.**

| Candidate | Why later | Blockers |
|-----------|-----------|----------|
| **Shipment / Loading** | Order size; logistics team ownership | Persistence, inventory of load-state consumers |
| **Payment / Settlement** | Finance SSOT; saranjam + CRM duplicate streams | Math currently in UI + services |
| **Invoice / Tax document** | Compliance audit trail | Print/mock flows tied to Order |
| **Activity** | Cross-module CRM | پویش stub vs Company vs Order streams |
| **Opportunity** | Pipeline analytics | Still = Company + lifecycle |
| **Product** | Catalog governance | Vitrin local state; Nabz snapshots |
| **Campaign** | Marketing automation | Isolated mocks |

Extraction rule of thumb: **persist Order/Company first**, then carve child aggregates behind repositories — never mid-UI rewrite.

---

## Boundary rules for contributors

1. New fields that mutate with Company party data → Company store / `domain/contactPerson` or `domain/party`.
2. New fields that mutate with order fulfillment → Nabz Order document / existing `*Service.js`.
3. Do not create a third registry for Customer, Supplier, or Product “for convenience”.
4. Cross-aggregate reads are fine; cross-aggregate **writes in one function** should be explicit and rare (document why).
