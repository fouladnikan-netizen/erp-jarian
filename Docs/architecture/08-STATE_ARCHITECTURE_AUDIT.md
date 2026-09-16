# State Architecture Audit

> **Status:** Audit only — no redesign, no refactor.  
> **Canvas:** open [`jarian-state-architecture-audit.canvas.tsx`](/Users/ehsanmohammadi/.cursor/projects/Users-ehsanmohammadi-Documents-ERP-Jaryan/canvases/jarian-state-architecture-audit.canvas.tsx) beside chat in Cursor  
> **Overall State Score: 3.9 / 10**

## Scale verdict

| Target | Fit today? |
|--------|------------|
| Current product (~8 real modules, fat Order + Company) | Yes, with known debt |
| 20 modules / 300 screens / 1000 features | **No** — missing server-state cache, domain persistence, Activity/Product SSOTs, auth-bound actor, enforced RBAC |

---

## Scorecard

| Dimension | Score |
|-----------|------:|
| State Architecture | 4.0 |
| Store Design | 5.0 |
| Ownership | 3.5 |
| SSOT | 4.0 |
| Coupling | 4.5 |
| Scalability | 2.5 |
| Maintainability | 3.5 |
| Complexity | 4.0 |
| **Overall** | **3.9** |

---

## 1. State source inventory (summary)

### Zustand (6 + 1 dead alias)

| Location | Purpose | Owner | Scope | Lifetime |
|----------|---------|-------|-------|----------|
| `src/stores/useContactsStore.js` | Company aggregate SSOT | Shared (Kanoon primary UX) | App-global | Session memory |
| `src/modules/nabz/store/useNabzStore.ts` | Order list + selection + draft | Nabz | App-global | Session; boot `fetchOrders` |
| `src/modules/shirazeh/users/store/usersStore.js` | Mock users + form modal | Shirazeh | Module | Session |
| `src/modules/shirazeh/security/store/permissionsStore.js` | Permission matrix drafts | Shirazeh | Module | Session |
| `src/modules/shirazeh/security/organization/store/organizationStore.js` | Org tree working copy | Shirazeh | Module | Session |
| `src/modules/shirazeh/integrations/store/integrationUIStore.js` | Integration UI drafts | Shirazeh | Module | Session |
| `src/modules/kanoon/store/kanoonStore.js` | Re-export alias | — | — | Unused |

### React Context (3)

| Location | Purpose | Lifetime |
|----------|---------|----------|
| `src/theme/ThemeContext.jsx` | Theme + localStorage | App |
| `src/context/NotificationEngineContext.jsx` | Toast queue | App |
| `src/modules/nabz/NabzOrdersContext.jsx` | **No-op provider**; hook facades `useNabzStore` | — |

### Other

| Kind | Examples |
|------|----------|
| Page `useState` | Vitrin catalog, Kampayn campaigns/surveys, calendar filters |
| Refs | Notification timers; form focus |
| Singletons | `CURRENT_USER`, `apiClient`, identity `sequence`, registries |
| Config registries | permissions, integrations, supplier types, moduleData placeholders |
| localStorage | auth, theme, sidebar, column widths, print previews |
| Server cache lib | **None** (no React Query / SWR) |
| useReducer | **None** |

Full tables, graphs, and Top 20 risks: open the Canvas.

---

## 2. SSOT (business concepts)

| Concept | Real source | Duplicates / copies |
|---------|-------------|---------------------|
| Current User | `authSession` localStorage | Nabz `CURRENT_USER` constant |
| Company | `useContactsStore` | Seed `contactsData` at boot |
| Order | `useNabzStore.orders` | Mock seed on refetch; most writes via `setOrders` not repository |
| Products | Vitrin page state | Order line snapshots |
| Supplier | Company `entityType=supplier` | — (facade must use store) |
| Activity | **Split** | Company interactions + Order CRM + پویش stub + calendar mocks |
| Notifications | NotificationEngine | Possible parallel toast helpers |
| Permissions | Shirazeh matrix + registry | **Not enforced** on Nabz/Ofogh |
| Theme | ThemeContext | — |
| Calendar | Derived contacts + MOCK_* | Dual live/mock |
| Opportunity | Company `lifecycle_stage` | Conceptual only |

---

## 3. Store inventory (highlights)

- **useContactsStore** — growing party hub; public CRUD for contacts/persons/interactions/stages; cross-module `getState()` from Nabz facades and gates.
- **useNabzStore** — thin shell; **Order document** is the complexity (god aggregate payload). API: `fetchOrders`, `setOrders`, `selectOrder`, `updateOrderStatus`, draft helpers. Depends on `OrderRepository`.
- Shirazeh stores — isolated UI/working copies; not ops-critical.

---

## 4. Ownership conflicts

| Entity | Conflict |
|--------|----------|
| Activity | Unresolved three-way ownership |
| Opportunity | Ofogh UX vs Company data (view, not root) |
| Products | Vitrin local vs Order snapshots |
| Permissions | Configured in Shirazeh, ignored in ops |
| Current User | Auth session vs hardcoded Nabz actor |
| Shipment / Documents / Payments | Embedded in Order — no separate owners |

---

## 5. Cross-module communication

- **Contacts hub:** Ofogh, Kanoon, Calendar, Nabz `customers.js` / `suppliers.js` (`getState`).
- **Orders facade:** Kanoon profile + Ofogh lead modal via `useNabzOrders()` (broad subscription).
- **No circular Zustand store deps** detected.
- **Prop drilling** inside Order profile panel trees.
- **Dead:** `NabzOrdersProvider` no-op; `useKanoonStore` unused.

---

## 6. Component-held business state

Heavy logic in UI (samples): `SaranjamTab.jsx` (~1300 LOC settlement), `CustomerProfilePage.jsx` (~1100), stage panels (Tadarok/Rahsepar), Vitrin/Kampayn page arrays. Prefer services/domain for rules; many already call `*Service.js` correctly.

---

## 7. Business rules placement

| Area | Shape |
|------|--------|
| Customer Completion | Centralized — `domain/customerCompletion` |
| Quoting / margin | Mostly centralized — `quotingService` |
| Stage / gateway / shipping / tadarok | Scattered across ~20 Nabz services (module-local OK) |
| Settlement VAT / receipts | **Duplicated** — service + SaranjamTab |
| Permissions | Registry centralized; **application scattered/missing** |
| Revision | Centralized — `domain/order/revisionEngine` |

---

## 8. Server state outlook

| Should be API | Mock today | Persisted today |
|---------------|------------|-----------------|
| Company, Order, Product, User, Permissions, Activity | contactsData, ordersData, catalog, campaigns, org tree, activityLog | auth, theme, sidebar, col widths, print preview keys only |

Order has a repository switch (`VITE_USE_MOCK_API`); most mutations never round-trip.

---

## 9. Top risks (ranked)

See Canvas table (Critical → Low). Headline Critical: no domain persistence, no server-state layer, Order write dual-path, Activity split.

---

## 10. Future state architecture (recommendation only)

1. Keep Zustand for UI/session + aggregate working copies.  
2. Add server-state cache (e.g. React Query) for Company / Order / Product / User / Permissions.  
3. One write API per aggregate; Nabz services apply pure transforms then persist.  
4. Bind actor to `authSession`; enforce permissions at route/mutation boundaries.  
5. Unify Activity ownership; Product store + line snapshot policy.  
6. Do **not** explode into one store per screen; do **not** split Order aggregates before persistence.

---

## Explicit non-goals of this document

No implementation, no store rewrite, no repository layer expansion, no React Query adoption in this phase.
