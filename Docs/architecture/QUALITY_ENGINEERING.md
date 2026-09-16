# Quality Engineering

> **Status:** Active quality foundation (scripts + CI + unit islands).  
> **Related:** [13-TESTING_QUALITY_AUDIT.md](./13-TESTING_QUALITY_AUDIT.md)

---

## Testing strategy

| Layer | Status | Location |
|-------|--------|----------|
| Domain unit tests | Active | `src/domain/__tests__/` |
| Module service tests | Active | `src/modules/<module>/services/__tests__/` |
| Module workflow tests | Active | `src/modules/__tests__/` |
| Top-level `src/services/__tests__/` | Reserved (README only) | No production services layer yet |
| Component / E2E | Deferred | — |

**Priorities today:** customerCompletion, revision engine, order stage transitions, quoting/pricing gates.  
**Not yet:** React Testing Library, Playwright E2E, visual regression.

Prefer pure functions in `domain/` and `*Service.js` so tests stay on Vitest `environment: 'node'`.

---

## Quality gates

| Command | Purpose |
|---------|---------|
| `npm run lint:theme` | Stylelint + hardcoded color audit |
| `npm run lint` | ESLint (independent) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit suite |
| `npm run format:check` | Prettier check (**local/advisory** — do not mass-rewrite) |
| `npm run quality` | theme + lint + typecheck + test |
| `npm run build` | theme lint + Vite build (**unchanged**) |

**CI:** `.github/workflows/quality.yml` runs install → theme lint → eslint → typecheck → test → build. No deploy.

---

## Test ownership

| Owner | Tests |
|-------|-------|
| Domain authors | `src/domain/__tests__/**` |
| Nabz service authors | `src/modules/nabz/services/__tests__/**` |
| Workflow / stage authors | `src/modules/__tests__/**` |
| FE shared kits | Deferred UI tests |

New business rules should ship with at least one unit test when the logic lives in domain/services.

---

## Coverage targets (future — not enforced)

| Area | Target | Notes |
|------|--------|-------|
| Domain | **70%+** | completion, revision, party helpers |
| Services (Nabz) | **60%+** | quoting, stage, gateway later |
| UI | later | After Testing Library adoption |

`vite` coverage `include` already lists domain + nabz services + orderStageService. **No threshold** in CI yet — run `npm run test:coverage` locally.

---

## Future CI strategy

1. Keep quality.yml green on every PR.  
2. Add branch protection requiring the Quality job.  
3. Optionally add `format:check` after a focused Prettier pass.  
4. Grow domain/service tests before enabling coverage thresholds.  
5. Add component/E2E jobs as separate workflows when funded.

---

## Cursor rule

See `.cursor/rules/jarian-quality.mdc` for developer expectations on new domain/service logic.
