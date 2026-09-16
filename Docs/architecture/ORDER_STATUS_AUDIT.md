# Order Status Consistency Audit

> **Status:** Inventory of **duplicate status models**.  
> **Do not merge. Do not rename.** Recommendation only for a future funded unification.  
> **Related:** [ORDER_WORKFLOW.md](./ORDER_WORKFLOW.md), [SSOT.md](./SSOT.md)

---

## Models in play

| Model | Kind | Canonical definition | Runtime role today |
|-------|------|----------------------|--------------------|
| **`stageId`** | number | `src/modules/nabz/config.js` (`STAGE_*_ID`, `PHASE1_STAGES`, `PHASE2_STAGES`) | **Primary** kanban / stepper / live-stage checks |
| **`ORDER_TABS` / `order.status` (bucket)** | `'current' \| 'success' \| 'failed'` | `config.js` → `ORDER_TABS` | **Primary** list tabs; success unlocks Phase 2 |
| **`OrderStatus` (domain)** | string union | `src/domain/order/order.enums.ts` | Types, revision records, repository status API — **underused** by UI pipeline |
| **`OrderPipelineBucket`** | type alias of tabs | `order.enums.ts` | Bridge typing for buckets |
| **Bridge maps** | Record maps | `src/domain/order/order.constants.ts` | `PIPELINE_BUCKET_TO_STATUS`, `ORDER_STATUS_TO_PIPELINE_BUCKET` |
| **stageId → OrderStatus** | switch | `src/modules/nabz/services/revisionService.js` → `stageIdToOrderStatus` | Revision history fields |
| **Operational phase** | string | `phase2Config.js` → `OPERATIONAL_PHASES` | View/live checks inside Phase 2 (parallel to stageId) |
| **Gateway phase** | string | `gatewayConfig.js` | Kavosh/mozene/pishkesh view phases (Phase 1) |
| **Load item status** | string | `rahseparLoadingService.js` → `LOAD_ITEM_STATUS` | Nested logistics state (not order header) |
| **Tadarok line status** | string | `tadarokStageConfig.js` | Nested PO line state |
| **Legacy stage 6** | number | `LEGACY_STAGE_TAJHIZ_ID` | Old data mapped toward رهسپار |

---

## Domain `OrderStatus` members

`INQUIRY` | `PRICING` | `PROFORMA` | `PURCHASE` | `LOADING` | `INVOICED` | `COMPLETED` | `FAILED`

| Member | Typical stageId bridge (`stageIdToOrderStatus`) | Notes |
|--------|--------------------------------------------------|-------|
| INQUIRY | 1 کاوش | |
| PRICING | 2 مظنه | |
| PROFORMA | 3 پیش‌کش | |
| PURCHASE | 4–5 ماشه/تدارک | Collapses two stages |
| LOADING | 7 رهسپار | |
| INVOICED | — | **Unused** in stage map (gap) |
| COMPLETED | 8 سرانجام | Maps saranjam → COMPLETED directly |
| FAILED | via `ORDER_TABS.FAILED` / gateway fail | Not a stageId |

Bucket bridge (`PIPELINE_BUCKET_TO_STATUS`) is coarse: `current→PRICING`, `success→PURCHASE`, `failed→FAILED` — **not** 1:1 with stages.

---

## Usage locations (representative)

| Concern | Where |
|---------|--------|
| Stage catalog / labels | `modules/nabz/config.js` |
| Tab filtering / kanban | `NabzPage`, `NabzKanban`, `useOrderPipelineView`, `kpi.js` |
| Stage change | `orderStageService.js`, `phase2Service.js` |
| Gateway / decision | `gatewayDecisionService.js`, `gatewayLifecycleService.js` |
| Live stage helpers | `isParvaneStageLive`, `isTadarokStageLive`, gateway `is*Phase*` |
| Domain types / Zod | `order.types.ts`, `order.schemas.ts` |
| Store / API status | `useNabzStore.updateOrderStatus`, `OrderRepository.updateOrderStatus` |
| Revision | `revisionEngine.ts` (OrderStatus fields), `revisionService.js` (maps from stageId) |
| Seed data | `ordersData.js` — uses runtime stageId + tab-style status |

---

## Duplication problems (as-is)

1. **Two header models:** UI thinks in `stageId` + tab; domain thinks in `OrderStatus`.  
2. **Incomplete bijection:** `INVOICED` has no stage; saranjam → `COMPLETED` skips invoicing as a first-class stage.  
3. **Coarse bucket bridge** loses stage fidelity.  
4. **Parallel phase strings** (gateway / operational) restate stage meaning for view/live checks.  
5. **Nested statuses** (load line, tadarok line) are fine conceptually but easy to confuse with header status in new code.

---

## Recommended future single source (do not implement now)

**Recommendation (future):**

1. Treat **one** header machine as write SSOT — either keep `stageId` (+ tab derived) **or** promote `OrderStatus` and derive stage UI from it — not both as writers.  
2. Keep nested logistics/PO statuses as **child** state machines.  
3. Delete or implement `INVOICED` deliberately when unifying.  
4. Until then: **new code must not invent a fourth header status enum**; use existing `config.js` stage ids for Nabz UI and existing bridges when touching domain revision/API.

---

## Explicit non-goals

No merge, rename, or runtime change in this documentation phase.
