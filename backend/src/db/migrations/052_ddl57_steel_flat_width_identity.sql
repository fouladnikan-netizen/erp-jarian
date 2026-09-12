-- DDL-57 — mill-produced steel flat width is Product identity (with thickness).
-- Supersedes DDL-51's global strip_width → TRANSACTION backfill for تسمه فولادی only.
-- Meter length stays TRANSACTION. Does not rewrite issued Product SKUs.

UPDATE product_type_attributes AS pta
SET
  value_scope = 'PRODUCT',
  attribute_role = 'MASTER_ONLY',
  is_required = true,
  is_identity_relevant = true
FROM attribute_definitions AS d, product_types AS pt
WHERE pta.attribute_definition_id = d.id
  AND pta.product_type_id = pt.id
  AND d.code = 'strip_width'
  AND pt.name = 'تسمه فولادی'
  AND pta.is_active = true;
