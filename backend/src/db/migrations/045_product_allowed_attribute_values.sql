-- DDL-45 — Product-level allowed ENUM subset (order-time options).
-- Expand-only. Not identity, not SKU, not a second Attribute Definition.
-- Values are validated at the service layer against attribute_definitions.allowed_values.

CREATE TABLE IF NOT EXISTS product_allowed_attribute_values (
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  attribute_definition_id TEXT NOT NULL REFERENCES attribute_definitions(id),
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (product_id, attribute_definition_id, value)
);

CREATE INDEX IF NOT EXISTS idx_product_allowed_attr_def
  ON product_allowed_attribute_values (attribute_definition_id);
