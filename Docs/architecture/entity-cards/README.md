# Entity Cards (machine registry)

> **Narrative ownership SSOT:** [../ENTITY_OWNERSHIP.md](../ENTITY_OWNERSHIP.md)  
> **Pipeline law:** [../ENTITY_DELIVERY_PIPELINE.md](../ENTITY_DELIVERY_PIPELINE.md)  
> **Schema:** [schema.json](./schema.json)

These YAML files are the **tooling-checkable** projection of Tier A/B entities. They do **not** replace ENTITY_OWNERSHIP or DOMAIN_DECISION_LOG — they must stay consistent with them.

## Commands

```bash
npm run check:entity-cards
```

## Files

| Card | Tier | Status |
|------|------|--------|
| [company.yaml](./company.yaml) | A | active |
| [order.yaml](./order.yaml) | A | active |
| [raw-lead.yaml](./raw-lead.yaml) | A | active |
| [activity.yaml](./activity.yaml) | A | active |
| [task.yaml](./task.yaml) | A | active |

## Adding a card

1. Pass DDL Gate  
2. Copy an existing YAML; fill required schema fields  
3. `id` must match filename (`company.yaml` → `id: company`)  
4. Run `npm run check:entity-cards`  
