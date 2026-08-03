# Frontend Architecture Guidelines

> **Status:** Stabilization guide — **no folder moves, no refactor in this phase**.  
> **Related:** [12-FRONTEND_ARCHITECTURE_AUDIT.md](./12-FRONTEND_ARCHITECTURE_AUDIT.md), [FRONTEND_COMPONENT_HOTSPOTS.md](./FRONTEND_COMPONENT_HOTSPOTS.md), [SHARED_UI_INVENTORY.md](./SHARED_UI_INVENTORY.md), `.cursor/rules/jarian-frontend-boundaries.mdc`

---

## Current patterns (as-is)

| Layer | Location | Role today |
|-------|----------|------------|
| **Modules** | `src/modules/{kanoon,nabz,ofogh,vitrin,kampayn,shirazeh,tanin,auth}` | Feature ownership: pages, local components, services, module CSS |
| **Pages** | Module roots / `*Page.jsx` / `*Module.jsx` | Route targets; often compose many children |
| **Module components** | `src/modules/<id>/components/` | Feature-private UI (drawers, tables, stage panels) |
| **Shared components** | `src/components/` | Cross-module UI kits + shell (layout, jarian, profileLayout, …) |
| **Domain** | `src/domain/` | Policies, types, identity helpers (prefer no React) |
| **Stores** | `src/stores/` + `src/modules/*/store/` | Cross-cutting SSOT (contacts) vs module UI stores |
| **Styles** | `src/styles/` + module `*.css` | Tokens in `theme-tokens.css`; large module CSS (esp. nabz) |
| **Config** | `src/config/` | Brand, JarianUI presentation protocol, registries |
| **Routing** | `src/App.jsx` | Eager imports; Shirazeh nested; no lazy yet |

**Known debt (documented, not fixed here):** nabz↔kanoon imports; shared jarian/config → nabz; calendar feature under `components/`; god panels &gt;500 LOC.

---

## Future rules (for new work)

### Module ownership

1. Each product surface owns its **pages**, **module components**, **module services**, and **module-scoped CSS**.  
2. Cross-module **data** goes through documented SSOTs (`useContactsStore`, Nabz order store/facade) — not by reaching into another module’s private folders.  
3. Cross-module **UI** goes through `src/components/` or a thin public bridge (future) — not deep imports of sibling internals.

### Dependency direction

```
App / routes
    ↓
modules (features)
    ↓
shared components / hooks / config / stores (public)
    ↓
domain / styles tokens
```

- **Allowed:** module → shared → domain.  
- **Forbidden for new code:** shared → module; module A → module B internals; domain → React UI.  
- Legacy violations: list in [12-FRONTEND_ARCHITECTURE_AUDIT.md](./12-FRONTEND_ARCHITECTURE_AUDIT.md); do not add new ones.

### Component responsibility

| Kind | Should contain | Should not contain |
|------|----------------|-------------------|
| **Page** | Composition, routing params, top-level data wiring | Heavy formulas, stage machines |
| **Feature panel** | Layout + calling services | New VAT/settlement/permission invention |
| **Shared primitive** | Presentation + a11y | Feature imports (nabz/kanoon/…) |
| **Domain helper** | Pure rules | JSX |

New components trending above ~400–500 LOC should declare responsibilities and extraction candidates in [FRONTEND_COMPONENT_HOTSPOTS.md](./FRONTEND_COMPONENT_HOTSPOTS.md) (update the inventory) — **without** mandatory split in the same PR unless funded.

---

## Related Cursor rules

- Boundaries: `jarian-frontend-boundaries.mdc`  
- UI/CSS: `jarian-ui-architecture.mdc`, `jarian-theme-tokens.mdc`, `jarian-unified-presentation.mdc`  
- Profiles: `jarian-profile-layout.mdc`

---

## Explicit non-goals

No Nabz rewrite, no lazy loading implementation, no import graph cleanup in this phase.
