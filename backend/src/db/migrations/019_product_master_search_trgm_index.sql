-- Fix: idx_products_generated_name_trgm (017) was a plain btree index despite
-- its name — btree cannot serve leading-wildcard ILIKE '%text%' used by
-- productRepository.search's `filters.text` clause, so it was always a Seq
-- Scan in practice (verified via EXPLAIN). Replace with a real pg_trgm GIN
-- index covering both generated_name and display_name_override (the two
-- columns that clause searches). Expand-only / idempotent.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

DROP INDEX IF EXISTS idx_products_generated_name_trgm;

CREATE INDEX IF NOT EXISTS idx_products_generated_name_trgm
  ON products USING GIN (generated_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_display_name_override_trgm
  ON products USING GIN (display_name_override gin_trgm_ops);
