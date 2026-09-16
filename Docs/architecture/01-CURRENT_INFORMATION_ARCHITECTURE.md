# Current Information Architecture

> Developer reference. Full product map: [`../ia/01-CURRENT_IA_MAP.md`](../ia/01-CURRENT_IA_MAP.md).

## Shell

- **Primary nav:** flat module list from `src/modules/registry.js` → `Sidebar.jsx`
- **Header:** active module name/description via `AppLayout.getModuleByPath` — not a navigator
- **Omni:** double-Shift; static shortcuts in `OmniCommand.jsx`
- **Auth:** `/login` outside shell; `RequireAuth` wraps `AppLayout`

## Modules (sidebar order)

| id | path | Status |
|----|------|--------|
| nabz | `/nabz` | Real |
| ofogh | `/ofogh` | Real |
| kanoon | `/` | Real |
| vitrin | `/vitrin` | Real |
| gahshomar | `/gahshomar` | Real |
| kampayn | `/kampayn` | Real |
| pooyesh | `/pooyesh` | Placeholder `ModulePage` |
| ayeneh | `/ayeneh` | Placeholder `ModulePage` |
| shirazeh | `/shirazeh` | Real (nested settings) |

## Entity surfaces today

| Entity | Surface |
|--------|---------|
| Company | Page `/kanoon/contact/:contactId` |
| Order | Page `/nabz/order/:orderCode` (+ list drawer) |
| Opportunity | Ofogh board + lead modal (same contact record) |
| ContactPerson | Modal under Company |
| Activity | Embedded / order modal / stub `/pooyesh` |
| Calendar Event | Gahshomar drawer → dive links |
| Product | Vitrin drawer |
| User | `/shirazeh/users`, `/login` |

## Cross-cutting navigation helpers

- `SmartBackButton`, `buildReturnQuery`, `withReturnParams` — query keys `returnTo`, `returnName`
- `NabzOrdersProvider` — preserves Ofogh → Nabz create draft across route change

## Centricity

**Module-centric** shell with partial entity deep-dives (Company, Order only).
