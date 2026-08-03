# Performance Budgets

> **Status:** Future targets — **not enforced** in CI or build.  
> **Related:** [14-PERFORMANCE_ARCHITECTURE_AUDIT.md](./14-PERFORMANCE_ARCHITECTURE_AUDIT.md), [PERFORMANCE_GUIDELINES.md](./PERFORMANCE_GUIDELINES.md), [PERFORMANCE_HOTSPOTS.md](./PERFORMANCE_HOTSPOTS.md)

Use these numbers when reviewing PRs and planning rollouts. Do **not** fail builds on them until an explicit decision enables enforcement.

---

## Baseline (audit snapshot)

| Metric | Current (approx.) | Notes |
|--------|------------------:|-------|
| Initial JS (raw) | ~1.39 MB | Single chunk |
| Initial JS (gzip) | ~398 KB | |
| Initial CSS (raw) | ~503 KB | Single chunk; `nabz.css` dominates source |
| Initial CSS (gzip) | ~72 KB | |
| Signature PNG | ~2.2 MB | WebP alternate ~49 KB exists |
| Virtualization | None | Full-array tables |
| Route code-splitting | None | Eager `App.jsx` |

---

## Future budgets (targets)

### JavaScript — initial bundle

| Budget | Target | Meaning |
|--------|--------|---------|
| Cold-start JS (gzip) | **≤ 250 KB** | Shell + auth + first route after route-based loading |
| Any single route chunk (gzip) | **≤ 200 KB** | Prefer module-sized chunks |
| Vendor chunk (gzip) | **≤ 180 KB** | React + router + shared libs (when split) |

**Today:** exceeded on purpose (monolith). Meet targets only after [ROUTING_LOADING_STRATEGY.md](./ROUTING_LOADING_STRATEGY.md) implementation.

### CSS size

| Budget | Target | Meaning |
|--------|--------|---------|
| Critical / global CSS (gzip) | **≤ 40 KB** | Tokens, layout, shell |
| Per-module CSS (raw source) | **≤ 80 KB** guideline | Avoid another `nabz.css`-scale dump without split plan |
| Total CSS in monolith era | Monitor | Prefer not growing raw total beyond ~600 KB without lazy CSS |

### Image size

| Budget | Target | Meaning |
|--------|--------|---------|
| Single raster asset | **≤ 300 KB** preferred; **≤ 500 KB** hard review | Exceptions need documented reason |
| Signature / stamp / logo | Prefer **WebP** (or AVIF) ≤ **100 KB** | Avoid multi-MB PNG |
| Hero / marketing in-app | **≤ 400 KB** compressed | Not full-bleed marketing site rules |

### Component complexity

| Budget | Target | Meaning |
|--------|--------|---------|
| New component file | **≤ 400 LOC** preferred | Above → performance + ownership review |
| Soft alert | **≥ 500 LOC** | Register in hotspots; plan split |
| Hard review | **≥ 800 LOC** | Do not grow without extraction plan |

Aligns with [FRONTEND_COMPONENT_HOTSPOTS.md](./FRONTEND_COMPONENT_HOTSPOTS.md) — no forced splits this phase.

### List rendering limits

| Collection type | Client full-render OK | Require plan (paginate and/or virtualize) |
|-----------------|----------------------|-------------------------------------------|
| Simple list / chips | **≤ 50** rows | **> 50** |
| Data table (CRM, orders, catalog) | **≤ 100** visible rows | **> 100** or unbounded growth |
| Kanban / board cards | **≤ 80** cards total visible | **> 80** or multi-hundred pipelines |
| Line items inside one order doc | **≤ 80** lines without virtualization | **> 80** dense grids (gateway/settlement) |
| Search results | Page size **20–50** | Unbounded scroll of full corpus |

Exact UX (page size, infinite scroll vs classic pages) is product-owned; engineering must not ship unbounded full-array UIs for production-scale data without a plan in [DATA_RENDERING_STRATEGY.md](./DATA_RENDERING_STRATEGY.md).

---

## Enforcement (deferred)

| Gate | When |
|------|------|
| Document-only review | **Now** — PR authors cite budgets for new heavy assets/lists |
| Bundle size CI | After route splitting exists |
| Lighthouse / Web Vitals | Optional later |
| Coverage of list limits | With persistence + real datasets |

---

## Explicit non-goals now

- No Vite `chunkSizeWarningLimit` games to hide growth  
- No CI fail on current monolith sizes  
- No mass image recompression in this foundations phase  
