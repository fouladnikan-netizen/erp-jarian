-- Product Type / Product offer settings (DDL-47).
-- Count unit and sales unit reuse existing UOM relations:
--   Product Type: default_count_unit_id / default_sales_unit_id → uom_registry
--   Product:      base_uom_id (count) / sales_uom_id (sales) — no parallel FKs
-- New facts only: default/unit weight (commercial, not weight_profile_*)
--                 and custom_length_allowed.
-- Type default changes do not rewrite existing Products.

ALTER TABLE product_types
  ADD COLUMN IF NOT EXISTS default_count_unit_id TEXT REFERENCES uom_registry(id),
  ADD COLUMN IF NOT EXISTS default_sales_unit_id TEXT REFERENCES uom_registry(id),
  ADD COLUMN IF NOT EXISTS default_unit_weight NUMERIC,
  ADD COLUMN IF NOT EXISTS custom_length_allowed BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE product_types
  DROP CONSTRAINT IF EXISTS product_types_default_unit_weight_positive;
ALTER TABLE product_types
  ADD CONSTRAINT product_types_default_unit_weight_positive
  CHECK (default_unit_weight IS NULL OR default_unit_weight > 0);

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS unit_weight NUMERIC,
  ADD COLUMN IF NOT EXISTS custom_length_allowed BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_unit_weight_positive;
ALTER TABLE products
  ADD CONSTRAINT products_unit_weight_positive
  CHECK (unit_weight IS NULL OR unit_weight > 0);

-- Fill catalog gaps from the operator unit list. Existing codes (KG, TON,
-- METER, PIECE=عدد, BRANCH=شاخه, SHEET, ROLL, PACK) stay as-is.
INSERT INTO uom_registry (id, code, name_fa, category, is_active) VALUES
  ('uom_square_meter', 'SQUARE_METER', 'متر مربع', 'AREA', true),
  ('uom_cubic_meter', 'CUBIC_METER', 'متر مکعب', 'VOLUME', true),
  ('uom_pair', 'PAIR', 'جفت', 'COUNT', true),
  ('uom_coil', 'COIL', 'کلاف', 'COUNT', true)
ON CONFLICT (code) DO NOTHING;

UPDATE uom_registry
   SET name_fa = 'متر طول', updated_at = NOW()
 WHERE code = 'METER' AND name_fa = 'متر';
