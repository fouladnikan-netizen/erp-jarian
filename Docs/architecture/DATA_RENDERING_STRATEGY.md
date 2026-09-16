# Data Rendering Strategy

> **Status:** Future patterns — **not implemented**. Current app uses full-array client filter/render.  
> **Related:** [PERFORMANCE_GUIDELINES.md](./PERFORMANCE_GUIDELINES.md), [PERFORMANCE_BUDGETS.md](./PERFORMANCE_BUDGETS.md), [PERSISTENCE_BOUNDARY.md](./PERSISTENCE_BOUNDARY.md)

---

## Current behavior (as-is)

| Surface | Pattern |
|---------|---------|
| Kanoon / Ofogh / Nabz / Vitrin lists | Load (or seed) full array → client filter/sort → map all rows |
| Order line tables | Dense grids inside stage panels — full lines |
| Search | Client `includes` / column filters on in-memory arrays |
| Documents (proforma / shipping) | Layout “pages” for print — not data pagination |

Acceptable for **mock / small** datasets. Not a strategy for thousands of records.

---

## Future patterns by collection type

### Small lists

**Examples:** related persons on a company, stage chips, settings option rows, ≤50 items.

| Prefer | Avoid |
|--------|-------|
| Full client render | Virtualization overhead |
| Local `useMemo` filter | Premature server paging |

Stay under [PERFORMANCE_BUDGETS.md](./PERFORMANCE_BUDGETS.md) small-list limits.

### Large tables

**Examples:** contacts directory, orders list, product catalog, permission matrices with many rows.

| Scale | Strategy |
|-------|----------|
| ≤100 rows, stable | Client table + memoized filter OK for now |
| Growing / production CRM | **Pagination** (page size 20–50) + optional column filters |
| Hundreds–thousands visible intent | **Virtualization** for the body + paginate or query window |
| Multi-tenant large data | **Server queries** (filter/sort/page at API) — UI holds one page |

Do not add a virtualization library without an architecture decision.

### Search results

| Scale | Strategy |
|-------|----------|
| Local seed / Omni prototype | Client filter OK |
| Indexed product search | Debounced query → **server** (or worker) → paged results |
| UX | Page size 20–50; never dump full corpus into DOM |

### Transaction histories

**Examples:** order events, settlement ledger lines, activity streams, audit trails.

| Prefer | Why |
|--------|-----|
| Append-friendly **paged** feed | Histories grow without bound |
| Virtualized long feeds (future) | Scroll performance |
| Server cursor / `since` queries | Aligns with future persistence boundary |

Avoid keeping entire history arrays in Zustand for UI tables.

### Documents

**Examples:** proforma, shipping docs, QC printouts, PDF-ish layouts.

| Concern | Strategy |
|---------|----------|
| Print layout pages | Keep document pagination (layout) separate from **data** paging |
| Many line items | Paginate/virtualize line table in interactive UI; print may still flatten |
| Preview payload size | Avoid multi-MB `localStorage` dumps — prefer ephemeral/session or server draft |

---

## When to use what

| Technique | Use when | Do not use when |
|-----------|----------|-----------------|
| **Full client render** | Small, bounded lists; mock data | Unbounded CRM/ops tables |
| **Pagination** | User expects pages; API can return slices; >100 potential rows | Tiny static lists (noise) |
| **Virtualization** | Must scroll large DOM smoothly; row height reasonably uniform | <50 rows; highly variable nested row UI without plan |
| **Server queries** | Authoritative filtered datasets; multi-user; persistence exists | Pure UI toggles on already-loaded page of data |

Decision order for **new** large collections:

1. Is the dataset bounded and small? → full render.  
2. Will it grow with the business? → design **pagination** (+ empty/loading states).  
3. Will users scroll hundreds of rows on one page? → add **virtualization** plan.  
4. Is filter/sort authoritative and shared? → **server query** window (with repository/API later).

---

## Ownership

| Layer | Responsibility |
|-------|----------------|
| UI tables | Render one window of rows; loading/empty/error |
| Module services | Map DTO → view models; no unbounded hidden copies |
| Future repository/API | Page, filter, sort, cursor |
| Domain | Rules — not list windowing |

---

## Explicit non-goals (this phase)

- No pagination UI rollout  
- No virtualization dependency  
- No API query layer  
- No store normalization for list windows  
