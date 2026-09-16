# Future Navigation Vision

> **Status: NOT IMPLEMENTED.** Do not build this in application code until product explicitly schedules it.  
> Full design: [`../ia/03-FUTURE_INFORMATION_ARCHITECTURE.md`](../ia/03-FUTURE_INFORMATION_ARCHITECTURE.md).

## Thesis

Keep poetic module brands (نبض، افق، کانون…). Scale by adding:

1. **Domain-grouped primary nav** (روابط · عملیات · کاتالوگ · زمان‌بندی · رشد · سیستم)
2. **Entity workspaces** (Company, Order) — see [03-WORKSPACE_STRATEGY.md](./03-WORKSPACE_STRATEGY.md)
3. **L1 → L2 → L3** screen hierarchy + secondary nav inside mature modules

## Browse vs work

| Mode | Pattern |
|------|---------|
| Browse / filter | Module L1 (`/nabz`, `/ofogh/board`, …) |
| Work on an entity | Entity workspace URL (`/companies/:id/…`, `/orders/:id/…`) |

## What developers should do now

- Do **not** introduce domain folders in the sidebar
- Do **not** rename routes
- **Do** use `profileLayout` for any **new** profile page ([PROFILE_LAYOUT_GUIDELINES.md](./PROFILE_LAYOUT_GUIDELINES.md))
- **Do** prefer `withReturnParams` / `buildReturnQuery` over inventing new return query keys
- When adding a module, register it in `registry.js` only — domain grouping is a future sidebar concern
