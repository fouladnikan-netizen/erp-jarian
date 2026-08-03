# Frontend Architecture Audit

> **Status:** Audit only — no refactor, no UI rewrite, no new frameworks.  
> **Canvas:** open [`jarian-frontend-architecture-audit.canvas.tsx`](/Users/ehsanmohammadi/.cursor/projects/Users-ehsanmohammadi-Documents-ERP-Jaryan/canvases/jarian-frontend-architecture-audit.canvas.tsx) beside chat  
> **Overall Score: 4.1 / 10**

## Scale verdict

| Need | Fit? |
|------|------|
| Current product | Yes — with Nabz gravity and god panels |
| 20 modules / 300 screens / 1000 features | **No** without code-splitting, boundary fixes, shared Form/Modal/profile adoption |
| Maintainability / consistency / velocity | Theme/DS strong; component architecture weak |

---

## Scorecard

| Dimension | Score |
|-----------|------:|
| Component Design | 4.0 |
| Module Isolation | 3.5 |
| Reuse | 4.0 |
| Design System | 7.5 |
| Routing | 4.0 |
| Performance | 3.0 |
| Maintainability | 3.5 |
| Scalability | 3.0 |
| **Overall** | **4.1** |

---

## 1. Structure

**Pattern:** Feature modules under `src/modules/` + emerging `src/components/` kits + `src/domain/` + tokenized `src/styles/`.

| Strength | Weakness |
|----------|----------|
| Clear product modules | Nabz ~152 files / ~40k LOC (~⅔ of modules) |
| Theme tokens + build audit | `nabz.css` ~9448 LOC |
| Docs + Cursor rules | Shared→nabz dependency leaks |
| ContactPerson / completion kits | Calendar feature lives under `components/` |

---

## 2. God components (highlights)

| File | ~LOC | Problem |
|------|-----:|---------|
| `SaranjamTab.jsx` | 1302 | UI + settlement rules |
| `RahseparStagePanel.jsx` | 1175 | Ops orchestration |
| `CustomerProfilePage.jsx` | 1105 | Page god; nabz coupling |
| `QuickInquiryModal.jsx` | 961 | Modal god |
| `GatewayMorphTable.jsx` | 888 | Table god |
| `OfoqLeadModal.jsx` | 611 | Cross-module bridge in UI |

Extraction is **future** — not this audit.

---

## 3. Module boundaries

| Coupling | Direction | Risk |
|----------|-----------|------|
| nabz ↔ kanoon | Bidirectional | Cycle |
| ofogh → nabz, kanoon | Downward | Lead convert bridge |
| nabz → vitrin | catalogData | Catalog leak |
| calendar → nabz, ofogh | Shared→feature | Wrong layer |
| jarian / JarianUI.config → nabz | Shared→feature | Wrong layer |
| kampayn, shirazeh, auth, tanin | Mostly isolated | OK |

---

## 4. Shared inventory

`profileLayout`, `jarian`, `contactPerson`, `customerCompletion`, `layout`, `module`, `table`, `notifications`, `omni`, `navigation`, `activity`, plus **calendar (feature)**.

**Gaps:** no shared Form / Modal / Drawer primitives; Order profile not on `profileLayout`; dual toast systems.

---

## 5. Design system

- **PASS:** hardcoded colors outside `theme-tokens.css` blocked by `lint:theme`.  
- Glass + typography tokens exist.  
- Violations: none found by audit script; residual risk is CSS size and pattern duplication, not rogue hex.

---

## 6. Forms

No Formik/RHF. Local `FormField` helpers and store-driven forms. **Not reusable/consistent** as a system.

---

## 7. Routing

Eager imports in `App.jsx`; Shirazeh nested; dynamic `orderCode` / `contactId`; no modal routes; no `React.lazy`. **Scalability risk:** monolith bundle growth.

---

## 8. Performance

Broad `useNabzOrders` / `contacts[]` subscriptions; god re-renders; no code splitting; large CSS. Selective Zustand used well on `NabzPage` only in places.

---

## 9. DX

Strong: architecture docs, 6 Cursor rules, theme gate. Weak: 3 unit tests, Ofoq/Ofogh dual spelling, empty `types/`, dual `Docs/`/`docs/` trees.

---

## 10. Top risks & recommendations

See Canvas Top 20. Headline Critical: Nabz gravity, god components, no lazy loading, CSS monolith.

**Future (not now):** lazy routes; extract shared date/money/TruncatedText from nabz; Form/Modal kit; move gahshomar to modules; adopt profileLayout on Order; break god panels opportunistically.

---

## Explicit non-goals

No refactor, no UI changes, no new frameworks.
