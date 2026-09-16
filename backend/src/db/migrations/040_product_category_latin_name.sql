-- Product Category Latin display name (DDL-24k) — expand-only.
-- Display/export label only. Not part of SKU, canonical identity, or duplicate detection.

ALTER TABLE product_categories
  ADD COLUMN IF NOT EXISTS name_latin TEXT;
