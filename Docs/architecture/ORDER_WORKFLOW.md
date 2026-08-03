# Order Workflow (current)

> **Status:** Documentation of **as-is** Nabz Order lifecycle.  
> **No redesign.** Do not treat this as a target architecture.  
> **Related:** [ORDER_STATUS_AUDIT.md](./ORDER_STATUS_AUDIT.md), [09-BUSINESS_RULES_WORKFLOW_AUDIT.md](./09-BUSINESS_RULES_WORKFLOW_AUDIT.md)

Runtime primary keys: `order.stageId` (1–8) + `order.status` as `ORDER_TABS` (`current` | `success` | `failed`).  
Domain `OrderStatus` exists but is **not** the primary runtime driver — see status audit.

Stage catalog: `src/modules/nabz/config.js`.

```
کاوش (1) → مظنه (2) → پیش‌کش (3) → [Gateway decision]
                                      ├─ success → ماشه تأمین (4) → تدارک (5) → رهسپار (7) → سرانجام (8)
                                      └─ failed
Legacy stage id 6 (تجهیز) maps to رهسپار for old data.
```

---

## 1. کاوش (Kavosh) — stageId `1`

| Field | Current fact |
|-------|----------------|
| **Purpose** | Collect supplier inquiries per order line; prepare for pricing |
| **Entry conditions** | New order / create flow; or return via revision / proforma update reset |
| **Exit conditions** | All lines have required inquiries completed → advance to مظنه (`advanceKavoshToMozene` / `completeOrderInquiries`) |
| **Allowed transitions** | Forward → مظنه (gated). Backward returns via revision paths. Manual mozene selection is locked until inquiries complete |
| **Implementation** | `inquiryService.js`, `gatewayLifecycleService.js`, `orderStageService.js`, gateway UI (`QuickInquiryModal`, `GatewayMorphTable`) |
| **Known risks** | After proforma update, pipeline may reset here while quoting margins remain — surprising side effect |

---

## 2. مظنه (Mozene) — stageId `2`

| Field | Current fact |
|-------|----------------|
| **Purpose** | Apply margins / quoting on target inquiries; build sale economics |
| **Entry conditions** | Inquiries completed; mozene cannot be entered manually while locked (`canEnterMozeneStage`) |
| **Exit conditions** | Target inquiry chosen (when multiple) + saved margins → `completeOrderQuoting` / `advanceMozeneToPishkesh` |
| **Allowed transitions** | Forward → پیش‌کش. Not a free kanban drop target while locked |
| **Implementation** | `services/quotingService.js`, `gatewayLifecycleService.js`, `orderStageService.js` |
| **Known risks** | VAT 10% official inclusive/exclusive path has rounding sensitivity; margin ACL is Nabz-role only |

---

## 3. پیش‌کش (Pishkesh) — stageId `3`

| Field | Current fact |
|-------|----------------|
| **Purpose** | Issue / sign proforma; capture delivery info; prepare gateway decision |
| **Entry conditions** | Quoting completed from مظنه |
| **Exit conditions** | Proforma signed + decision editable → Gateway success or fail |
| **Allowed transitions** | Forward → ماشه تأمین (via gateway **success**) or **failed** tab. Return to کاوش on proforma update / revision. Parvane return lands back here |
| **Implementation** | `proformaService.js`, `orderProfileService.js`, `gatewayDecisionService.js`, `deliveryInfoService.js` / configs |
| **Known risks** | Gateway decision irreversible in service; payment type is free string, not a strict enum |

---

## 4. ماشه تأمین (Parvane) — stageId `4`

| Field | Current fact |
|-------|----------------|
| **Purpose** | Confirm purchase mandate after successful deal decision; enter Phase 2 |
| **Entry conditions** | `ORDER_TABS.SUCCESS` + `enterPhase2FromDecision` after gateway success |
| **Exit conditions** | `issueParvaneSupplyPermit` → تدارک; or `returnParvaneToPishkesh` → پیش‌کش + revision |
| **Allowed transitions** | → تدارک; → پیش‌کش (return). Phase2 kanban may allow other jumps when status=success (see risks) |
| **Implementation** | `parvaneStageService.js`, `phase2Service.js`, `phase2Config.js` |
| **Known risks** | `tryChangePhase2Stage` does not enforce strict sequential gates once status is success |

---

## 5. تدارک (Tadarok) — stageId `5`

| Field | Current fact |
|-------|----------------|
| **Purpose** | Issue purchase orders, line splits, QC documents, prepare for dispatch |
| **Entry conditions** | From ماشه تأمین (live when success + stage tadarok + operational view) |
| **Exit conditions** | All tadarok lines `po_issued` → `completeTadarokProcurement` → رهسپار |
| **Allowed transitions** | → رهسپار (complete). Phase2 jump risk applies |
| **Implementation** | `tadarokStageService.js`, `tadarokStageConfig.js`, `TadarokStagePanel`, `PurchaseOrderModal`, QC via `qcInspectionConfig` / `QcDocumentModal` |
| **Known risks** | QC completeness is a **soft** gate (used in UI/rahsepar), not a hard blocker on tadarok complete |

---

## 6. رهسپار (Rahespar) — stageId `7`

| Field | Current fact |
|-------|----------------|
| **Purpose** | Loading, driver assignment, scale weight, dispatch logistics |
| **Entry conditions** | From تدارک complete (or Phase2 navigation) |
| **Exit conditions** | No remaining preparing/ready/loading items; ≥1 dispatched → `finalizeRahseparOrder` → سرانجام |
| **Allowed transitions** | → سرانجام. Internal load states: preparing → ready → loading → dispatched |
| **Implementation** | `rahseparLoadingService.js` (~679 LOC), `shippingService.js`, `RahseparStagePanel` |
| **Known risks** | Shipping voucher not required for finalize; large service + panel mix orchestration |

---

## 7. سرانجام (Saranjam) — stageId `8`

| Field | Current fact |
|-------|----------------|
| **Purpose** | Settlement, invoices, customer/supplier balances, archive readiness |
| **Entry conditions** | From رهسپار finalize |
| **Exit conditions** | Product archive when invoices + balances cleared (UI gates stricter than service) |
| **Allowed transitions** | Terminal operational stage within success tab; archive/close via profile services |
| **Implementation** | `saranjamSettlementService.js`, **`SaranjamTab.jsx`** (also owns gates/math), CRM payments via `orderCrmService` |
| **Known risks** | **Critical:** UI `evaluateSaranjamGates` stronger than service `canArchive`; VAT/settlement logic duplicated in the tab |

---

## Cross-cutting (not a stage)

| Concern | Notes |
|---------|--------|
| **Gateway** | Decision step between پیش‌کش and Phase 2 — not a `stageId`, but a required transition |
| **Revision** | Orthogonal flags via `domain/order/revisionEngine` + `services/revisionService` — does not invent new stages |
| **Events** | Most transitions append to `order.events[]` |

---

## Contributor note

When adding a **new** workflow state or changing entry/exit rules, update this file in the same change set (see `.cursor/rules/jarian-business-rules.mdc`). Do not invent a parallel stage id without documenting it here.
