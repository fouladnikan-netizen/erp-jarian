-- DDL-59 — retire Product Relationships (Vitrin).
-- Table and permission are removed; Product SKU remains the aggregate.
-- role_permissions rows cascade via permissions(code) ON DELETE CASCADE.

DROP TABLE IF EXISTS product_relationships;

DELETE FROM permissions WHERE code = 'products:manage-relationships';
