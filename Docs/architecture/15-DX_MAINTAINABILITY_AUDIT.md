# Developer Experience & Maintainability Audit

> **Status:** Audit only — no tooling, no refactor, no config changes.  
> **Canvas:** open [`jarian-dx-maintainability-audit.canvas.tsx`](/Users/ehsanmohammadi/.cursor/projects/Users-ehsanmohammadi-Documents-ERP-Jaryan/canvases/jarian-dx-maintainability-audit.canvas.tsx) beside chat  
> **Related:** [QUALITY_ENGINEERING.md](./QUALITY_ENGINEERING.md), [FRONTEND_ARCHITECTURE_GUIDELINES.md](./FRONTEND_ARCHITECTURE_GUIDELINES.md), [FRONTEND_COMPONENT_HOTSPOTS.md](./FRONTEND_COMPONENT_HOTSPOTS.md), [06-FUTURE_RECOMMENDATIONS.md](./06-FUTURE_RECOMMENDATIONS.md)  
> **Maintainability / DX Score: 3.5 / 10**

## Scale verdict

| Need | Fit? |
|------|------|
| Solo / pair with tribal knowledge | **Yes** — rich local docs + Cursor rules help the incumbent |
| New developer joining from a clean clone | **No** — no root README; `Docs/` **gitignored**; most Cursor rules untracked |
| 5 developers | **Marginal** — needs shared docs in VCS + ownership map first |
| 10 developers / multiple teams | **No** — Nabz gravity, missing workflow contracts, docs not in git |

---

## Scorecard

| Dimension | Score | Notes |
|-----------|------:|-------|
| Repository Structure | 5.0 | Clear `modules/` map; Nabz dominance; ofogh/ofoq + calendar placement noise |
| Developer Onboarding | 2.0 | No root README/CONTRIBUTING; env example thin; Docs invisible on clone |
| Code Maintainability | 3.5 | Hotspots inventoried; god panels + ~95% JS; ownership docs exist locally |
| Documentation | 3.5 | Excellent local architecture corpus; **not versioned** (`Docs/` in `.gitignore`) |
| Development Workflow | 4.0 | `quality.yml` + npm scripts; no husky, PR template, commitlint, CODEOWNERS |
| Team Scalability | 2.5 | Single primary author (~56/64 commits); no team ownership contract |
| **Overall** | **3.5** | Knowledge-rich workstation; clone-hostile |

---

## 1. Current Developer Experience Map

```
Clone repo
  ├─ ✗ No root README / CONTRIBUTING / AGENTS / CODEOWNERS
  ├─ ✓ package.json scripts (dev, quality, lint, test, build)
  ├─ ✓ .env.example (2 Vite vars)
  ├─ ✓ .github/workflows/quality.yml (Node 20)
  ├─ △ .cursor/rules — only theme + presentation tracked (2/11)
  └─ ✗ Docs/ entirely gitignored → architecture/IA/quality docs absent on clone

Local workstation (this machine)
  ├─ Docs/architecture (~41 MD) — audits, ownership, performance, quality
  ├─ Docs/ia + review-package
  ├─ 11 Cursor rules (9 untracked)
  └─ Agent / human can navigate with inventory docs

Day-to-day code
  ├─ src/modules/* (nabz ~152 files ≈ gravity well)
  ├─ src/domain, components, stores, styles
  ├─ Vitest islands (4 suites) + theme lint on build
  └─ Informal conventional commits (feat/chore/refactor) — undocumented
```

| Layer | What exists | Discoverable via clone? |
|-------|-------------|-------------------------|
| Install path | Infer from `package.json` | Weak |
| Architecture | `Docs/architecture/*` | **No** (gitignored) |
| Always-on agent rules | Theme tokens + Jarian tables | Yes (2 rules) |
| Extended agent rules | Business, data, FE, perf, quality, security… | Mostly **No** |
| CI gate | quality.yml | Yes |
| Pre-commit | — | N/A |

---

## 2. Repository Structure

