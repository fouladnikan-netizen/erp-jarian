# Performance Hotspots

> **Status:** Registry only — **no fixes in this phase**.  
> **Related:** [14-PERFORMANCE_ARCHITECTURE_AUDIT.md](./14-PERFORMANCE_ARCHITECTURE_AUDIT.md), [FRONTEND_COMPONENT_HOTSPOTS.md](./FRONTEND_COMPONENT_HOTSPOTS.md), [PERFORMANCE_BUDGETS.md](./PERFORMANCE_BUDGETS.md)

Track known performance risks so new work does not make them worse. Remediation is deferred.

---

## Critical / High

| ID | Hotspot | Evidence | Risk if ignored |
|----|---------|----------|-----------------|
| PH1 | **Initial JS monolith** | ~1.39 MB single chunk; no lazy routes | Cold start worsens with every module |
| PH2 | **Initial CSS monolith** | ~503 KB built CSS; eager module CSS | Parse/apply cost on every load |
| PH3 | **`nabz.css` size** | ~9.4k LOC / ~199 KB source | Gravity well; blocks healthy CSS budgets |
| PH4 | **Large workflow panels** | `SaranjamTab` ~1302, `RahseparStagePanel` ~1175, `GatewayMorphTable` ~888 LOC | Re-render and maintainability cost |
| PH5 | **Full-array list rendering** | Kanoon / Nabz / Vitrin / Ofogh map entire filtered arrays | Jank at real dataset scale |
| PH6 | **Large static assets** | `sign.png` ~2.2 MB (webp ~49 KB exists); `nikan2` ~1.2 MB | Bandwidth competes with JS |

---

## Medium

| ID | Hotspot | Evidence | Risk if ignored |
|----|---------|----------|-----------------|
| PH7 | **Contacts / orders array SSOT** | Cross-module subscribers to full arrays | Fan-out re-renders |
| PH8 | **Heavy libs on eager graph** | `@xyflow/react`, `@hello-pangea/dnd` via App imports | Pay cost before visiting those screens |
| PH9 | **God page shells** | `CustomerProfilePage` ~1105, `QuickInquiryModal` ~961 | Same as PH4 at page/modal layer |
| PH10 | **Font face debt** | Yekan paths referenced; files missing under public | Failed requests / fallback churn |
| PH11 | **Preview `localStorage` payloads** | Proforma/shipping serialize docs | Quota failures on large orders |
| PH12 | **Unmemoized hot calcs** | e.g. quoting preview in items tab vs memoized siblings | Extra work per parent render |

---

## Lower / watch

| ID | Hotspot | Notes |
|----|---------|-------|
| PH13 | Sparse `React.memo` | Acceptable at mock scale; revisit with dense tables |
| PH14 | Nabz store boot on import | `fetchOrders` side effect at module load |
| PH15 | Single ErrorBoundary (Shirazeh) | Crash UX — perceived reliability more than FPS |
| PH16 | Design-repo `Assets/` duplication | Confusion vs `public/` — ship risk if copied blindly |

---

## Interaction with component hotspots

Structural god files are listed in [FRONTEND_COMPONENT_HOTSPOTS.md](./FRONTEND_COMPONENT_HOTSPOTS.md). This registry adds the **runtime/delivery** lens (bundle, CSS bytes, list DOM, assets). Do not split gods or rewrite CSS under the guise of “registering” a hotspot.

---

## Rules for new work

1. Do **not** enlarge PH3–PH6 without acknowledging budget impact in the PR.  
2. Do **not** introduce new unbounded full-array tables (see [DATA_RENDERING_STRATEGY.md](./DATA_RENDERING_STRATEGY.md)).  
3. Do **not** add multi-MB rasters (see asset Cursor rule).  
4. Fixes require an explicit performance rollout — not drive-by refactors.

---

## Explicit non-goals

- No lazy loading, virtualization, or asset recompression in this foundations phase  
- No CI enforcement of this registry  
