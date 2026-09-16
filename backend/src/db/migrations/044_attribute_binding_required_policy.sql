-- DDL-24(p) — one operator flag: is_required.
-- Identity follows required. Display is always on. TRANSACTION_ONLY is never
-- required/identity. Existing Product SKUs are not rewritten.

UPDATE product_type_attributes
SET is_required = false
WHERE attribute_role = 'TRANSACTION_ONLY' AND is_required IS DISTINCT FROM false;

UPDATE product_type_attributes
SET is_identity_relevant = is_required
WHERE is_identity_relevant IS DISTINCT FROM is_required;

UPDATE product_type_attributes
SET is_display_relevant = true
WHERE is_display_relevant IS DISTINCT FROM true;
