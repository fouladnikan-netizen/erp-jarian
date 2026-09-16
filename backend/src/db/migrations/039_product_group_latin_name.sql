-- Product Group Latin display name (DDL-24j) — expand-only.
-- Display/export label only. Not part of SKU, canonical identity, or duplicate detection.

ALTER TABLE product_groups
  ADD COLUMN IF NOT EXISTS name_latin TEXT;
