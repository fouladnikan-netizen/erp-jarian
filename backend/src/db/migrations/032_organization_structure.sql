-- DDL-37 — Organization structure (new tables only).
-- Person nodes reference users.id. No mock-user backfill. No drops.

CREATE TABLE IF NOT EXISTS organization_units (
  id TEXT PRIMARY KEY,
  parent_id TEXT REFERENCES organization_units(id) ON DELETE RESTRICT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT organization_units_parent_not_self CHECK (parent_id IS DISTINCT FROM id)
);

CREATE TABLE IF NOT EXISTS organization_positions (
  id TEXT PRIMARY KEY,
  unit_id TEXT NOT NULL REFERENCES organization_units(id) ON DELETE RESTRICT,
  code TEXT,
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS organization_positions_unit_title_idx
  ON organization_positions (unit_id, title)
  WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS user_organization_assignments (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  unit_id TEXT NOT NULL REFERENCES organization_units(id) ON DELETE RESTRICT,
  position_id TEXT REFERENCES organization_positions(id) ON DELETE SET NULL,
  is_manager BOOLEAN NOT NULL DEFAULT FALSE,
  is_primary BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS user_organization_assignments_one_manager
  ON user_organization_assignments (unit_id)
  WHERE is_manager = TRUE AND is_primary = TRUE;

INSERT INTO organization_units (id, parent_id, code, name, sort_order, is_active)
VALUES ('ou_root', NULL, 'ROOT', 'سازمان', 0, TRUE)
ON CONFLICT (id) DO NOTHING;
