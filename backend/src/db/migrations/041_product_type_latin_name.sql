-- Product Type Latin display name (DDL-24l) — expand-only.
-- Display/export label only. Not part of SKU, canonical identity, or duplicate detection.

ALTER TABLE product_types
  ADD COLUMN IF NOT EXISTS name_latin TEXT;