### Strengths

- Product modules under `src/modules/` with a registry (`registry.js`).
- Emerging shared kits: `src/domain/`, `src/components/` (jarian, profileLayout, contactPerson).
- Config / theme / presentation protocol are findable once you know the names.

### Friction

| Issue | Detail |
|-------|--------|
| Nabz gravity | ~152 / ~261 module files; largest CSS and god components |
| Registry vs folders | `gahshomar` → calendar under `components/`; `pooyesh` / `ayeneh` placeholders; `auth` / `tanin` extra |
| Naming drift | Route/folder `ofogh` vs components `Ofoq*` / `ofoq-*` |
| Design `Assets/` vs `public/` | Easy to ship the wrong tree |
| No module READMEs | Ownership of nabz/ofogh/kanoon not stated in-tree |

---

## 3. Developer Onboarding

### Current path (inferred)

1. Install Node (CI uses **20**; no `engines` field).  
2. `npm install` / `npm ci`.  
3. Copy `.env.example` → `.env` (mock API flag).  
4. `npm run dev` (+ optional `npm run server`).  
5. Learn Persian RTL + token rules from Cursor always-apply rules.  
6. Discover architecture only if someone shares local `Docs/` or chat history.

### Required knowledge (undocumented at root)

- Module map (Nabz orders, Ofogh pipeline, Kanoon parties, …)
- Zustand SSOT stores; do not “replace with Redux”
- Jarian Presentation 2.0 for tables/money
- Theme tokens — no hardcoded colors
- Dual status / workflow debt — inventoriable, not “fix while here”
- Quality scripts before PR (`npm run quality`)

### Missing for safe join

- Root **README** (install, scripts, architecture index pointer)
- **CONTRIBUTING** (branch/PR/checks expectations)
- **Versioned** architecture docs
- Tracked Cursor rules beyond theme/presentation
- Module entry READMEs / owner contacts

---

## 4. Code Maintainability

| Signal | Assessment |
|--------|------------|
| Consistency | Strong UI token + table protocol; weak TS adoption (~5% files) |
| Duplication | Documented in SSOT / order status audits — still live debt |
| Naming | Mostly clear; ofogh/ofoq and Persian/English dual names need a glossary |
| Complexity | 9 files ≥500 LOC; Nabz ops panels 800–1300 LOC |
| Ownership clarity | Excellent **in local docs**; invisible **in git** |
| Tests | Thin safety net (domain/quoting/stage islands) — see quality audit |

Maintainability is **documented** more than it is **enforced**. Inventories help experts; they do not protect newcomers from editing the wrong layer.

---

## 5. Documentation

### Local corpus (high quality)

~41 architecture Markdown files: audits 01–14, ownership, SSOT, workflow, security, frontend, performance, quality. Plus IA package and review-package.

### Accessibility gap (critical)

```
.gitignore → Docs/
```

**All** of that corpus is excluded from version control. A new clone receives CI + source + 2 Cursor rules, not the architecture index.

### Other gaps

| Gap | Status |
|-----|--------|
| Root README / CONTRIBUTING / AGENTS | Missing |
| ADRs / decision log | Missing |
| Per-module README | Missing |
| PR / issue templates | Missing |
| Feature runbooks | Sparse (Word framework doc local only) |
| Commit / branch conventions | Informal history only |

---

## 6. Development Workflow

| Practice | Status |
|----------|--------|
| CI quality gate | **Yes** — lint:theme → eslint → typecheck → test → build |
| Local `npm run quality` | **Yes** (documented in local QUALITY_ENGINEERING) |
| Pre-commit / husky / lint-staged | **No** |
| commitlint | **No** |
| PR template | **No** |
| Branch strategy doc | **No** |
| CODEOWNERS | **No** |
| Commit style | Informal `feat:` / `chore:` / `refactor:` in history |

Workflow is **CI-centered, process-light**. Fine for one primary author; fragile for parallel teams.

---

## 7. Team Scalability

