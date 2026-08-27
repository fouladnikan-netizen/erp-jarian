-- Personal Lead Pipeline (Ofogh) — expand-only
-- Orthogonal to raw_leads.status (NEW|QUALIFYING|CONVERTED|REJECTED)
-- and soft-delete archive (deleted_at).

CREATE TABLE IF NOT EXISTS lead_pipelines (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL DEFAULT 'پایپ‌لاین شخصی',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  deleted_by TEXT REFERENCES users(id)
);

-- One active personal pipeline per user
CREATE UNIQUE INDEX IF NOT EXISTS uq_lead_pipelines_owner_active
  ON lead_pipelines (owner_user_id)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS lead_pipeline_stages (
  id TEXT PRIMARY KEY,
  pipeline_id TEXT NOT NULL REFERENCES lead_pipelines(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  deleted_by TEXT REFERENCES users(id),
  CONSTRAINT lead_pipeline_stages_name_nonempty CHECK (length(trim(name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_lead_pipeline_stages_pipeline_pos
  ON lead_pipeline_stages (pipeline_id, position)
  WHERE deleted_at IS NULL;

-- Unique stage name per pipeline (active rows only; case-insensitive trim)
CREATE UNIQUE INDEX IF NOT EXISTS uq_lead_pipeline_stages_name
  ON lead_pipeline_stages (pipeline_id, lower(trim(name)))
  WHERE deleted_at IS NULL;

ALTER TABLE raw_leads
  ADD COLUMN IF NOT EXISTS pipeline_stage_id TEXT
    REFERENCES lead_pipeline_stages(id) ON DELETE SET NULL;

ALTER TABLE raw_leads
  ADD COLUMN IF NOT EXISTS archive_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_raw_leads_pipeline_stage
  ON raw_leads (pipeline_stage_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_raw_leads_created_by
  ON raw_leads (created_by)
  WHERE deleted_at IS NULL;
