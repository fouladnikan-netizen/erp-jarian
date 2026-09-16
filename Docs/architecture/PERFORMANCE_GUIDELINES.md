# Performance Guidelines

> **Status:** Stabilization guide — **no React.lazy, no Vite changes, no optimizations in this phase**.  
> **Related:** [14-PERFORMANCE_ARCHITECTURE_AUDIT.md](./14-PERFORMANCE_ARCHITECTURE_AUDIT.md), [ROUTING_LOADING_STRATEGY.md](./ROUTING_LOADING_STRATEGY.md), [PERFORMANCE_BUDGETS.md](./PERFORMANCE_BUDGETS.md), [DATA_RENDERING_STRATEGY.md](./DATA_RENDERING_STRATEGY.md), [PERFORMANCE_HOTSPOTS.md](./PERFORMANCE_HOTSPOTS.md)

---

## Current performance model (as-is)

### SPA loading model

| Aspect | Fact |
|--------|------|
| Delivery | Single Vite SPA — one JS chunk + one CSS chunk |
| Routes | Eager static imports from `src/App.jsx` |
| Code splitting | None (`React.lazy` / runtime `import()` unused) |
| Shell | Theme + notification providers wrap all routes |
| Heavy libs | Reachable on cold start (`@xyflow/react`, `@hello-pangea/dnd`, feature CSS) |

First paint downloads the **entire product surface**, not the active module.

### Bundle strategy

| Aspect | Fact |
|--------|------|
| Vite `manualChunks` | Absent |
| Vendor split | Absent |
| Module CSS | Side-effect imports coalesce into the single CSS file |
| Budget enforcement | None (Vite size warning only) |

Measured baseline (audit): ~**1.39 MB** JS / ~**503 KB** CSS raw (~398 KB / ~72 KB gzip). See [PERFORMANCE_BUDGETS.md](./PERFORMANCE_BUDGETS.md).

### State loading

| Aspect | Fact |
|--------|------|
| Pattern | Zustand stores; selective selectors are common |
| Contacts | `useContactsStore` — cross-module array SSOT |
| Orders | `useNabzStore` — `orders[]` aggregate; boots fetch on import |
| Persist | No Zustand `persist`; some preview payloads use `localStorage` |
| Context | Theme + NotificationEngine global; NabzOrdersProvider is a no-op shell |

### Rendering approach

| Aspect | Fact |
|--------|------|
| Concentration | Large Nabz workflow panels (1k+ LOC) dominate complexity |
| Memoization | List paths often use `useMemo`; `React.memo` rare |
| Calculations | Mostly in services; some still run in render without memo |
| Context blast | Global theme/notifications; prefer Zustand selectors over new contexts |

### Data rendering approach

| Aspect | Fact |
|--------|------|
| Lists / tables | Full-array client filter + map → full DOM |
| Pagination | Not used for CRM/orders/catalog (print “pages” ≠ data paging) |
| Virtualization | Not used |
| Dataset today | Mock / seed scale — acceptable UX; not a large-data design |

---

## Future principles (for new work — not implemented yet)

### 1. Route-based loading

- Prefer **module-level** lazy routes when funding arrives (see [ROUTING_LOADING_STRATEGY.md](./ROUTING_LOADING_STRATEGY.md)).
- Keep shell (layout, auth gate, theme) eager.
- Do **not** sneak lazy loading into boundary/docs PRs — wait for an explicit performance rollout.

### 2. Feature boundaries

- New heavy UI stays inside owning module chunks (future), not shared barrels that force early load.
- Avoid importing Ofogh DnD / Shirazeh xyflow / Nabz gods from light routes.
- Align with `.cursor/rules/jarian-frontend-boundaries.mdc`.

### 3. Data pagination

- New large collections should plan **page size** (UI and/or API) before shipping full dumps.
- See [DATA_RENDERING_STRATEGY.md](./DATA_RENDERING_STRATEGY.md) for when pagination applies.

### 4. Virtualized collections

- Tables/boards expected to exceed list limits in [PERFORMANCE_BUDGETS.md](./PERFORMANCE_BUDGETS.md) need a virtualization plan.
- Do not add virtualization libraries in drive-by PRs without an architecture decision.

### 5. Rendering isolation

- Prefer selector-based Zustand; avoid subscribing to whole arrays when one field suffices.
- Keep expensive pure calc in services / `useMemo`, not inline JSX trees.
- New components approaching god size require a performance review (see rendering Cursor rule).

---

## Explicit non-goals (this phase)

- No `React.lazy`, dynamic imports, or Vite config changes  
- No dependency adds for virtualization or analyzers  
- No component splits, CSS splits, or state architecture changes  
- No budget enforcement in CI yet  

---

## Cursor rules

- `.cursor/rules/jarian-performance-assets.mdc`
- `.cursor/rules/jarian-rendering-performance.mdc`
