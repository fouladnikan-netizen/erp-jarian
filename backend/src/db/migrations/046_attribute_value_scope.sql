-- DDL-46 — Required, Value Scope, and type-level Allowed Values are independent.
-- Expand-only. Does NOT rewrite is_identity_relevant, canonical_identity_key, or sku.

ALTER TABLE product_type_attributes
  ADD COLUMN IF NOT EXISTS value_scope TEXT;

UPDATE product_type_attributes
SET value_scope = CASE
  WHEN attribute_role = 'TRANSACTION_ONLY' THEN 'TRANSACTION'
  ELSE 'PRODUCT'
END
WHERE value_scope IS NULL;

ALTER TABLE product_type_attributes
  ALTER COLUMN value_scope SET DEFAULT 'PRODUCT';

ALTER TABLE product_type_attributes
  ALTER COLUMN value_scope SET NOT NULL;

DO $$
BEGIN
  ALTER TABLE product_type_attributes
    ADD CONSTRAINT product_type_attributes_value_scope_check
    CHECK (value_scope IN ('PRODUCT', 'TRANSACTION'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE product_type_attributes
  ADD COLUMN IF NOT EXISTS override_allowed_values JSONB;
