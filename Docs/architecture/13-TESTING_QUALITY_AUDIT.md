# Testing & Quality Architecture Audit

> **Status:** Audit snapshot (pre-foundation). **Implementation:** [QUALITY_ENGINEERING.md](./QUALITY_ENGINEERING.md) — scripts, CI, expanded unit islands.  
> **Canvas:** open [`jarian-testing-quality-audit.canvas.tsx`](/Users/ehsanmohammadi/.cursor/projects/Users-ehsanmohammadi-Documents-ERP-Jaryan/canvases/jarian-testing-quality-audit.canvas.tsx) beside chat  
> **Testing Maturity Score (at audit): 2.2 / 10** — re-score after CI green + more domain coverage

## Scale verdict

| Need | Fit? |
|------|------|
| Current solo / small team prototype | Marginal — theme gate helps; logic mostly unprotected |
| 20 modules / 300 screens / 1000 features | **No** |
| Multiple developers | **No** — no CI, tiny tests, no merge gates |

---

## 1. Current quality architecture map

| Layer | Tooling | Enforced on build/deploy? |
|-------|---------|---------------------------|
| Unit tests | Vitest (`npm test`) — 3 files, ~11 tests | **No** |
| Integration / component / E2E | Absent (orphan Playwright screenshot script) | **No** |
| ESLint | `npm run lint` | **No** |
| Stylelint + theme color audit | `lint:theme` | **Yes** (`build` depends on it) |
| Prettier | `format` (write) | **No** check mode |
| Typecheck | `tsconfig` strict, no `typecheck` script | **No** |
| Coverage | `test:coverage` — no thresholds; narrow include | **No** |
| CI/CD | No `.github/workflows` | **No** |
| Pre-commit | No husky / lint-staged | **No** |
| Error monitoring | Settings `ErrorBoundary` → console | **No** APM |

`scripts/deploy.sh` runs `npm run build` only → theme lint only.

---

## 2. Testing maturity scorecard

| Dimension | Score |
|-----------|------:|
| Unit Testing | 2.5 |
| Integration Testing | 1.0 |
| Component Testing | 1.0 |
| Business Rule Testing | 3.5 |
| Regression Protection | 1.5 |
| Coverage Strategy | 2.0 |
| Test Organization | 3.0 |
| CI/CD Quality Gates | 1.0 |
| Linting | 5.5 |
| Formatting | 3.0 |
| Type Safety | 2.5 |
| Error Monitoring | 1.0 |
| **Overall maturity** | **2.2** |

### Existing tests (islands)

| File | ~Tests | Focus |
|------|-------:|-------|
| `src/modules/nabz/tests/quotingService.test.js` | 5 | VAT / discount / money |
| `src/domain/order/revisionEngine.test.ts` | 3 | Revision return/clear |
| `src/domain/customerCompletion/evaluateCompanyCompletion.test.js` | 3 | Completion policy |

Vitest config lives in `vite.config.js` (`environment: 'node'`). Coverage include is `nabz/services` + `shared/utils` — **excludes** most of `domain/` despite domain tests.

---

## 3. Top quality risks

1. **Critical** — No CI; tests never block merges  
2. **Critical** — ~11 tests vs hundreds of source files  
3. **Critical** — Nabz workflow / settlement / stage services largely untested  
4. **High** — ESLint not in build/deploy  
5. **High** — No typecheck script; ~95% JS with `checkJs: false`  
6. **High** — No component or E2E layer  
7. **High** — Coverage without thresholds  
8. **Medium** — No husky; no `format:check`; no APM  

Full list: Canvas.

---

## 4. Recommended testing architecture (future)

```
                    ┌─────────────┐
                    │  Few E2E    │  critical journeys
                    └──────┬──────┘
                    ┌──────▼──────┐
                    │ Components  │  shared kits + key forms
                    └──────┬──────┘
                    ┌──────▼──────┐
                    │ Integration │  store + repository boundaries
                    └──────┬──────┘
                    ┌──────▼──────┐
                    │ Unit/Domain │  quoting, stages, policies, money
                    └─────────────┘
```

**PR gates (target):** `lint:theme` + `eslint` + `typecheck` + `vitest` (+ coverage floor on domain/services).  
**Keep** Vitest; add Testing Library when UI tests start; declare Playwright for E2E; add runtime error monitoring.

---

## 5. Low-risk immediate improvements (recommendations only)

| ID | Action |
|----|--------|
| L1 | CI job: `lint:theme` + `npm test` on PR |
| L2 | `typecheck` script → `tsc -p tsconfig.json` |
| L3 | `format:check` → `prettier --check .` |
| L4 | Run `eslint` in CI (before putting on every local build) |
| L5 | Widen coverage `include` to `src/domain/**` |
| L6 | Team rule: green `npm test` before merge |
| L7 | Align/remove stale review-package / Playwright script claims |
| L8 | Grow unit tests beside quoting / revision / completion pattern |

---

## 6. Deferred improvements

| ID | Action |
|----|--------|
| D1 | Branch protection + full CI matrix |
| D2 | husky + lint-staged |
| D3 | Coverage thresholds after more tests |
| D4 | Component tests (jsdom + Testing Library) |
| D5 | Playwright E2E critical paths |
| D6 | Sentry (or equivalent) |
| D7 | Broader TS / checkJs migration |
| D8 | Visual regression (optional) |
| D9 | API contract tests when backend exists |

---

## Explicit non-goals of this document

No new tests, no CI files, no package.json or config edits in this audit phase.

## Cross-links

- [12-FRONTEND_ARCHITECTURE_AUDIT.md](./12-FRONTEND_ARCHITECTURE_AUDIT.md)  
- [09-BUSINESS_RULES_WORKFLOW_AUDIT.md](./09-BUSINESS_RULES_WORKFLOW_AUDIT.md)  
- Domain kits under `src/domain/`
