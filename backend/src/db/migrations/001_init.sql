-- Jarian ERP v1 — Auth + Company + Order
-- Aligns with DOMAIN_DECISION_LOG: Company + Order aggregates; ContactPerson owned by Company.

CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roles (
  code TEXT PRIMARY KEY,
  label_fa TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_code TEXT NOT NULL REFERENCES roles(code) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_code)
);

CREATE TABLE IF NOT EXISTS permissions (
  code TEXT PRIMARY KEY,
  label_fa TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_code TEXT NOT NULL REFERENCES roles(code) ON DELETE CASCADE,
  permission_code TEXT NOT NULL REFERENCES permissions(code) ON DELETE CASCADE,
  PRIMARY KEY (role_code, permission_code)
);

-- Company aggregate (Kanoon) — DDL-01
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT 'CUSTOMER'
    CHECK (entity_type IN ('CUSTOMER', 'SUPPLIER', 'BOTH')),
  national_id TEXT,
  province TEXT,
  activity_domain TEXT,
  lifecycle_stage TEXT,
  phone TEXT,
  assignee_name TEXT,
  assignee_role TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT REFERENCES users(id),
  updated_by TEXT REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_companies_name ON companies (name);
CREATE INDEX IF NOT EXISTS idx_companies_entity_type ON companies (entity_type);
CREATE INDEX IF NOT EXISTS idx_companies_national_id ON companies (national_id);

-- ContactPerson owned by Company — DDL-02
CREATE TABLE IF NOT EXISTS contact_persons (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  mobile TEXT,
  role_title TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_persons_company ON contact_persons (company_id);
CREATE INDEX IF NOT EXISTS idx_contact_persons_mobile ON contact_persons (mobile);

-- Order aggregate (Nabz) — DDL-03; fat document in payload for v1
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  company_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
  title TEXT,
  stage_id TEXT NOT NULL DEFAULT 'inquiry',
  status TEXT NOT NULL DEFAULT 'open',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT REFERENCES users(id),
  updated_by TEXT REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_orders_company ON orders (company_id);
CREATE INDEX IF NOT EXISTS idx_orders_stage ON orders (stage_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_updated ON orders (updated_at DESC);

-- Append-only audit for sensitive mutations
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  actor_user_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log (created_at DESC);
