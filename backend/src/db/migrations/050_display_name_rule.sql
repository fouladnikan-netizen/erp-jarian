-- DDL-52 — Product Type display-name rule (independent of SKU).
-- Tokens reference taxonomy nodes or attribute_definitions.id.
-- Changing this JSON does not rewrite existing Product.generated_name
-- until that Product is created/updated.

ALTER TABLE product_types
  ADD COLUMN IF NOT EXISTS display_name_rule JSONB;
