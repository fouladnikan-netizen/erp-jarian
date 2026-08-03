# Future Architectural Recommendations

Items identified in IA / entity-navigation audits that are **medium or high migration cost**.  
**Do not implement in the current phase** (product decision: no nav/workspace/route rewrite).

| ID | Recommendation | Cost | Blocked by / notes |
|----|----------------|------|--------------------|
| F1 | Domain-grouped sidebar | High | Product schedule; touches shell |
| F2 | Company + Order workspace chrome | High | Needs route dual-run |
| F3 | Entity-first URLs (`/companies/:id`) | High | Breaks bookmarks if rushed |
| F4 | Secondary nav for all mature modules | Medium | Nabz/Ofogh structure |
| F5 | Unify Activity under پویش SSOT | Medium | Data model + Ofogh/Kanoon/Nabz embeds |
| F6 | Opportunity as addressable facet URL | Medium | Today modal-only |
| F7 | Fix `/ofoq` vs `/ofogh` return typo | Low–Medium | One-line but verify deep links |
| F8 | Indexed Omni (not static seeds) | Medium | Needs search index |
| F9 | Migrate Order profile to `profileLayout` slots | Medium | Complex chrome/actions |
| F10 | Retire orphan `ContactProfileDrawer` / unused Order header | Low | Dead code cleanup — optional later |
| F11 | Supplier list → `useContactsStore` (if still seed-bypassing) | Low–Medium | Data SSOT, not nav — **facade fixed**; keep monitoring |
| F12 | Replace `returnTo` with workspace stack | High | After F2 |
| F13 | Unify OrderStatus (domain) with Nabz stage/tab model | Medium–High | Dual runtime; bridge only for now — see [SSOT.md](./SSOT.md) |
| F14 | Unify Activity under پویش (Company + Order streams) | Medium | Same as F5; ownership in [ENTITY_OWNERSHIP.md](./ENTITY_OWNERSHIP.md) |
| F15 | Extract Shipment / Payment / Invoice aggregates | High | Needs DB + Order API; see [AGGREGATE_BOUNDARIES.md](./AGGREGATE_BOUNDARIES.md) |
| F16 | Product catalog store + line snapshot policy | Medium | Vitrin local state today |
| F17 | Opportunistic replace remaining `Date.now()` event ids with `createNumericId` | Low | Safe when touching those files |
| F18 | Unify settlement archive gates (UI vs `saranjamSettlementService`) | Medium | See [BUSINESS_RULE_OWNERSHIP.md](./BUSINESS_RULE_OWNERSHIP.md) — **do not** move in doc-only phases |
| F19 | Single Order header status machine | Medium–High | See [ORDER_STATUS_AUDIT.md](./ORDER_STATUS_AUDIT.md) — inventory only for now |
| F20 | Persist Company + Order (full repository writes) | High | See [PERSISTENCE_BOUNDARY.md](./PERSISTENCE_BOUNDARY.md), [DATA_MIGRATION_RISKS.md](./DATA_MIGRATION_RISKS.md) — **not now** |
| F21 | Resolve identity collisions (`cp`, number↔string) before DB | Medium | [ENTITY_IDENTITY_AUDIT.md](./ENTITY_IDENTITY_AUDIT.md) |

## Done / low-risk this phase

- Profile layout primitives: `src/components/profileLayout/`
- Architecture docs under `Docs/architecture/`
- Domain prep docs: [ENTITY_OWNERSHIP.md](./ENTITY_OWNERSHIP.md), [AGGREGATE_BOUNDARIES.md](./AGGREGATE_BOUNDARIES.md), [SSOT.md](./SSOT.md)
- Business-rule stabilization docs: [ORDER_WORKFLOW.md](./ORDER_WORKFLOW.md), [BUSINESS_RULE_OWNERSHIP.md](./BUSINESS_RULE_OWNERSHIP.md), [ORDER_STATUS_AUDIT.md](./ORDER_STATUS_AUDIT.md), [BUSINESS_LOGIC_HOTSPOTS.md](./BUSINESS_LOGIC_HOTSPOTS.md)
- Persistence readiness docs: [DATA_OWNERSHIP_MODEL.md](./DATA_OWNERSHIP_MODEL.md), [ENTITY_IDENTITY_AUDIT.md](./ENTITY_IDENTITY_AUDIT.md), [PERSISTENCE_BOUNDARY.md](./PERSISTENCE_BOUNDARY.md), [DATA_MIGRATION_RISKS.md](./DATA_MIGRATION_RISKS.md)
- Security foundations: [IDENTITY_MODEL.md](./IDENTITY_MODEL.md), [AUTHORIZATION_MODEL.md](./AUTHORIZATION_MODEL.md), [ROLE_MATRIX.md](./ROLE_MATRIX.md), [DATA_ACCESS_POLICY.md](./DATA_ACCESS_POLICY.md), [SECURITY_RISK_REGISTER.md](./SECURITY_RISK_REGISTER.md)
- Frontend foundations: [FRONTEND_ARCHITECTURE_GUIDELINES.md](./FRONTEND_ARCHITECTURE_GUIDELINES.md), [FRONTEND_COMPONENT_HOTSPOTS.md](./FRONTEND_COMPONENT_HOTSPOTS.md), [ROUTING_LOADING_STRATEGY.md](./ROUTING_LOADING_STRATEGY.md), [SHARED_UI_INVENTORY.md](./SHARED_UI_INVENTORY.md)
- Quality foundation: [QUALITY_ENGINEERING.md](./QUALITY_ENGINEERING.md), `.github/workflows/quality.yml`, `npm run quality`, domain/module `__tests__` islands, `.cursor/rules/jarian-quality.mdc`
- Performance foundations: [PERFORMANCE_GUIDELINES.md](./PERFORMANCE_GUIDELINES.md), [PERFORMANCE_BUDGETS.md](./PERFORMANCE_BUDGETS.md), [DATA_RENDERING_STRATEGY.md](./DATA_RENDERING_STRATEGY.md), [PERFORMANCE_HOTSPOTS.md](./PERFORMANCE_HOTSPOTS.md), `.cursor/rules/jarian-performance-assets.mdc`, `.cursor/rules/jarian-rendering-performance.mdc`
- DX foundations: root [README.md](../../README.md), [CONTRIBUTING.md](../../CONTRIBUTING.md), `.github/pull_request_template.md`, versioned `Docs/architecture/**`, [CURSOR_RULES.md](./CURSOR_RULES.md), all `.cursor/rules/*.mdc` tracked
- Cursor guardrails: `.cursor/rules/jarian-business-rules.mdc`, `.cursor/rules/jarian-data-architecture.mdc`, `.cursor/rules/jarian-security.mdc`, `.cursor/rules/jarian-frontend-boundaries.mdc`, `.cursor/rules/jarian-ui-architecture.mdc`, `.cursor/rules/jarian-quality.mdc`, `.cursor/rules/jarian-performance-assets.mdc`, `.cursor/rules/jarian-rendering-performance.mdc` (future development only)
- Shared identity: `src/domain/identity/`
- Party constants / naming: `src/domain/party/`
- Hardcoded nav inventory: [05-HARDCODED_NAVIGATION_ASSUMPTIONS.md](./05-HARDCODED_NAVIGATION_ASSUMPTIONS.md)
- Guidelines for new profiles: [PROFILE_LAYOUT_GUIDELINES.md](./PROFILE_LAYOUT_GUIDELINES.md)
- Reference adoption: Company profile uses `ProfilePageShell` + `ProfileTabs` (same classes/look)
