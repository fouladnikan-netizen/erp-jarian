# Performance Architecture Audit

> **Status:** Audit only — no optimizations, no lazy loading, no dependency changes.  
> **Canvas:** open [`jarian-performance-architecture-audit.canvas.tsx`](/Users/ehsanmohammadi/.cursor/projects/Users-ehsanmohammadi-Documents-ERP-Jaryan/canvases/jarian-performance-architecture-audit.canvas.tsx) beside chat  
> **Related:** [ROUTING_LOADING_STRATEGY.md](./ROUTING_LOADING_STRATEGY.md), [12-FRONTEND_ARCHITECTURE_AUDIT.md](./12-FRONTEND_ARCHITECTURE_AUDIT.md), [FRONTEND_COMPONENT_HOTSPOTS.md](./FRONTEND_COMPONENT_HOTSPOTS.md), [PERFORMANCE_GUIDELINES.md](./PERFORMANCE_GUIDELINES.md), [PERFORMANCE_HOTSPOTS.md](./PERFORMANCE_HOTSPOTS.md)  
> **Performance Maturity Score: 3.0 / 10**

## Scale verdict

| Need | Fit? |
|------|------|
| Current solo / small-team prototype (mock datasets) | **Marginal–OK** — selective Zustand + list `useMemo` keep UX acceptable |
| 20 modules / 300 screens / 1000 features | **No** — eager monolith bundle + CSS gravity |
| Large business datasets (thousands of contacts/orders/lines) | **No** — full-array tables, no pagination/virtualization |

---

## Scorecard

| Dimension | Score | Notes |
|-----------|------:|-------|
| Application Loading | 2.0 | Single JS+CSS; zero `React.lazy` / `import()` |
| Rendering Performance | 3.0 | God panels 1.1–1.3k LOC; sparse `React.memo` |
| Data Performance | 2.5 | Client filter/map entire arrays; no virtual lists |
| State Performance | 4.5 | Selective Zustand common; contacts/orders mega-arrays |
| Asset Performance | 2.5 | ~503 KB CSS; 2.2 MB signature PNG; font gaps |
| Perceived UX | 3.5 | Empty states + ad-hoc spinners; no skeletons; one ErrorBoundary |
| **Overall** | **3.0** | Prototype-scale posture; not enterprise-dataset ready |

---

## 1. Current Performance Architecture Map

```
index.html
  └─ Theme FOUC script + single CSS + single JS
       └─ main.jsx (ThemeProvider)
            └─ App.jsx (NotificationEngine + NabzOrdersProvider shell)
                 └─ Eager static imports of ALL feature pages
                      ├─ Kanoon / Ofogh / Nabz / Vitrin / Kampayn / …
                      ├─ Shirazeh (xyflow reachable)
                      ├─ Ofogh kanban (@hello-pangea/dnd reachable)
                      └─ Module CSS side-effects → one CSS chunk

Zustand (selective selectors)
  ├─ useContactsStore  ← cross-module SSOT array
  └─ useNabzStore      ← orders[] aggregate (boots fetch on import)

Lists / tables
  └─ Full-array render + client filter (Kanoon, Nabz, Vitrin, Ofogh)
       └─ No react-window / @tanstack/react-virtual / pageSize
```

| Layer | Mechanism | Enforced? |
|-------|-----------|-----------|
| Route code-splitting | None | Docs defer (`ROUTING_LOADING_STRATEGY.md`) |
| Vendor chunks | None (`manualChunks` absent) | — |
| Bundle budget | None | Vite warns >500 KB |
| List virtualization | None | — |
| Image budget | None | Large PNG shipped |
| Perf CI / Lighthouse | None | — |

### Measured production artifacts (`dist/`, post-build)

| Asset | Raw | gzip (≈) |
|-------|----:|---------:|
| `index-*.js` | **~1.39 MB** | **~398 KB** |
| `index-*.css` | **~503 KB** | **~72 KB** |
| `signature/sign.png` | **~2.2 MB** | — |
| `nikan2-*.jpg` | **~1.23 MB** | — |
| Entry model | **1** script + **1** stylesheet | No async chunks |

