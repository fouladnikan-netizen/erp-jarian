-- DDL-51 — Required Attribute is the only Product identity.
-- Optional Attribute (length, alloy_size, strip_width) = TRANSACTION required.
-- Offer Variant stays TRANSACTION optional. Does not rewrite issued Product SKUs.

UPDATE product_type_attributes AS pta
SET is_required = true
FROM attribute_definitions AS d
WHERE d.id = pta.attribute_definition_id
  AND pta.is_active = true
  AND pta.value_scope = 'TRANSACTION'
  AND d.code IN ('length', 'alloy_size', 'strip_width');

UPDATE product_type_attributes AS pta
SET is_identity_relevant = (
  pta.is_active = true
  AND pta.value_scope = 'PRODUCT'
  AND pta.is_required = true
  AND d.data_type IN ('DECIMAL', 'INTEGER', 'ENUM')
)
FROM attribute_definitions AS d
WHERE d.id = pta.attribute_definition_id;
