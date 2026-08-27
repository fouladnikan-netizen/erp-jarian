# Business Rule Ownership Map

> **Status:** Living map — Nabz Order lifecycle rules are **Backend-enforced** (2026-08).  
> **Related:** [09-BUSINESS_RULES_WORKFLOW_AUDIT.md](./09-BUSINESS_RULES_WORKFLOW_AUDIT.md), [ORDER_WORKFLOW.md](./ORDER_WORKFLOW.md), [entity-cards/order.yaml](./entity-cards/order.yaml)

Frontend may mirror rules for UX; **authority = Backend** `orderService` + `src/domain/order/orderLifecycle.js`.

---

## Ownership table

| Rule | Current location | Current owner | Future recommended owner | Risk |
|------|------------------|---------------|--------------------------|------|
| **Customer Completion** | `src/domain/customerCompletion/` + gate UI under `components/customerCompletion/` | Domain (good) | Keep domain; optional server enforcement later | Medium — soft UX gate only |
| **Pricing / quoting** | `src/modules/nabz/services/quotingService.js` (+ re-export `quotingService.js`) | Nabz service | Domain pricing module or keep Nabz service as SSOT | Medium |
| **Margin** | Same quoting service; ACL in `orderEditPermissions.js` | Nabz service + Nabz role constants | Quoting SSOT + unified RBAC | High — ACL not tied to Shirazeh |
| **VAT** | Quoting service (rate 0.1); also UI paths in Saranjam | Nabz service (**primary**); UI duplicate | Single calculation module; UI display-only | **Critical** — duplication |
| **Settlement / archive gates** | UI: `SaranjamTab.jsx`; **Backend** `evaluateArchiveAllowed` on DELETE when settlement started | Nabz UI + Backend | Keep; full Finance engine later | High — API archive guarded |
| **Weight / logistics qty** | `rahseparLoadingService.js`, settlement helpers | Nabz services | Shared weight util + rahsepar service | Medium — helper dup |
| **Shipping validation** | `shippingService.js` (`issueShippingVoucher`, carrier/PO checks) | Nabz service | Keep service; wire as hard gate if product requires | High — voucher optional for rahsepar finalize |
| **QC validation** | `qcInspectionConfig.js`, `QcDocumentModal.jsx`, Rahsepar panel | Config + UI | Service-level hard gate before tadarok/rahsepar complete | High — soft only today |
| **Order stage transitions** | **SSOT** `src/domain/order/orderLifecycle.js` → Backend `orderService`; FE `orderStageService` UX mirror | Backend (+ Nabz UX) | Keep Backend authority | **Critical** — PATCH guarded |
| **Order status / completion** | Same lifecycle module (`evaluateStatusTransition`, `order.complete` audit); FE gateway decision UI | Backend (+ Nabz UX) | Keep | High |
| **Gateway decision** | `gatewayDecisionService.js` + configs (UX); Backend requires `gatewayDecision.outcome=success` + signed proforma for `current→success` | Nabz + Backend | Keep; tighten payment-type enum later | Medium |
| **Proforma / document generation** | `proformaService.js`, `orderProfileService.js`, print helpers | Nabz services | Keep; avoid new print rules in JSX | Medium |
| **Revision / return policy** | `domain/order/revisionEngine.ts` + `services/revisionService.js` | Domain + Nabz adapter | Keep domain engine as SSOT | Low |
| **Company lifecycle (Ofogh)** | `domain/party/lifecycle.constants.js`, store `updateContactStage`, `pipelineConfig` | Shared constants + Ofogh UX | Transition policy service later | High — free drag |
| **Permissions (ops edit)** | `orderEditPermissions.js`, `constants.js` `USER_ROLES` / `CURRENT_USER` | Nabz hardcoded | Shirazeh RBAC (or single auth RBAC) at mutation boundary | **Critical** — 3 systems |
| **Permissions (admin matrix)** | `permissionsStore` + `permissionsRegistry` | Shirazeh UI | Same, but must be enforced in ops | High — not consulted by Nabz |
| **Notifications** | `NotificationEngineContext`, `config/notificationEvents.js`, `showSystemToast` | Shell / dual paths | One notification bus; domain events → dispatch | Medium |
| **Campaign audience eligibility** | `domain/entityReference` + `mowj/adapters/erpAudiencePort` | Domain + Mowj port | Keep gate; never list Raw Leads | High if bypassed |
| **Raw Lead global capability gate** | `domain/entityReference/rawLeadCapability.js` + Order `rawLeadGate` + Pooyesh facades | Domain + Backend Order + Pooyesh | Keep domain SSOT; wire new Finance/Quotation APIs to same codes | **Critical** — ERP leakage |
| **Pooyesh subject reference** | `entityReference` + facades + Activity/Task repositories | Pooyesh | Keep; Task ≠ Activity (**DDL-15/16**) | Low — SSOT landed |
| **Campaign executor** | `mowj/domain/campaignExecutor.js` + registry (Pooyesh port / mock channels) | Mowj | Keep; real providers plug into `ChannelExecutor` | Medium |
| **Campaign attribution KPIs** | `mowj/domain/campaignKpiCalculator.js` (attribution rows only) | Mowj | Keep single calculator SSOT; no fake metrics / no ad ROI | Low |
| **ContactPerson rules** | `domain/contactPerson` + roles config | Domain / shared UI | Keep | Low |
| **Inquiry draft validation** | `inquiryService.js`, `createOrder.js` | Nabz services | Keep | Low–Medium |

---

## Layer summary (as-is)

| Layer | Appropriate for | Do not put here (future rule) |
|-------|-----------------|-------------------------------|
| **Domain** | Cross-module policies (completion, revision, party constants) | Screen-only UI flags |
| **Nabz `*Service.js`** | Order transitions, quoting, shipping, tadarok | Presentational formatting |
| **Config** | Enums, labels, stage ids, term lists | Imperative transitions |
| **Store** | Persist aggregate fields after a service decides | Heavy calculation |
| **React component** | Collect input, call service, show errors | New financial formulas, new archive gates |
| **API / Backend** | Authoritative Order stage/status/completion/archive gates | Quoting/VAT formula engine (still FE) |

---

## Explicit non-goals (this enforcement wave)

Do **not** move VAT calculation, margin ACL, full settlement finance engine, or Nabz role matrix to Backend in this wave — only lifecycle integrity that can invalidate Order via API.
