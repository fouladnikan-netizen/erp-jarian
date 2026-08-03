# Routing & Loading Strategy (future)

> **Status:** Recommendation only — **do not add `React.lazy` or change routes** in this phase.  
> **Related:** [12-FRONTEND_ARCHITECTURE_AUDIT.md](./12-FRONTEND_ARCHITECTURE_AUDIT.md), [FRONTEND_ARCHITECTURE_GUIDELINES.md](./FRONTEND_ARCHITECTURE_GUIDELINES.md)

---

## Current state

| Aspect | Fact |
|--------|------|
| Route tree | `src/App.jsx` — flat ERP routes + nested `/shirazeh/*` |
| Loading | **Eager** static imports for all pages |
| Code splitting | None (`React.lazy` / `Suspense` unused) |
| Modal routes | None — modals/drawers are in-page |
| Deep links | `/nabz/order/:orderCode`, `/kanoon/contact/:contactId`, `/survey/:surveyId` |
| Public / preview | Login, survey, proforma/shipping preview outside full shell |

---

## Future approach (not implemented)

### 1. Module lazy loading

- Lazy-load **route-level** page modules: Nabz, Kanoon, Ofogh, Vitrin, Kampayn, Gahshomar, Shirazeh sections, Tanin.
- Keep shell (`AppLayout`, auth gate, theme) eager.
- Prefer one chunk per product module (or per heavy Shirazeh subsection).

### 2. Route boundaries

| Boundary | Eager | Lazy candidate |
|----------|-------|----------------|
| Auth / login | Yes | — |
| App shell | Yes | — |
| Feature pages | — | Yes |
| Print previews | Optional small eager or separate entry | Prefer separate chunk |
| Placeholder `ModulePage` routes | Can stay light | Low priority |

### 3. Feature loading

- Heavy **children** (Order ops tabs, SurveyBuilder) may use nested lazy or dynamic import **after** route-level split exists.
- Data loading remains store/repository responsibility — do not couple “lazy UI” to inventing a new data layer in the same step.
- Preserve deep links: lazy routes must still resolve `:orderCode` / `:contactId` without changing URL scheme.

### 4. Rollout order (when funded)

1. Document + Suspense fallback UX agreement.  
2. Lazy Nabz + OrderDetail (largest).  
3. Lazy remaining feature pages.  
4. Optional nested lazy for stage panels.  
5. Measure bundle with Vite analyze — then stop or continue.

---

## Explicit non-goals now

- Do **not** add `React.lazy` / `Suspense` in this phase.  
- Do **not** change path strings or nested structure.  
- Do **not** introduce a second router library.
