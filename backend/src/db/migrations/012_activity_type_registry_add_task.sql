-- Gap 1 follow-up: `OfoqRawLeadDetailModal.jsx` already shipped a 6th
-- hardcoded Activity type option ('task' / "وظیفه") not covered by the
-- initial 010 seed audit. Adding it here (expand-only) preserves existing
-- product behavior instead of silently removing a shipped option.
--
-- NOTE: this is an Activity subtype label ("logged as a task-like note"),
-- NOT the canonical Pooyesh Task entity (DDL-15/DDL-16: Task ≠ Activity).
INSERT INTO activity_type_registry (key, label_fa, sort_order, is_active) VALUES
  ('task', 'وظیفه', 60, true)
ON CONFLICT (key) DO NOTHING;
