-- DDL-36 — Permission catalog (expand-only).
-- Canonical permission codes stay colon-form. role_permissions unchanged.
-- No drops. New sensitive rows are catalog-only (no route enforcement).

ALTER TABLE permissions
  ADD COLUMN IF NOT EXISTS resource TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS action TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_sensitive BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE permissions SET resource = 'companies', action = 'read', category = 'کانون', is_sensitive = FALSE WHERE code = 'companies:read';
UPDATE permissions SET resource = 'companies', action = 'write', category = 'کانون', is_sensitive = FALSE WHERE code = 'companies:write';
UPDATE permissions SET resource = 'orders', action = 'read', category = 'نبض', is_sensitive = FALSE WHERE code = 'orders:read';
UPDATE permissions SET resource = 'orders', action = 'write', category = 'نبض', is_sensitive = FALSE WHERE code = 'orders:write';
UPDATE permissions SET resource = 'leads', action = 'read', category = 'افق', is_sensitive = FALSE WHERE code = 'leads:read';
UPDATE permissions SET resource = 'leads', action = 'write', category = 'افق', is_sensitive = FALSE WHERE code = 'leads:write';
UPDATE permissions SET resource = 'leads', action = 'convert', category = 'افق', is_sensitive = FALSE WHERE code = 'leads:convert';
UPDATE permissions SET resource = 'activities', action = 'read', category = 'پویش', is_sensitive = FALSE WHERE code = 'activities:read';
UPDATE permissions SET resource = 'activities', action = 'write', category = 'پویش', is_sensitive = FALSE WHERE code = 'activities:write';
UPDATE permissions SET resource = 'tasks', action = 'read', category = 'پویش', is_sensitive = FALSE WHERE code = 'tasks:read';
UPDATE permissions SET resource = 'tasks', action = 'write', category = 'پویش', is_sensitive = FALSE WHERE code = 'tasks:write';
UPDATE permissions SET resource = 'correspondence', action = 'read', category = 'گاه‌شمار', is_sensitive = FALSE WHERE code = 'correspondence:read';
UPDATE permissions SET resource = 'correspondence', action = 'write', category = 'گاه‌شمار', is_sensitive = FALSE WHERE code = 'correspondence:write';
UPDATE permissions SET resource = 'correspondence', action = 'finalize', category = 'گاه‌شمار', is_sensitive = FALSE WHERE code = 'correspondence:finalize';
UPDATE permissions SET resource = 'users', action = 'admin', category = 'شیرازه', is_sensitive = TRUE WHERE code = 'users:admin';
UPDATE permissions SET resource = 'products', action = 'read', category = 'ویترین', is_sensitive = FALSE WHERE code = 'products:read';
UPDATE permissions SET resource = 'products', action = 'write', category = 'ویترین', is_sensitive = FALSE WHERE code = 'products:write';
UPDATE permissions SET resource = 'products', action = 'lifecycle', category = 'ویترین', is_sensitive = FALSE WHERE code = 'products:lifecycle';
UPDATE permissions SET resource = 'products', action = 'manage-relationships', category = 'ویترین', is_sensitive = FALSE WHERE code = 'products:manage-relationships';
UPDATE permissions SET resource = 'products', action = 'manage-taxonomy', category = 'شیرازه', is_sensitive = FALSE WHERE code = 'products:manage-taxonomy';
UPDATE permissions SET resource = 'products', action = 'manage-brands', category = 'شیرازه', is_sensitive = FALSE WHERE code = 'products:manage-brands';
UPDATE permissions SET resource = 'products', action = 'bulk-import', category = 'ویترین', is_sensitive = FALSE WHERE code = 'products:bulk-import';

INSERT INTO permissions (code, label_fa, resource, action, category, is_sensitive, is_active)
VALUES
  ('orders:view_cost', 'مشاهده قیمت خرید', 'orders', 'view_cost', 'مالی', TRUE, TRUE),
  ('orders:edit_sale_price', 'تغییر قیمت فروش', 'orders', 'edit_sale_price', 'مالی', TRUE, TRUE),
  ('orders:view_profit', 'مشاهده سود', 'orders', 'view_profit', 'مالی', TRUE, TRUE)
ON CONFLICT (code) DO UPDATE SET
  label_fa = EXCLUDED.label_fa,
  resource = EXCLUDED.resource,
  action = EXCLUDED.action,
  category = EXCLUDED.category,
  is_sensitive = EXCLUDED.is_sensitive;

INSERT INTO role_permissions (role_code, permission_code)
SELECT 'admin', p.code
FROM permissions p
WHERE p.code IN ('orders:view_cost', 'orders:edit_sale_price', 'orders:view_profit')
ON CONFLICT DO NOTHING;