| Team size | Verdict | Why |
|-----------|---------|-----|
| 1–2 | Works | Tribal knowledge + local Docs + Cursor |
| **5** | Risky | Need shared docs in git, owners, PR norms, Nabz edit protocol |
| **10** | No | Module collision, god files, missing contracts |
| Multiple teams | No | No CODEOWNERS, no ADR, Docs not shared, Nabz as bottleneck |

---

## 8. Onboarding Friction Points (ranked)

1. **`Docs/` gitignored** — architecture invisible after clone.  
2. **No root README** — install and mental model undocumented.  
3. **9/11 Cursor rules untracked** — agent/human guardrails diverge across machines.  
4. **Nabz as default edit surface** — easy to land in 1k-LOC panels without map.  
5. **ofogh/ofoq + calendar placement** — search fails first try.  
6. **No CONTRIBUTING / PR template** — unclear “done” definition.  
7. **Thin tests** — fear of change without safety net.  
8. **No `engines` / Node pin in package** — only CI implies Node 20.

---

## 9. Developer Productivity Risks

| Risk | Impact |
|------|--------|
| Editing god panels without ownership | Regressions; review bottlenecks |
| Reinventing presentation/money formats | Protocol drift (mitigated if always-apply rules present) |
| Hardcoded colors | Caught by `lint:theme` on build — good |
| Duplicate business rules in JSX | Documented forbidden; still easy without local docs |
| Parallel feature work on contacts/orders SSOT | Merge conflict + behavioral clash |
| Assuming Docs are in git | Onboarding false confidence |

---

## 10. Documentation Gaps (summary)

| Priority | Gap |
|----------|-----|
| P0 | Version `Docs/architecture` (or move to tracked `docs/`) |
| P0 | Root README with install + module map + quality commands |
| P1 | Track remaining `.cursor/rules/*.mdc` |
| P1 | CONTRIBUTING + PR template |
| P2 | Module one-pagers (nabz, kanoon, ofogh, shirazeh) |
| P2 | Glossary (ofogh/ofoq, stage vs OrderStatus) |
| P3 | ADR lightweight process |
| P3 | CODEOWNERS when team >2 |

---

## 11. Low-risk improvements (document / process only — **do not implement in this audit**)

| ID | Improvement | Why low-risk |
|----|-------------|--------------|
| L1 | Add root `README.md` (install, scripts, link to architecture) | Docs only |
| L2 | Stop ignoring architecture Markdown (narrow `.gitignore`) or publish tracked `docs/` | Process; no runtime |
| L3 | Commit remaining Cursor rules | Governance parity |
| L4 | Minimal `CONTRIBUTING.md` + PR checklist (`npm run quality`) | Process |
| L5 | `engines.node` = 20 in package.json | One field (when allowed) |
| L6 | Module README stubs (purpose + owner + key paths) | Docs only |
| L7 | Glossary page for naming drift | Docs only |

---

## 12. Deferred improvements

| ID | Improvement | Notes |
|----|-------------|-------|
| D1 | CODEOWNERS + team ownership map | Needs real team |
| D2 | husky / lint-staged | After README/CI norms |
| D3 | commitlint + branch naming RFC | Culture change |
| D4 | ADR folder + template | After docs are tracked |
| D5 | Nabz / god-component splits | Large refactor — not DX-only |
| D6 | Broader test coverage | Quality program |
| D7 | Formal multi-team module charters | Org decision |

---

## Explicit non-goals (this audit)

- No code, dependency, or configuration changes  
- No enabling Docs in git / writing README in this pass  
- No husky / PR template implementation  

---

## Bottom line

Jarian has an **unusually strong local architecture brain** (audits, ownership maps, Cursor rules, quality CI) and a **weak shared onboarding surface** (no root README; **Docs gitignored**; most rules untracked; Nabz complexity). A new developer **cannot safely join from clone alone**. Fixing discoverability (L1–L4) is the prerequisite before 5+ developers or multiple teams become realistic.
