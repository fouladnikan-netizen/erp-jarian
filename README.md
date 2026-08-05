# جریان (Jarian) ERP

سامانه مدیریت ارتباط با مشتری و سفارشات — فارسی / RTL.

**Version:** 0.2.0 · Vite + React SPA

## Purpose

Jarian ERP connects CRM (parties, opportunities, campaigns) with order operations (inquiry → quote → fulfillment). Product modules use Persian names (نبض، افق، کانون، …) with English folder ids (`nabz`, `ofogh`, `kanoon`, …).

## Tech stack

| Layer | Choice |
|-------|--------|
| UI | React 19, React Router 7 |
| Build | Vite 6 |
| State | Zustand |
| Validation | Zod (islands) |
| Quality | ESLint, Stylelint (theme tokens), Vitest, TypeScript `noEmit` |
| Icons | lucide-react |

Node **20** is what CI uses (`.github/workflows/quality.yml`).

## Development setup

```bash
git clone <repo-url>
cd ERP-Jaryan
cp .env.example .env
npm ci
npm run dev
```

Optional mock/API server:

```bash
npm run server
```

Env (see `.env.example`):

- `VITE_API_BASE_URL` — API base
- `VITE_USE_MOCK_API` — prefer mocks when `true`

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Vite dev server |
| `npm run build` | Theme lint + production build |
| `npm run lint` | ESLint |
| `npm run lint:theme` | Stylelint + hardcoded color audit |
| `npm test` | Vitest unit tests |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run quality` | theme + lint + typecheck + test |
| `npm run format:check` | Prettier check (advisory) |
| `npm run preview` | Preview production build |

Before opening a PR, run at least: `npm run lint`, `npm test`, and `npm run build` (see [CONTRIBUTING.md](./CONTRIBUTING.md)).

## Main modules

| Id | Name | Role |
|----|------|------|
| `kanoon` | کانون | Parties / contacts (home) |
| `nabz` | نبض | Orders & operations |
| `ofogh` | افق | Opportunities pipeline |
| `vitrin` | ویترین | Product catalog |
| `gahshomar` | گاه‌شمار | Commitments calendar |
| `mowj` | موج (کمپین‌ها) | Campaign Core — retention & acquisition |
| `shirazeh` | شیرازه | Settings / users / security |
| `pooyesh` / `ayeneh` | پویش / آینه | Placeholder surfaces |

Code lives mainly under `src/modules/`. Shared kits: `src/domain/`, `src/components/`, `src/stores/`.

## Architecture documentation

Start here: **[Docs/architecture/README.md](./Docs/architecture/README.md)** (reading order for new developers).

Highlights:

- [QUALITY_ENGINEERING.md](./Docs/architecture/QUALITY_ENGINEERING.md) — tests & CI gates
- [FRONTEND_ARCHITECTURE_GUIDELINES.md](./Docs/architecture/FRONTEND_ARCHITECTURE_GUIDELINES.md) — FE boundaries
- [SSOT.md](./Docs/architecture/SSOT.md) — single sources of truth
- [CURSOR_RULES.md](./Docs/architecture/CURSOR_RULES.md) — Cursor agent rules index

## Contribution

See **[CONTRIBUTING.md](./CONTRIBUTING.md)**. Short version: small PRs, respect Cursor rules (theme tokens + table presentation are always on), do not invent parallel money/table formats, run quality checks locally.
