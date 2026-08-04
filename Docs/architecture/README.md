# Architecture (developer)

Internal architecture docs for Jarian ERP. **No UX redesign.** Navigation/workspace changes are deferred; this package prepares the codebase for future scale.

**Versioned:** this folder is tracked in git (`Docs/architecture/**`). Other `Docs/` packages (IA canvases, review-package, Word binaries) may remain local/ignored.

---

## How to read these docs

| Kind | How to use |
|------|------------|
| **Guidelines** (e.g. FRONTEND_*, PERFORMANCE_GUIDELINES, QUALITY_ENGINEERING) | Rules for *new* work — follow them |
| **Audits** (`NN-*.md`, `*_AUDIT.md`) | Snapshots + scores — do not treat as a refactor mandate |
| **Inventories / hotspots** | Known debt — do not “fix while here” unless tasked |
| **Future / deferred** (`02`–`04`, ROUTING_LOADING, PERSISTENCE_BOUNDARY) | Not implemented — do not build from them in drive-by PRs |

Cursor agent rules: [CURSOR_RULES.md](./CURSOR_RULES.md) · contribution: [../../CONTRIBUTING.md](../../CONTRIBUTING.md)

---

## Recommended reading order (new developers)

1. [../../README.md](../../README.md) — setup & module map  
2. [../../CONTRIBUTING.md](../../CONTRIBUTING.md) — branches, checks, PR expectations  
3. [CURSOR_RULES.md](./CURSOR_RULES.md) — mandatory theme + presentation rules  
4. [SSOT.md](./SSOT.md) — where Company / Order / ContactPerson live  
5. [ENTITY_OWNERSHIP.md](./ENTITY_OWNERSHIP.md) — who owns which entity  
6. [DOMAIN_DECISION_LOG.md](./DOMAIN_DECISION_LOG.md) — locked aggregate decisions before DB design  
6b. [COMPANY_PROFILE_HUB_SESSION_PACK.md](./COMPANY_PROFILE_HUB_SESSION_PACK.md) — Customer/Supplier profile hub session (۱۰ پرامپت: architecture + file map)  
7. [ORDER_WORKFLOW.md](./ORDER_WORKFLOW.md) — Nabz stages (as-is)  
8. [FRONTEND_ARCHITECTURE_GUIDELINES.md](./FRONTEND_ARCHITECTURE_GUIDELINES.md) — module boundaries  
8b. [UNIFIED_LIST_INFRASTRUCTURE.md](./UNIFIED_LIST_INFRASTRUCTURE.md) — Law #004 shared list infrastructure  
9. [QUALITY_ENGINEERING.md](./QUALITY_ENGINEERING.md) — lint / test / CI  
10. Then deepen as needed: domain/state/security/performance/backend audits (`07`–`16`), [PERFORMANCE_GUIDELINES.md](./PERFORMANCE_GUIDELINES.md)

---

## Contents