### Loading facts

| Fact | Evidence |
|------|----------|
| Routes | `src/App.jsx` — ~20+ routes, all static imports |
| `React.lazy` / `Suspense` | **0** under `src/` |
| Runtime `import()` | **0** |
| Vite `manualChunks` | **Absent** |
| Heavy deps in graph | `@xyflow/react`, `@hello-pangea/dnd`, `lucide-react`, `zustand`, `axios`, `zod` |

---

## 2. Rendering Performance

### God components (render cost concentration)

| File | ~LOC | Risk |
|------|-----:|------|
| `SaranjamTab.jsx` | 1302 | Settlement UI + rules in one tree |
| `RahseparStagePanel.jsx` | 1175 | Ops orchestration |
| `CustomerProfilePage.jsx` | 1105 | Page god |
| `QuickInquiryModal.jsx` | 961 | Modal god |
| `GatewayMorphTable.jsx` | 888 | Dense table god |

### Re-render posture

| Pattern | Assessment |
|---------|------------|
| Zustand selectors | **Strength** — dominant; bare `useStore()` rare |
| `useNabzOrders()` | Broader subscription (orders + draft + setters) |
| `React.memo` | ~unused outside org-canvas nodes |
| `useMemo` on list paths | Present on Kanoon/Nabz/Ofogh filters |
| Unmemoized calc example | `calculateQuotingPreview(order)` in items tab (sibling surfaces memoize) |
| Contexts | Theme + NotificationEngine global; NabzOrdersProvider is no-op shell |

---

## 3. Data Performance

| Surface | Behavior | Scale readiness |
|---------|----------|-----------------|
| Kanoon table | Full contacts filter/sort | Mock (~8) OK; thousands fail |
| Nabz order table | Full orders + column filters | Same |
| Vitrin | Full catalog filter | Same |
| Ofogh board | Bucket all contacts by stage | Same + DnD cost |
| Gateway / stage tables | Dense line grids | Line growth risk |
| Pagination | **None** (print “pages” ≠ data paging) | Missing |
| Virtualization | **None** | Missing |
| Server-side search | Not used for CRM lists | Missing |

---

## 4. State Performance

| Store | Role | Perf note |
|-------|------|-----------|
| `useContactsStore` | Cross-module company SSOT | Any `contacts` replace notifies all selectors of that slice |
| `useNabzStore` | Orders aggregate | Array updates fan out to all `orders` subscribers; `fetchOrders` on import |
| Shirazeh UI stores | Module-local | Better isolation |
| Persist | No Zustand `persist` | Preview docs write large payloads to `localStorage` (quota risk) |

**Boundary verdict:** Selective subscriptions help today; **array-as-SSOT** remains the primary state scale risk once datasets grow.

---

## 5. Asset Performance

| Asset class | Fact | Risk |
|-------------|------|------|
| CSS source | ~39 files, ~27.5k LOC; `nabz.css` ~199 KB alone | Monolith CSS with eager modules |
| Built CSS | ~503 KB / ~72 KB gzip | Acceptable gzip; parse cost still real |
| Fonts | Vazirmatn + Meem self-hosted woff2; `font-display: swap`; no preload | Many faces declared |
| Yekan Bakh | Referenced; `public/.../yekan-bakh/` essentially empty | Failed loads / fallback churn |
| Signature | `sign.png` **2.2 MB**; `sign.webp` **~49 KB** exists | Clear waste if PNG is preferred path |
| Icons | Named `lucide-react` imports (~77 icons / 37 files) | Tree-shake OK; still inside monolith JS |
| Design `Assets/` | Large offline tree | Confusion / duplication vs `public/` |

---

## 6. Perceived UX Performance

