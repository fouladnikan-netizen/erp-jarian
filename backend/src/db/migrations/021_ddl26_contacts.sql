-- DDL-26: Canonical Contact entity (Kanoon-owned)

CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  mobile TEXT,
  mobile_normalized TEXT,
  email TEXT,
  email_normalized TEXT,
  full_name_normalized TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT REFERENCES users(id),
  updated_by TEXT REFERENCES users(id),
  deleted_at TIMESTAMPTZ,
  deleted_by TEXT REFERENCES users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS contacts_mobile_active_unique
  ON contacts (mobile_normalized)
  WHERE deleted_at IS NULL AND mobile_normalized IS NOT NULL AND mobile_normalized <> '';

CREATE INDEX IF NOT EXISTS idx_contacts_name_normalized
  ON contacts (full_name_normalized)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_email_normalized
  ON contacts (email_normalized)
  WHERE deleted_at IS NULL AND email_normalized IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_active
  ON contacts (updated_at DESC)
  WHERE deleted_at IS NULL;
