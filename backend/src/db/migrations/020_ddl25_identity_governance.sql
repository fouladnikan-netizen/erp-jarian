-- DDL-25: Identity & Duplicate Governance
-- Partial UNIQUE on active companies.national_id; identity decision audit.

CREATE UNIQUE INDEX IF NOT EXISTS companies_national_id_active_unique
  ON companies (national_id)
  WHERE deleted_at IS NULL AND national_id IS NOT NULL AND national_id <> '';

CREATE TABLE IF NOT EXISTS identity_decisions (
  id BIGSERIAL PRIMARY KEY,
  actor_user_id TEXT REFERENCES users(id),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('company', 'contact', 'lead')),
  action TEXT NOT NULL,
  input_signals JSONB NOT NULL DEFAULT '{}'::jsonb,
  match_classification TEXT,
  match_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  candidate_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  decision TEXT,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_identity_decisions_entity
  ON identity_decisions (entity_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_identity_decisions_actor
  ON identity_decisions (actor_user_id, created_at DESC);