| Doc | Purpose |
|-----|---------|
| [CURSOR_RULES.md](./CURSOR_RULES.md) | Index of `.cursor/rules` — mandatory vs contextual |
| [01-CURRENT_INFORMATION_ARCHITECTURE.md](./01-CURRENT_INFORMATION_ARCHITECTURE.md) | Current IA (facts) |
| [02-FUTURE_NAVIGATION_VISION.md](./02-FUTURE_NAVIGATION_VISION.md) | Target navigation — **not implemented** |
| [03-WORKSPACE_STRATEGY.md](./03-WORKSPACE_STRATEGY.md) | Company/Order workspaces — **not implemented** |
| [04-ENTITY_NAVIGATION_STRATEGY.md](./04-ENTITY_NAVIGATION_STRATEGY.md) | Entity graph strategy — **not implemented** |
| [05-HARDCODED_NAVIGATION_ASSUMPTIONS.md](./05-HARDCODED_NAVIGATION_ASSUMPTIONS.md) | Inventory of magic paths / returnTo / module switches |
| [06-FUTURE_RECOMMENDATIONS.md](./06-FUTURE_RECOMMENDATIONS.md) | Medium/high-cost items deferred |
| [DOMAIN_DECISION_LOG.md](./DOMAIN_DECISION_LOG.md) | Locked domain decisions (DDL) before persistence |
| [COMPANY_PROFILE_HUB_SESSION_PACK.md](./COMPANY_PROFILE_HUB_SESSION_PACK.md) | Customer/Supplier profile hub — ۱۰-prompt architecture pack + file map |
| [UNIFIED_LIST_INFRASTRUCTURE.md](./UNIFIED_LIST_INFRASTRUCTURE.md) | Law #004 — shared lists (sort / filter / resize / pagination) |
| [PROFILE_LAYOUT_GUIDELINES.md](./PROFILE_LAYOUT_GUIDELINES.md) | Required layout for **new** profile pages |
| [07-DOMAIN_MODEL_AUDIT.md](./07-DOMAIN_MODEL_AUDIT.md) | DDD domain audit — entities, aggregates, policies, scores |
| [08-STATE_ARCHITECTURE_AUDIT.md](./08-STATE_ARCHITECTURE_AUDIT.md) | State management audit — stores, SSOT, coupling, scale |
| [09-BUSINESS_RULES_WORKFLOW_AUDIT.md](./09-BUSINESS_RULES_WORKFLOW_AUDIT.md) | Business rules & workflow audit — machines, calcs, gates |
| [10-DATA_ARCHITECTURE_AUDIT.md](./10-DATA_ARCHITECTURE_AUDIT.md) | Data architecture & persistence readiness — no schema |
| [11-SECURITY_IDENTITY_AUDIT.md](./11-SECURITY_IDENTITY_AUDIT.md) | Security, identity, RBAC, multi-user readiness |
| [12-FRONTEND_ARCHITECTURE_AUDIT.md](./12-FRONTEND_ARCHITECTURE_AUDIT.md) | Frontend structure, coupling, DS, routing, performance |
| [13-TESTING_QUALITY_AUDIT.md](./13-TESTING_QUALITY_AUDIT.md) | Testing maturity, CI gaps, quality gates |
| [14-PERFORMANCE_ARCHITECTURE_AUDIT.md](./14-PERFORMANCE_ARCHITECTURE_AUDIT.md) | Bundle, render, data, state, assets — scale readiness |
| [15-DX_MAINTAINABILITY_AUDIT.md](./15-DX_MAINTAINABILITY_AUDIT.md) | Developer experience, onboarding, maintainability, team scale |
| [16-BACKEND_READINESS_AUDIT.md](./16-BACKEND_READINESS_AUDIT.md) | Backend boundary, APIs, repos, DTOs, TX, multi-user readiness |
| [QUALITY_ENGINEERING.md](./QUALITY_ENGINEERING.md) | Quality foundation — scripts, CI, test ownership, coverage targets |
| [FRONTEND_ARCHITECTURE_GUIDELINES.md](./FRONTEND_ARCHITECTURE_GUIDELINES.md) | Current FE patterns + future ownership / deps |
| [FRONTEND_COMPONENT_HOTSPOTS.md](./FRONTEND_COMPONENT_HOTSPOTS.md) | God components ≥500 LOC — no splits this phase |
| [ROUTING_LOADING_STRATEGY.md](./ROUTING_LOADING_STRATEGY.md) | Future lazy loading — not implemented |
| [SHARED_UI_INVENTORY.md](./SHARED_UI_INVENTORY.md) | Shared primitives + missing Modal/Form/Drawer |
| [IDENTITY_MODEL.md](./IDENTITY_MODEL.md) | Current vs future identity (User → Session → Actor) |
| [AUTHORIZATION_MODEL.md](./AUTHORIZATION_MODEL.md) | Permission systems inventory + future User/Role/Permission/Policy |
| [ROLE_MATRIX.md](./ROLE_MATRIX.md) | Target product roles — responsibilities & permissions |
| [DATA_ACCESS_POLICY.md](./DATA_ACCESS_POLICY.md) | Future OWNER/TEAM/DEPARTMENT/ADMIN OVERRIDE scopes |
| [SECURITY_RISK_REGISTER.md](./SECURITY_RISK_REGISTER.md) | Critical / High / Medium security risks |
| [DATA_OWNERSHIP_MODEL.md](./DATA_OWNERSHIP_MODEL.md) | Aggregate ownership → storage → future persistence |
| [ENTITY_IDENTITY_AUDIT.md](./ENTITY_IDENTITY_AUDIT.md) | ID patterns classified Safe / Temporary / Migration risk |
| [PERSISTENCE_BOUNDARY.md](./PERSISTENCE_BOUNDARY.md) | Future UI → services → domain → repository → DB |
| [DATA_MIGRATION_RISKS.md](./DATA_MIGRATION_RISKS.md) | Critical / High / Medium migration risk register |
| [ORDER_WORKFLOW.md](./ORDER_WORKFLOW.md) | As-is Order stages — purpose, entry/exit, risks |
| [BUSINESS_RULE_OWNERSHIP.md](./BUSINESS_RULE_OWNERSHIP.md) | Rule → location → owner → future owner |
| [ORDER_STATUS_AUDIT.md](./ORDER_STATUS_AUDIT.md) | Duplicate status models — inventory only |
| [BUSINESS_LOGIC_HOTSPOTS.md](./BUSINESS_LOGIC_HOTSPOTS.md) | God components/services — no splits this phase |
| [ENTITY_OWNERSHIP.md](./ENTITY_OWNERSHIP.md) | Per-entity owner / storage / lifecycle / future |
| [AGGREGATE_BOUNDARIES.md](./AGGREGATE_BOUNDARIES.md) | Company & Order boundaries; embedded vs future roots |
| [SSOT.md](./SSOT.md) | Duplicated concepts — current vs recommended source |
| [DOMAIN_DECISION_LOG.md](./DOMAIN_DECISION_LOG.md) | Locked domain decisions before database / API design |
| [DOMAIN_DECISION_LOG.md](./DOMAIN_DECISION_LOG.md) | Locked domain decisions before database / API design |

