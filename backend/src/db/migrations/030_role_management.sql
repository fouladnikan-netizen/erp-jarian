-- DDL-35 — Role administration (expand-only).
-- Existing role codes and role_permissions rows are preserved.
-- No hard delete. Inactive roles remain on user_roles and still grant
-- permissions (loadUserAuth is unchanged).

ALTER TABLE roles
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE roles SET description = 'مدیریت کامل سامانه، کاربران و پیکربندی' WHERE code = 'admin' AND description = '';
UPDATE roles SET description = 'مدیریت فروش و پیگیری تیم' WHERE code = 'sales_manager' AND description = '';
UPDATE roles SET description = 'کارشناس فروش — ثبت و پیگیری سفارش و مشتری' WHERE code = 'sales' AND description = '';
UPDATE roles SET description = 'تدارکات و تأمین کالا' WHERE code = 'purchase' AND description = '';
UPDATE roles SET description = 'حسابداری — مشاهده سفارش، شرکت و مکاتبات' WHERE code = 'accounting' AND description = '';
