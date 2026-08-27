-- Pooyesh Activity independent aggregate (DDL-15) — expand-only

CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,

  subject_type TEXT NOT NULL
    CHECK (subject_type IN ('COMPANY', 'RAW_LEAD')),
  subject_id TEXT NOT NULL,

  activity_type TEXT NOT NULL DEFAULT 'note',
  title TEXT,
  description TEXT,

  status TEXT NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN', 'COMPLETED')),

  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  assigned_to TEXT REFERENCES users(id),

  payload JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT REFERENCES users(id),
  deleted_at TIMESTAMPTZ,
  deleted_by TEXT REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_activities_subject
  ON activities (subject_type, subject_id);

CREATE INDEX IF NOT EXISTS idx_activities_status
  ON activities (status);

CREATE INDEX IF NOT EXISTS idx_activities_occurred
  ON activities (occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_activities_created
  ON activities (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activities_assigned
  ON activities (assigned_to);

CREATE INDEX IF NOT EXISTS idx_activities_active
  ON activities (updated_at DESC)
  WHERE deleted_at IS NULL;