## Performance (governance — no runtime changes)

| Doc | Purpose |
|-----|---------|
| [PERFORMANCE_GUIDELINES.md](./PERFORMANCE_GUIDELINES.md) | Current model + future principles (route load, isolation, lists) |
| [PERFORMANCE_BUDGETS.md](./PERFORMANCE_BUDGETS.md) | Future JS/CSS/image/LOC/list budgets — **not enforced** |
| [DATA_RENDERING_STRATEGY.md](./DATA_RENDERING_STRATEGY.md) | When to paginate / virtualize / server-query |
| [PERFORMANCE_HOTSPOTS.md](./PERFORMANCE_HOTSPOTS.md) | Registry of bundle/CSS/panel/list/asset risks — no fixes |
| [14-PERFORMANCE_ARCHITECTURE_AUDIT.md](./14-PERFORMANCE_ARCHITECTURE_AUDIT.md) | Audit scorecard & scale verdict |
| [ROUTING_LOADING_STRATEGY.md](./ROUTING_LOADING_STRATEGY.md) | Future lazy-loading rollout — not implemented |

Cursor rules: `.cursor/rules/jarian-performance-assets.mdc`, `.cursor/rules/jarian-rendering-performance.mdc`

## Related package

Product IA audits (Canvas exports): [`../ia/README.md`](../ia/README.md) — may be local-only / gitignored.

## Code kits (low-risk, shipped)

- `src/domain/identity/` — shared ID generation for **new** records only
- `src/domain/party/` — party vocabulary, lifecycle stages, naming map
- `src/components/profileLayout/` — structural profile primitives (no visual CSS)
- `src/components/contactPerson/` — ContactPerson SSOT UI
- `src/domain/customerCompletion/` — completion policy
- `src/components/customerCompletion/` — completion gate UI

## Explicit non-goals (this phase)

- Domain sidebar / workspace chrome / route rewrites / menu restructuring / context switching
- Database / Prisma / repository redesign / aggregate split / Activity or Opportunity refactor
- Order lifecycle rewrite, status model merge, workflow engine, VAT/settlement/permission moves
- Replacing Zustand; implementing persistence layers described in PERSISTENCE_BOUNDARY.md
- Auth providers, RBAC merge, permission matrix changes, Identity Context implementation
- Frontend: Nabz rewrite, component splits, React.lazy, folder moves, import graph cleanup
- Quality: TypeScript conversion, React Testing Library, E2E, coverage thresholds, mass Prettier rewrite
- Performance: React.lazy, Vite splitting, virtualization, asset recompression, budget CI enforcement
- DX tooling: Husky, Commitlint, CODEOWNERS (deferred)
