# Contributing to Jarian ERP

Thanks for helping. Keep changes small, respect existing architecture docs, and do not drive-by refactor Nabz or replace Zustand.

## Branch naming

Use a short prefix:

| Prefix | Use |
|--------|-----|
| `feat/` | New capability |
| `fix/` | Bug fix |
| `chore/` | Tooling, docs, deps hygiene |
| `refactor/` | Internal restructure (only when asked) |
| `docs/` | Documentation only |

Examples: `feat/kanoon-filter-clear`, `fix/nabz-stage-lock`, `docs/architecture-index`.

Avoid long-lived branches that mix unrelated modules.

## Commit expectations

- Prefer conventional-style subjects: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.
- Optional scope: `feat(nabz): …`, `docs(architecture): …`.
- One logical change per commit when practical.
- Do not commit secrets (`.env`), `node_modules`, or design-only packs under ignored `Assets/` / `Docs/ia`.

## Pull requests

1. Open a PR against the default branch (`main` / `master`).
2. Fill the PR template checklist (business, architecture, tests, UI, docs).
3. Keep the diff reviewable — prefer module-scoped changes.
4. Link related architecture notes when you change domain/workflow/store contracts.

### Required local checks

Run before push / PR:

```bash
npm run lint
npm test
npm run build
```

Recommended (matches CI intent more closely):

```bash
npm run quality
```

(`quality` = theme lint + eslint + typecheck + test. `build` also runs theme lint.)

`npm run format:check` is advisory until a focused Prettier pass; do not mass-reformat the repo in feature PRs.

## Architecture & Cursor rules

- Index: [Docs/architecture/README.md](./Docs/architecture/README.md)
- Rules catalog: [Docs/architecture/CURSOR_RULES.md](./Docs/architecture/CURSOR_RULES.md)
- **Always applied:** theme tokens (no hardcoded colors), Unified Presentation 2.0 (tables / money / supplier)

## What not to do in drive-by PRs

- Add Husky, Commitlint, or CODEOWNERS unless explicitly requested
- Add `React.lazy` / Vite chunk splits / virtualization deps without a performance rollout
- Split god Nabz panels or rewrite `nabz.css` “while here”
- Replace Zustand or invent a second CRM SSOT

## Questions

If ownership of a rule or module is unclear, check [ENTITY_OWNERSHIP.md](./Docs/architecture/ENTITY_OWNERSHIP.md), [BUSINESS_RULE_OWNERSHIP.md](./Docs/architecture/BUSINESS_RULE_OWNERSHIP.md), and [SSOT.md](./Docs/architecture/SSOT.md) before inventing a new pattern.
