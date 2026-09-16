-- Follow-up → canonical Task linkage (Gap 2) — expand-only.
-- First-class FK column (preferred over a payload key: queryable, auditable,
-- consistent with `assigned_to`/`created_by` modeling on this table).

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS source_activity_id TEXT REFERENCES activities(id);

CREATE INDEX IF NOT EXISTS idx_tasks_source_activity
  ON tasks (source_activity_id)
  WHERE source_activity_id IS NOT NULL;
