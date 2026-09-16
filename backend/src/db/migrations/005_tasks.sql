-- Pooyesh Task independent aggregate (DDL-16) — expand-only
-- Task ≠ Activity (DDL-15)

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,

  subject_type TEXT NOT NULL
    CHECK (subject_type IN ('COMPANY', 'RAW_LEAD')),
  subject_id TEXT NOT NULL,

  title TEXT NOT NULL,
  description TEXT,

  status TEXT NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

  assigned_to TEXT REFERENCES users(id),

  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  payload JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT REFERENCES users(id),
  deleted_at TIMESTAMPTZ,
  deleted_by TEXT REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_tasks_subject
  ON tasks (subject_type, subject_id);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned
  ON tasks (assigned_to);

CREATE INDEX IF NOT EXISTS idx_tasks_status
  ON tasks (status);

CREATE INDEX IF NOT EXISTS idx_tasks_due
  ON tasks (due_at);

CREATE INDEX IF NOT EXISTS idx_tasks_created
  ON tasks (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_active
  ON tasks (updated_at DESC)
  WHERE deleted_at IS NULL;
