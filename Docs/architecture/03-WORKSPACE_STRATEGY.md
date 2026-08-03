# Workspace Strategy

> **Status: NOT IMPLEMENTED.** No workspace chrome, context bar, or entity-first routes in this phase.

## Intent

Two persistent work frames:

| Workspace | Entered from (today’s equivalents) | Future chrome |
|-----------|-----------------------------------|---------------|
| **Company** | Kanoon profile, Ofogh card, Gahshomar dive | Context bar + module lenses |
| **Order** | Nabz detail/list, company orders tab | Context bar + gateway/L3 |

Modules become **lenses inside** a workspace when working; they remain browse entry points otherwise.

## Why deferred

- Requires route shape changes and shell chrome (medium/high migration cost)
- Current project size is acceptable without it (product decision)
- See audit score in [`../ia/04-ENTITY_NAVIGATION_AUDIT.md`](../ia/04-ENTITY_NAVIGATION_AUDIT.md)

## Interim pattern (keep)

- Entity pages: Company + Order only
- Cross-module return: `returnTo` / `returnName` via `SmartBackButton` helpers
- Ofogh → Nabz: `NabzOrdersProvider` + `/nabz/new-order`

## When implementing later

1. Introduce workspace chrome without removing module routes (dual-run)
2. Migrate deep links gradually
3. Replace `returnTo` as primary backstack only after workspace up-nav exists
