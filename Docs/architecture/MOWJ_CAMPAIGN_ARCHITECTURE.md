# Mowj Campaign Architecture

**Module:** موج (`src/modules/mowj`)  
**Status:** Stabilized for production persistence (in-memory SSOT today)  
**Non-goals:** No channel provider send, no ad ROI, no ownership of Contact / Lead / Order / Task aggregates.

---

## 1. Purpose

Mowj owns **campaign orchestration**: define campaigns, audiences, templates, automation decisions, internal execution intents, and attribution of ERP outcomes.

**Executive dashboards are owned by آینه (Aineh).** Mowj exposes analytics via `services/campaignAnalyticsContract.js` (`getCampaignDashboard`, attribution APIs). Do not mount dashboard pages under `/mowj`.

Mowj does **not** own operational CRM/ERP records. It references them through contracts and facades.

---

## 2. Layer map

```
JSX (pages / drawers)
  → services/*Facade          (presentation + orchestration API)
    → adapters/*runtime       (composition root, store bump, port wiring)
      → domain (ports + engines)   (rules, no storage / no React)
        → repositories        (in-memory today → DB later)
```

### Dependency rules

| From | May import | Must not import |
|------|------------|-----------------|
| `domain/` | identity helpers, own ports/types | React, `store/`, `adapters/`, `repositories/`, other modules’ stores |
| `repositories/` | domain normalize/types | React, UI, other modules’ stores |
| `adapters/` | domain + repositories + **facades** of other modules | domain engines calling stores directly |
| `services/` | adapters + repositories + domain | JSX |
| JSX | services / domain enums for display only | repositories, other modules’ stores |

`useMowjStore` is a **version bump** only — not campaign SSOT.

---

## 3. Domain responsibility

| Concern | Location |
|---------|----------|
| Campaign normalize + draft | `domain/campaign.normalize.js` |
| Lifecycle transitions | `domain/campaign.lifecycle.js` |
| Action ↔ template rules | `domain/action.rules.js` |
| Triggers / matching | `domain/triggerEvaluator.js`, `campaignMatcher.js` |
| Automation (decision) | `domain/campaignAutomationEngine.js` |
| Executor (consume intent) | `domain/campaignExecutor.js` + `executorRegistry.js` |
| Channel adapters (mock) | `domain/channelExecutor*` |
| Attribution + KPI calc | `domain/campaignAnalytics.js`, `campaignKpiCalculator.js` |
| Dashboard aggregates | `domain/campaignDashboard.js` |
| Runtime actor / Jalali defaults | `domain/runtimeDefaults.js` (no Nabz coupling) |

Business rules live in **domain**. Facades format for UI. JSX renders.

---

## 4. Data ownership

| Aggregate | Owner | Mowj access |
|-----------|-------|-------------|
| Contact / Company | **Kanoon** | Read via `AudienceDataPort` / `erpAudiencePort` |
| Lead / Opportunity | **Ofogh** | Event adapters + audience filters (no mutate) |
| Order / Shipment | **Nabz** | Event adapters + audience order filters (no mutate) |
| Task / Commitment | **Pooyesh** | Write only via `PooyeshTaskPort` → `pooyesh/taskFacade` |
| Campaign / Template / Segment / Snapshot / Execution / Intent / Result / Attribution | **Mowj** | Full CRUD inside Mowj repositories |

### Identity prefixes

Campaign-related IDs use `ENTITY_ID_PREFIX.CAMPAIGN` (`cmp-*` and related). Cross-module refs use `domain/moduleRefs.contracts.js`.

---

## 5. Integration contracts

| Port / Contract | Purpose |
|-----------------|---------|
| `AudienceDataPort` | Resolve audience members from ERP (read-only) |
| `PooyeshTaskPort` | Create tasks in Pooyesh without store imports in domain |
| `ChannelExecutor` | Pluggable channel send — **mock only** today |
| `CampaignAnalyticsRepository` | Persist attributions |
| `ExecutionResultRepository` | Persist intent outcomes |
| `ChannelExecutionRepository` | Persist channel attempts/results |
| `CampaignRepository` | Campaign aggregate persistence |
| `CampaignExecutionRepository` | Campaign run persistence |
| `ExecutionIntentRepository` | Automation intents |
| `AudienceSnapshotRepository` | Frozen audience snapshots |
| `TemplateRepository` / `AudienceRepository` | Templates & segments |

