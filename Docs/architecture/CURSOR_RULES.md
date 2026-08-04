# Cursor Rules Index

> **Location:** `.cursor/rules/*.mdc`  
> **Status:** Version-controlled. Agents and humans should treat these as project law for *new* work unless a doc says otherwise.

---

## Mandatory (always applied)

These load for every Cursor Agent session in this repo:

| Rule file | Purpose |
|-----------|---------|
| [`jarian-theme-tokens.mdc`](../../.cursor/rules/jarian-theme-tokens.mdc) | RFC-001 — no hardcoded colors; use `theme-tokens.css` / CSS variables |
| [`jarian-unified-presentation.mdc`](../../.cursor/rules/jarian-unified-presentation.mdc) | Tables, money, product cell, supplier — Jarian Presentation 2.0 |

Violating these in PRs is a review blocker (theme also enforced via `npm run lint:theme` / build).

---

## Contextual (glob / task triggered)

Applied when editing matching paths or when the agent selects the rule:

| Rule file | Purpose |
|-----------|---------|
| [`jarian-business-rules.mdc`](../../.cursor/rules/jarian-business-rules.mdc) | Keep business rules out of new JSX; prefer domain/services |
| [`jarian-data-architecture.mdc`](../../.cursor/rules/jarian-data-architecture.mdc) | Persistence readiness; no opportunistic Prisma/DB redesign |
| [`jarian-frontend-boundaries.mdc`](../../.cursor/rules/jarian-frontend-boundaries.mdc) | Module import direction; no new shared→module leaks |
| [`jarian-ui-architecture.mdc`](../../.cursor/rules/jarian-ui-architecture.mdc) | Tokens, RTL, module CSS hygiene |
| [`jarian-unified-list.mdc`](../../.cursor/rules/jarian-unified-list.mdc) | Law #004 — shared list infra (Infinite Loading mandatory) |
| [`jarian-profile-layout.mdc`](../../.cursor/rules/jarian-profile-layout.mdc) | New profile pages use shared `profileLayout` contract |
| [`jarian-security.mdc`](../../.cursor/rules/jarian-security.mdc) | Identity / authz guardrails for future work |
| [`jarian-quality.mdc`](../../.cursor/rules/jarian-quality.mdc) | Tests + `npm run quality` expectations for domain/services |
| [`jarian-performance-assets.mdc`](../../.cursor/rules/jarian-performance-assets.mdc) | Image/font/dependency weight for new assets |
| [`jarian-rendering-performance.mdc`](../../.cursor/rules/jarian-rendering-performance.mdc) | Zustand selectors, list scale, expensive calcs, large components |

---

## How to add a rule

1. Add `.cursor/rules/jarian-<topic>.mdc` with YAML frontmatter (`description`, `globs` or `alwaysApply`).
2. Document it in this file.
3. Commit the `.mdc` with the related architecture doc when possible.

Do **not** set `alwaysApply: true` unless the rule must constrain nearly all UI work (theme + presentation are the exceptions).
