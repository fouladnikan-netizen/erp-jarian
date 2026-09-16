-- DDL-26: CompanyContactRelationship — M:N link between Company and Contact

CREATE TABLE IF NOT EXISTS company_contact_relationships (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
  role_title TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT REFERENCES users(id),
  updated_by TEXT REFERENCES users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS ccr_active_company_contact_unique
  ON company_contact_relationships (company_id, contact_id)
  WHERE ended_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ccr_one_primary_per_company
  ON company_contact_relationships (company_id)
  WHERE is_primary = TRUE AND ended_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ccr_company_active
  ON company_contact_relationships (company_id)
  WHERE ended_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ccr_contact_active
  ON company_contact_relationships (contact_id)
  WHERE ended_at IS NULL;

-- Backfill tracking column on legacy embed (migration script uses both)
ALTER TABLE contact_persons
  ADD COLUMN IF NOT EXISTS migrated_contact_id TEXT REFERENCES contacts(id),
  ADD COLUMN IF NOT EXISTS migrated_relationship_id TEXT REFERENCES company_contact_relationships(id);
