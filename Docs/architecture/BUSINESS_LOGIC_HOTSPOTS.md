# Business Logic Hotspots

> **Status:** Inventory of mixed-responsibility units.  
> **Do not split files in this phase.** Extraction notes are future candidates only.  
> **Related:** [BUSINESS_RULE_OWNERSHIP.md](./BUSINESS_RULE_OWNERSHIP.md), [09-BUSINESS_RULES_WORKFLOW_AUDIT.md](./09-BUSINESS_RULES_WORKFLOW_AUDIT.md)

LOC are approximate (audit snapshot).

---

## Components

| Unit | ~LOC | Current responsibilities | Risk | Future extraction candidate |
|------|-----:|--------------------------|------|------------------------------|
| `modules/nabz/.../SaranjamTab.jsx` | 1302 | Settlement UI, VAT/line economics, payment receipts, archive gates, ledgers, print hooks | **Critical** — duplicates service math/gates | Domain/service settlement API; tab becomes presentational |
| `modules/nabz/.../RahseparStagePanel.jsx` | 1175 | Load board UX, driver/weight flows, QC gate surfacing, sooratbar | **High** — orchestration in UI | Keep mutations in `rahseparLoadingService`; slim panel |
| `modules/kanoon/CustomerProfilePage.jsx` | 1105 | Profile chrome, completion, contacts, related orders | **High** — page god | Already using domain completion; further section extraction later |
| `modules/nabz/components/QuickInquiryModal.jsx` | 961 | Inquiry/quote complete actions, live-phase UX | **High** | Call gateway/inquiry services only; no new formulas in modal |
| `modules/nabz/.../GatewayMorphTable.jsx` | 888 | Live gateway editing, ACL wipe, sensitive columns | **High** | Table UI + `orderEditPermissions` / quoting services |
| `modules/nabz/.../QcDocumentModal.jsx` | 655 | QC form validation & save | **Medium–High** | Persist via dedicated QC service later |
| `modules/ofogh/OfoqLeadModal.jsx` | 611 | Lead UX, stage force, completion gate, order create | **Medium–High** | Keep store/service calls; no new lifecycle policy in modal |
| `modules/nabz/.../TadarokStagePanel.jsx` | 442 | PO/split orchestration UI | **Medium** | `tadarokStageService` remains home for rules |
| `modules/nabz/.../PurchaseOrderModal.jsx` | 481 | PO draft UX validation | **Medium** | Align with `validatePurchaseOrderDraft` |
| `modules/nabz/.../GatewayDecisionPanel.jsx` | 311 | Decision form | **Medium** | Service already owns outcomes |
| `components/calendar/CommitmentEngine.jsx` | 351 | Filters + completion gate over mixed live/mock data | **Medium** | Pure aggregator later |
| `components/calendar/UnifiedJarianCalendar.jsx` | ~490 | Calendar composition | **Low–Medium** | Presentation |

---

## Services

| Unit | ~LOC | Current responsibilities | Risk | Future extraction candidate |
|------|-----:|--------------------------|------|------------------------------|
| `rahseparLoadingService.js` | 679 | Load states, assign driver, weights, finalize | **High** god service | Submodules after persistence (loading vs finalize) |
| `orderProfileService.js` | 433 | Timeline, attachments, proforma header actions, events | **Medium–High** | Split profile docs vs timeline later |
| `services/quotingService.js` | 418 | Margins, VAT, totals, complete quoting | **Medium** (appropriate home, large) | Domain pricing package later |
| `inquiryService.js` | 405 | Inquiry drafts, finalize, complete order inquiries | **Medium** | Keep; avoid UI duplicates |
| `proformaService.js` | 370 | Issue/update/sign; pipeline reset side effects | **High** side-effect surprise | Documented in ORDER_WORKFLOW; extract reset policy later |
| `tadarokStageService.js` | 331 | Lines, PO issue, complete procurement | **Medium** | Optional QC hard-gate later |
| `saranjamSettlementService.js` | 277 | Settlement model, discrepancy, weak archive flag | **Critical** vs UI | Become sole gate/math owner later |
| `orderStageService.js` | 266 | Stage change, mozene lock | **Medium** | Align with status audit someday |
| `orderCrmService.js` | 250 | CRM activities / payments on order | **Medium** | Activity SSOT later |
| `gatewayService.js` / `gatewayLifecycleService.js` / `gatewayDecisionService.js` | ~127–210 | Phase views, advances, decision | **Medium** | Already split reasonably |
| `phase2Service.js` | 192 | Enter phase2, change stage, advance ops | **High** — weak sequential gates | Documented; tighten later |
| `shippingService.js` | 204 | Shipping voucher | **Medium** | Hard-gate wiring later |

---

## Mixed-layer patterns to watch

1. **UI recalculates what a service already computes** (Saranjam).  
2. **Soft validation in panel, missing in complete/finalize service.**  
3. **ACL constants in Nabz vs unused Shirazeh matrix.**  
4. **Side-effectful document updates that reset workflow** (proforma) without a dedicated policy module.

---

## Explicit non-goals

No file splits, no moves of VAT/settlement/permissions, no workflow engine in this phase.