| Concern | Current | Gap |
|---------|---------|-----|
| Empty states | Shared `.empty-state` patterns | OK for prototype |
| Loading | Button/text spinners; Nabz `loading` underused | No route Suspense fallback |
| Skeletons | **Absent** | First-paint feel |
| Errors | `SettingsErrorBoundary` (Shirazeh only) | App/route crash = blank tree |
| Perceived speed | Fine on mock data | Bundle + god panels dominate as features grow |

---

## 7. Bottlenecks (ranked)

1. **Eager single-bundle delivery** — every module/CSS/heavy lib on first paint.  
2. **Nabz CSS + god stage panels** — largest maintainability *and* render surface.  
3. **Full-list tables without virtualization/pagination** — latent O(n) DOM.  
4. **Contacts/orders array fan-out** — cross-module re-render blast radius.  
5. **Oversized static images** (signature PNG, large JPG) competing with JS download.  
6. **Broken / excess font faces** — wasted requests and layout instability risk.  
7. **No app-level error/loading architecture** for route transitions (when lazy arrives).

---

## 8. Scale Risks (20 / 300 / 1000 + large data)

| Growth driver | Failure mode |
|---------------|--------------|
| +Modules/screens | Linear growth of eager JS+CSS; cold start degrades |
| +Features inside Nabz | God panels + `nabz.css` become unshippable without split |
| Thousands of contacts/orders | Table/board jank; filter main-thread stalls |
| Dense order lines (gateway/settlement) | Cell-level re-renders without row virtualization |
| Multi-developer velocity | No bundle budget / perf gate in CI |
| Print/preview payloads in `localStorage` | Quota failures on large documents |

---

## 9. Low-risk improvements (document only — **do not implement in this audit**)

| ID | Idea | Why low-risk | Est. impact |
|----|------|--------------|-------------|
| L1 | Prefer `sign.webp` (or compress PNG) where signature is loaded | Asset swap; no logic | High bytes saved |
| L2 | Remove or fix dead Yekan `@font-face` paths | CSS-only | Fewer failed requests |
| L3 | `useMemo` quoting preview where siblings already do | Local pure calc | Small render win |
| L4 | Narrow `useNabzOrders` / avoid whole-array where only one field needed | Selector hygiene | Re-render reduction |
| L5 | Document image/font budgets in QUALITY or FE guidelines | Process | Prevents regression |
| L6 | Wire existing Nabz `loading` to a consistent page-level indicator | UX only | Perceived perf |

---

## 10. Deferred optimizations (explicitly out of scope now)

| ID | Optimization | Blocked by / notes |
|----|--------------|--------------------|
| D1 | Route-level `React.lazy` + Suspense fallbacks | Product phase; see [ROUTING_LOADING_STRATEGY.md](./ROUTING_LOADING_STRATEGY.md) |
| D2 | Vite `manualChunks` (vendor / module) | After lazy strategy |
| D3 | List virtualization (`@tanstack/react-virtual` or similar) | Needs dataset growth + UX agreement |
| D4 | Server/page-sized query APIs | Needs persistence layer |
| D5 | Split god Nabz panels / extract `nabz.css` | Large refactor — [FRONTEND_COMPONENT_HOTSPOTS.md](./FRONTEND_COMPONENT_HOTSPOTS.md) |
| D6 | Skeleton system + route ErrorBoundaries | After lazy routes |
| D7 | Perf CI (bundle size budget, Lighthouse CI) | After quality.yml stabilizes |
| D8 | Normalized entity maps vs full-array SSOT | State architecture change |

---

## Explicit non-goals (this audit)

- No code changes, refactors, or dependency adds  
- No `React.lazy` / Suspense / `manualChunks` implementation  
- No virtualization / pagination implementation  
- No UI redesign or skeleton library adoption  

---

## Bottom line

Jarian’s performance architecture is a **monolith-first SPA** tuned for **mock-scale** data: strong selective Zustand habits and some list memoization, but **no delivery splitting**, **no list scale strategy**, and **heavy CSS/asset gravity**. It **cannot** honestly support 20 modules / 300 screens / 1000 features / large business datasets without the deferred program (D1–D8). Low-risk wins (L1–L6) are asset/selector hygiene only.
