# Persistence Boundary (proposal)

> **Status:** Recommended **future** layering — **not implemented**.  
> Do not add Prisma, database, or repository rewrites in this phase.  
> **Related:** [DATA_OWNERSHIP_MODEL.md](./DATA_OWNERSHIP_MODEL.md), [10-DATA_ARCHITECTURE_AUDIT.md](./10-DATA_ARCHITECTURE_AUDIT.md)

---

## Target layers

```
┌─────────────────────────────────────────┐
│  UI (pages, drawers, tables)            │  Collect input, render, call down
├─────────────────────────────────────────┤
│  Application services (use-cases)       │  Orchestrate one user action
├─────────────────────────────────────────┤
│  Domain rules                           │  Policies, calculations, transitions
├─────────────────────────────────────────┤
│  Repository                             │  Load/save aggregates by id
├─────────────────────────────────────────┤
│  Database                               │  Durable store (future)
└─────────────────────────────────────────┘
```

Client cache (e.g. Zustand) may sit **beside** Application/UI as a **working copy**, not as the system of record once a database exists.

---

## Layer responsibilities

| Layer | Owns | Must not own |
|-------|------|----------------|
| **UI** | Presentation, local form draft state, calling services | New entity SSOT, financial formulas, inventing ids via indexes |
| **Application services** | Use-case flow (e.g. “complete tadarok”), loading aggregates, persisting results | Raw SQL; ad-hoc duplicate entities |
| **Domain rules** | Completion, revision, quoting math, transition guards | React, HTTP, storage details |
| **Repository** | Mapping aggregate ↔ storage; transactions | Business policy branching (keep thin) |
| **Database** | Durability, constraints, sequences | UX labels |

---

## Mapping to today’s codebase (as-is)

| Future layer | Closest current home |
|--------------|----------------------|
| UI | React pages/components |
| Application services | Often Nabz `*Service.js` + page handlers (mixed) |
| Domain rules | `domain/customerCompletion`, `revisionEngine`, parts of quoting |
| Repository | **Partial** — `OrderRepository` (read + status only) |
| Database | **Absent** — memory + seeds |
| Client cache | `useContactsStore`, `useNabzStore`, page `useState` |

---

## Boundary rules (when persistence is funded)

1. UI never writes the database directly.  
2. One repository (or write API) per aggregate root: **Company**, **Order** first; Product next.  
3. Domain rules stay pure where possible; repositories apply results.  
4. Zustand becomes cache invalidated/refetched after successful repository writes — **not** replaced in this documentation phase.  
5. Financial writes (payments, invoices) go through repository methods that append audit/ledger entries.

---

## Out of scope now

- Creating repository classes beyond documentation  
- Introducing Prisma / PostgreSQL  
- Changing Zustand architecture  
- Changing existing APIs or routes  
