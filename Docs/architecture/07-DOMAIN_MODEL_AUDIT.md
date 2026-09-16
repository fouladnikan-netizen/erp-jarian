# Domain Model Audit (DDD)

> **Status:** Audit only — no redesign.  
> **Canvas:** `jarian-domain-model-audit.canvas.tsx`  
> **Overall Domain Score: 4.1 / 10**

## Verdict

Two real write aggregates: **Company** and **Order**. Opportunity is a view on Company. Activity, Shipment, Invoice, Payment, Document, CalendarEvent are embedded projections or mocks — not first-class entities. Weakest dimensions: **Identity**, **Ownership**, **Scalability**.

## Scorecard

| Dimension | Score |
|-----------|------:|
| Domain Model | 4.5 |
| Entity Design | 5.0 |
| Relationships | 4.0 |
| Ownership | 3.5 |
| Aggregate Design | 5.5 |
| Policies | 5.0 |
| Identity | 3.0 |
| Scalability | 2.5 |
| Maintainability | 3.5 |
| **Overall** | **4.1** |

## Aggregate roots (current)

| Root | Owns | Risk |
|------|------|------|
| Company | ContactPerson, Interaction, lifecycle, financial/legal snapshots | Opportunity collision; denorm relatedOrders |
| Order | Lines→Inquiries, Quoting, Gateway, Proforma, Tadarok/PO, QC, Shipping, Rahsepar, Saranjam, CRM, Events, Revisions | God-aggregate |
| Product* | Weak — component state | Not a real aggregate |
| Campaign/Survey/Org/User | Isolated mocks | Disconnected from ops |

## Ownership conflicts

| Concept | Conflict |
|---------|----------|
| Activity | پویش claims; data in Company.interactions + Order.crmActivities + stub |
| Opportunity | افق owns view; entity = Company |
| Shipment / Documents / Payments | Embedded in Order — no roots |
| Products | Vitrin local state; Nabz snapshots |
| Supplier | `suppliers.js` reads seed, not `useContactsStore` |

## Key policies (locations)

- Customer Completion → `src/domain/customerCompletion/`
- Stage / gateway / tadarok / rahsepar / saranjam → many `src/modules/nabz/*Service.js`
- Quoting → `src/modules/nabz/services/quotingService.js`
- RBAC → Shirazeh registry (**not enforced** on Nabz/Ofogh)
- Settlement math also in `SaranjamTab.jsx` (scattered)

## Top Critical / High risks

1. No business DB persistence  
2. Order god-aggregate  
3. Dual Order status models  
4. Activity ownership split  
5. Unstable IDs  
6. Supplier SSOT bypass  
7. Product not store-backed  
8. Multiple role taxonomies  

Full catalog, ER diagram, policy map, SSOT map, Top 20 risks: open the Canvas or see companion IA docs under `Docs/ia/`.
