# Frontend Component Hotspots

> **Status:** Inventory only — **do not split files** in this phase.  
> **Related:** [12-FRONTEND_ARCHITECTURE_AUDIT.md](./12-FRONTEND_ARCHITECTURE_AUDIT.md), [BUSINESS_LOGIC_HOTSPOTS.md](./BUSINESS_LOGIC_HOTSPOTS.md) (rules + services overlap)  
> LOC approximate (audit snapshot).

---

## Components ≥ 500 LOC

| File | ~LOC | Current responsibility | Risk | Future extraction candidates |
|------|-----:|------------------------|------|------------------------------|
| `modules/nabz/.../SaranjamTab.jsx` | 1302 | Settlement UI, payments, archive gates, tax/line economics display | **Critical** — UI + business rules | Presentational layout + settlement service API only |
| `modules/nabz/.../RahseparStagePanel.jsx` | 1175 | Loading board, driver/weight UX, QC surfacing | **Critical** — god panel | Subpanels (ready / assign / dispatch) + `rahseparLoadingService` |
| `modules/kanoon/CustomerProfilePage.jsx` | 1105 | Full company profile composition + nabz date/orders | **High** — page god + cross-module | `profileLayout` sections; data hooks |
| `modules/nabz/components/QuickInquiryModal.jsx` | 961 | Inquiry/quote complete flows | **High** — modal god | Step views + inquiry/quoting services |
| `modules/nabz/.../GatewayMorphTable.jsx` | 888 | Live gateway editing, ACL wipe UX | **High** | Cell editor kit + gateway services |
| `modules/nabz/components/ProformaDocument.jsx` | 664 | Proforma document presentation | **Medium–High** | Print/view vs edit shells |
| `modules/nabz/.../QcDocumentModal.jsx` | 655 | QC form + save | **Medium–High** | Form fields + QC config/service |
| `modules/ofogh/OfoqLeadModal.jsx` | 611 | Lead detail, stage, convert to order | **High** — bridges ofogh→nabz/kanoon | Conversion use-case helper; thinner modal |
| `components/calendar/UnifiedJarianCalendar.jsx` | 490 | Calendar composition (borderline &lt;500 but large shared) | **Medium** — feature under components | Move under `modules/gahshomar` later |
| `modules/nabz/.../PurchaseOrderModal.jsx` | 481 | PO draft UX | **Medium** | Align with tadarok validators |
| `modules/nabz/components/NabzOrderTable.jsx` | 474 | Orders list table | **Medium** | Column defs + jarian cells |
| `modules/nabz/.../TadarokStagePanel.jsx` | 442 | Tadarok orchestration | **Medium** | Line table vs PO actions |
| `modules/ofogh/OfoqPipelineBoard.jsx` | 432 | Kanban board | **Medium** | Column + card components |
| `modules/kampayn/SurveyBuilder.jsx` | 425 | Survey builder | **Medium** | Block list vs canvas |
| `modules/nabz/.../SaranjamSettlementLayout.jsx` | 421 | Settlement layout chrome | **Medium** | Keep presentational |
| `modules/nabz/components/CreateOrderDrawer.jsx` | 416 | Create order form drawer | **Medium** | Shared form field kit later |
| `modules/nabz/.../OrderProfileView.jsx` | 413 | Order profile composition | **Medium** | Adopt `profileLayout` |

---

## CSS hotspots (related)

| File | ~LOC | Note |
|------|-----:|------|
| `modules/nabz/nabz.css` | ~9448 | Module CSS gravity — avoid new global leakage |
| `.../SaranjamTab.css` | ~1791 | Pair with SaranjamTab |
| `modules/ofogh/ofoq-pipeline.css` | ~1454 | Ofogh-specific |

---

## Maintenance rule

When adding **new** UI that will exceed ~500 LOC, update this inventory with responsibility / risk / extraction note in the same PR — still **no mandatory split** unless product funds it.

---

## Explicit non-goals

No component splits, no Nabz rewrite, no moving calendar in this phase.
