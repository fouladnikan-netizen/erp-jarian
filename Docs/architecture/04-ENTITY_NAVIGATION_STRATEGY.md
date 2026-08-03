# Entity Navigation Strategy

> **Status: Strategy only.** Current score ~3.7/10. Target ~8.5/10 after workspaces.  
> Detail: [`../ia/04-ENTITY_NAVIGATION_AUDIT.md`](../ia/04-ENTITY_NAVIGATION_AUDIT.md).

## Current graph (simplified)

```
Module shell → Company | Order | Ofogh(modal) | Calendar | Product | User
Opportunity → Company | Order | Activity(in-modal)
Company → Order | ContactPerson(modal) | Activity(in-page)
Calendar → Company | Order
```

## Target rules (future)

| Entity | Rule |
|--------|------|
| Company / Order | Workspace hubs; addressable L2/L3 |
| Opportunity | Facet of Company until volume requires own id |
| ContactPerson | Always under Company; never orphan route without `companyId` |
| Activity | Single SSOT (پویش); `subjectType` + `subjectId` |
| Calendar Event | Projection; dive opens hub |
| Product | Catalog browse; Order lines link with context |
| User | Assignee → user read page; not an ops hub |

## Developer rules now

1. New entity UIs: prefer **page route** for durable work; modal only for short tasks
2. New profiles: follow [PROFILE_LAYOUT_GUIDELINES.md](./PROFILE_LAYOUT_GUIDELINES.md)
3. Do not invent a third hub besides Company/Order without architecture review
4. Do not wire Activity as a fourth embedding stream — prefer extending existing host or documenting debt in [06-FUTURE_RECOMMENDATIONS.md](./06-FUTURE_RECOMMENDATIONS.md)
