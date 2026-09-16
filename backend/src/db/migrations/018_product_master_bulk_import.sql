-- Bulk Import / Mass Update bookkeeping (DDL-24g) — Vitrin-owned. Batches are
-- always recorded (dry-run and apply) for audit/idempotency inspection; row
-- results embed per-row accept/reject detail (no destructive updates on
-- validation failure — see backend/src/services/productBulkImportService.js).

CREATE TABLE IF NOT EXISTS product_bulk_import_batches (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL CHECK (mode IN ('DRY_RUN', 'APPLY')),
  total_rows INT NOT NULL DEFAULT 0,
  accepted_rows INT NOT NULL DEFAULT 0,
  rejected_rows INT NOT NULL DEFAULT 0,
  row_results JSONB NOT NULL DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_product_bulk_import_batches_created ON product_bulk_import_batches (created_at DESC);
