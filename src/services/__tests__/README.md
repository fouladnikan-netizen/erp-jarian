# Service tests location

There is no top-level `src/services/` application layer yet.

**Put service unit tests next to owning module services**, e.g.:

- `src/modules/nabz/services/__tests__/quotingService.test.js`

This folder is reserved so the quality layout matches the documented tree
(`Docs/architecture/QUALITY_ENGINEERING.md`). Do not add production code here.
