-- Soft-delete / archive columns — no hard DELETE on Company/Order (BACKEND_FOUNDATION)

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by TEXT REFERENCES users(id);

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by TEXT REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_companies_active ON companies (updated_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_active ON orders (updated_at DESC)
  WHERE deleted_at IS NULL;