Event shapes: `domain/events.contracts.js`.  
Adapters (Nabz / Ofogh / Pooyesh): `adapters/events/*` — convert ERP payloads → Mowj domain events.

### Current wiring note

`evaluateCampaignAutomation` + `executeCampaignIntent` are implemented and tested. ERP producers are **not** yet hooked to call evaluate on every OrderDelivered / LeadCreated / TaskCompleted. Until wired, automation is **decision-ready**, not live end-to-end in the shell. This is an extension point, not a domain gap.

---

## 6. Automation pipeline

```
ERP event (adapter)
  → TriggerEvaluator
  → CampaignMatcher (READY / RUNNING …)
  → CampaignAutomationEngine.evaluate → ExecutionIntent (PENDING)
  → CampaignExecutor.execute (separate call / future scheduler)
      → selectExecutor(actionType)
      → CREATE_TASK → PooyeshTaskPort
      → BROADCAST / SURVEY / PHYSICAL → ChannelExecutor (mock)
  → ExecutionResult recorded
```

Attribution of business outcomes is separate: `attributeCampaignEvent` → analytics repository → `calculateCampaignKpiSummary` (single SSOT for KPI math).

---

## 7. Analytics rules

1. Runtime KPIs come **only** from attribution rows.  
2. No fake success metrics; empty → `hasData: false` / null counts / «داده‌ای برای گزارش وجود ندارد».  
3. No advertising cost / ROI.  
4. Dashboard aggregates **must not** mix `CampaignExecution` run counters with `ExecutionResult` intent counters (`executions` vs `intentResults` on overview).  
5. Portfolio counts (`useCampaignKpis`) are campaign-status inventory — not attribution KPIs.  
6. **UI ownership:** Aineh renders executive dashboards by calling `campaignAnalyticsContract` (`getCampaignDashboard`, attribution). Mowj has no `/mowj/dashboard` page.

---

## 8. Persistence readiness

Today: module-level in-memory repositories + port interfaces.

To swap to DB:

1. Implement the same port methods against an API/DB.  
2. Wire adapters/`create*Repository` factories in runtimes.  
3. Keep domain engines unchanged (they already depend on ports where engines exist).  
4. Keep `useMowjStore.bump()` as UI invalidation signal.

---

## 9. Future extension points

| Extension | How |
|-----------|-----|
| Wire ERP producers | Call `evaluateCampaignAutomation(adapt*(payload))` from Nabz/Ofogh/Pooyesh facades |
| Intent scheduler | Poll PENDING intents → `executeCampaignIntent` |
| Real SMS/Email/WhatsApp | Register provider `ChannelExecutor` implementations (replace mocks) |
| Session actor / clock | Inject into `runtimeDefaults` from Shirazeh identity |
| Persist | Replace in-memory repo factories behind existing ports |
| Auto-attribution | On ERP events, optionally `attributeCampaignEvent` for matched campaigns |

---

## 10. Test matrix (stabilization)

| Area | Coverage location |
|------|-------------------|
| Lifecycle graph | `__tests__/campaignCore.test.js` |
| Automation decision | `__tests__/automationEngine.test.js` |
| Executor + failures | `__tests__/executorLayer.test.js`, `pooyeshTaskIntegration.test.js` |
| Channel adapters | `__tests__/channelAdapter.test.js` |
| Attribution / empty KPI | `__tests__/campaignAnalytics.test.js` |
| Dashboard / ranking / empty | `__tests__/campaignDashboard.test.js` |
| Audience | `__tests__/audience*.test.js` |
| Templates / actions | `__tests__/templateManagement.test.js`, `actionTemplate.test.js` |

Known gaps (documented, not blocking persistence): full ERP→evaluate→execute→attribute E2E in app shell; SurveyBuilder still loosely coupled to Campaign Template SSOT.

---

## 11. Related docs

- [ENTITY_OWNERSHIP.md](./ENTITY_OWNERSHIP.md) — Campaign owner = Mowj  
- [BUSINESS_RULE_OWNERSHIP.md](./BUSINESS_RULE_OWNERSHIP.md) — automation / executor ownership  
- [DATA_OWNERSHIP_MODEL.md](./DATA_OWNERSHIP_MODEL.md)  
- [PERSISTENCE_BOUNDARY.md](./PERSISTENCE_BOUNDARY.md)  
- [SSOT.md](./SSOT.md)
