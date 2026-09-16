## Summary

<!-- What changed and why (1–3 sentences). -->

## Checklist

- [ ] **Business impact** — Behavior / workflow / pricing / stage rules reviewed; no unintended rule changes
- [ ] **Architecture impact** — Touches domain, stores, module boundaries, or SSOT? Linked or noted in description
- [ ] **Tests added/updated** — Domain/service logic covered when applicable (`npm test`)
- [ ] **UI impact** — Visual/UX change called out; theme tokens + Jarian table presentation respected
- [ ] **Documentation updated** — README / architecture / CONTRIBUTING / Cursor rules updated if needed

## Entity Delivery (Tier A/B)

> Skip for Tier C (UI-only filters/tabs/selection). Law: `Docs/architecture/ENTITY_DELIVERY_PIPELINE.md`

- [ ] Architecture / DDL gate checked (`DOMAIN_DECISION_LOG`)
- [ ] Entity owner + aggregate root defined
- [ ] Entity Card added/updated (`Docs/architecture/entity-cards/`) + `npm run check:entity-cards`
- [ ] Migration added (versioned) and backward-safe / expand-first
- [ ] Backend repository used (no new SQL in Service for Tier A)
- [ ] Business rules outside UI / Express routes
- [ ] RBAC enforced on write/read routes
- [ ] Audit written for Tier A writes
- [ ] Frontend repository used (no scattered `fetch` for the aggregate)
- [ ] Zustand cache-only (Postgres SoR when API exists)
- [ ] Update policy declared (`SERVER_FIRST` default for money/lifecycle)
- [ ] Tests appropriate for tier (Tier A ≠ FE unit only)
- [ ] Backup / deploy impact checked (`Docs/architecture/BACKUP_RESTORE.md`, `Docs/architecture/DEPLOY_ROLLBACK.md`)

## Local verification

- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] `npm run check:entity-cards` (if Entity Card / Tier A/B touched)

## Notes

<!-- Screenshots, risk, rollout, follow-ups. -->
