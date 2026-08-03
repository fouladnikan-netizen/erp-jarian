# Business Rules & Workflow Architecture Audit

> **Status:** Audit only — no redesign, no refactor, no implementation.  
> **Canvas:** open [`jarian-business-rules-workflow-audit.canvas.tsx`](/Users/ehsanmohammadi/.cursor/projects/Users-ehsanmohammadi-Documents-ERP-Jaryan/canvases/jarian-business-rules-workflow-audit.canvas.tsx) beside chat  
> **Overall Score: 3.8 / 10**

## Scale verdict

| Target | Fit? |
|--------|------|
| Current product (rich Nabz order pipeline + Ofogh board) | Yes, with known rule debt |
| 20 modules / 300 screens / 1000 features | **No** — dual lifecycles, UI-owned settlement, soft gates, fake automation, 3 permission systems |

---

## Scorecard

| Dimension | Score |
|-----------|------:|
| Business Rule Design | 4.0 |
| Workflow Design | 5.0 |
| Rule Ownership | 3.5 |
| State Machines | 4.0 |
| Validation | 4.5 |
| Automation | 2.5 |
| Maintainability | 3.5 |
| Scalability | 2.5 |
| **Overall** | **3.8** |

---

## 1. Workflows (summary)

| Workflow | Owner | Key location | States | Main problems |
|----------|-------|--------------|--------|---------------|
| Company / Opportunity lifecycle | Ofogh + Contacts | `lifecycle.constants`, `pipelineConfig`, store | 7 stages | Free-drag; no transition policy |
| Customer completion | Domain | `domain/customerCompletion` | operational / incomplete | Soft UX gate |
| ContactPerson | Company | `domain/contactPerson` + store | CRUD | Legacy aliases |
| Order pipeline | Nabz | `config.js`, `orderStageService`, `phase2Service` | stageId 1–8 + tabs | Dual vs `OrderStatus` |
| Inquiry / pricing / proforma | Nabz | `inquiryService`, `quotingService`, `proformaService` | draft/finalized + margins | Rounding; reset side effects |
| Gateway decision | Nabz | `gatewayDecisionService` | success \| failed | Irreversible |
| Parvane / Tadarok / PO | Nabz | `parvane*`, `tadarok*` | pending → po_issued | QC not hard gate |
| QC | Nabz | `qcInspectionConfig`, modal | approved/conditional/rejected | Soft only |
| Shipping / Rahsepar | Nabz | `shippingService`, `rahseparLoadingService` (679) | preparing→dispatched | Voucher optional |
| Saranjam / settlement | Nabz | service + **SaranjamTab** | archive when settled | **Gate conflict** |
| Revision / return | Domain + adapter | `revisionEngine`, `revisionService` | revisionRequired | Bridge messy |
| Activity | Split | interactions + `orderCrm` + `events[]` | append streams | No unified lifecycle |
| Calendar | Calendar | commitments + mocks | types | Mostly MOCK |
| Campaign | Kampayn | `campaignsData` | draft/active/paused | Triggers not executed |
| Users / permissions | Shirazeh + Nabz | 3 systems | roles | Ops ignore Shirazeh |

Full per-workflow detail (transitions, validation points): Canvas §1.

---

## 2. Rule inventory (highlights)

| Rule | Implementation | Owner | Risk |
|------|----------------|-------|------|
| Customer completion | `domain/customerCompletion/*` | Domain | Medium |
| Mozene lock / inquiry→quote gates | `orderStageService`, `gatewayLifecycleService`, `quotingService` | Nabz | Medium (mirrored) |
| Margin + VAT | `services/quotingService.js` | Nabz | **High** (SaranjamTab dup) |
| Gateway → Phase2 | `gatewayDecisionService` | Nabz | Medium |
| PO complete → Rahespar | `tadarokStageService` | Nabz | High (QC soft) |
| Load finalize | `rahseparLoadingService` | Nabz | Medium |
| Weight variance 0.5% | `saranjamSettlementService` | Nabz | Medium |
| Archive settlement | **SaranjamTab** vs weak service `canArchive` | **Conflict** | **Critical** |
| Revision orthogonal | `revisionEngine.ts` | Domain | Low |
| Edit ACL | `orderEditPermissions.js` | Nabz constants | **Critical** (Shirazeh unused) |
| Proforma update reset | `proformaService` | Nabz | High |
| Campaign triggers | `campaignsData` | Kampayn | High (not executed) |

---

## 3. State machines

### Runtime Order (actual)

```
Kavosh → Mozene → Pishkesh → Gateway
                              ├─ success → Parvane → Tadarok → Rahespar → Saranjam
                              └─ failed
Returns: Parvane→Pishkesh; Proforma update→Kavosh (+ revision)
Phase2: once status=success, stage jumps largely unrestricted
```

States are **centralized in config** but **transitions are scattered** across services; domain `OrderStatus` is **duplicated/implicit** relative to `stageId`.

### Company lifecycle

Seven stages in `LIFECYCLE_STAGE_ORDER`; transitions via `updateContactStage` — **no sequential policy** (hardcoded allow-list only).

---

## 4. Rule ownership problems

| Layer | Reality |
|-------|---------|
| Domain | Underused for Order |
| Nabz services | Primary rule home (good pattern, god-sized files) |
| Components | Settlement, QC forms, gateway morph, lead convert |
| Config | Stages/terms OK; some free strings |
| API | No authoritative enforcement |
| Permissions | Three ID spaces; only Nabz constants bind UI edits |

---

## 5–7. Calculations / validations / automation

See Canvas maps. Headline:

- **Calculations:** quoting SSOT candidate; settlement duplicated; no commission/inventory.
- **Validations:** many reusable `can*` / `is*Live`; archive & QC/shipping soft or conflicting.
- **Automation:** imperative `events[]` + stage advances; NotificationEngine mostly demo; campaigns not executed.

---

## 8. Hidden logic

| Unit | ~LOC | Issue |
|------|-----:|-------|
| `SaranjamTab.jsx` | 1302 | God component / duplicate settlement |
| `RahseparStagePanel.jsx` | 1175 | Ops rules in UI |
| `rahseparLoadingService.js` | 679 | God service |
| `quotingService` / `inquiryService` | 418 / 405 | Large but appropriate homes |

---

## 9. Top risks (Critical)

1. Dual Order lifecycle models  
2. Archive gate UI vs service conflict  
3. Three permission systems  
4. Settlement/VAT duplication  
5. No server-side rule enforcement  

Full Top 20: Canvas.

---

## 10. Future recommendations (not implemented)

1. Pick **one** runtime Order state machine; keep domain enum as that machine (or delete unused members).  
2. Move archive/settlement gates entirely into `saranjamSettlementService` (or domain); UI displays only.  
3. Hard-wire QC / PO / shipping as transition preconditions where product requires them.  
4. Single RBAC applied at mutation boundaries; retire parallel role constants gradually.  
5. Keep `customerCompletion` + `revisionEngine` as the pattern for new policies.  
6. Do not build a generic BPM engine before persistence + server enforcement exist.  
7. Campaign triggers need an executor or should be labeled mock-only in product.

---

## Explicit non-goals

No implementation, no service splits, no workflow redesign in this phase.
