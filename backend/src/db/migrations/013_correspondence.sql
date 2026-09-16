-- Gahshomar Correspondence independent aggregate (DDL-23) — expand-only.
-- Official secretariat letters (incoming / outgoing / internal memo).

-- Shirazeh-driven Correspondence Type Registry (DDL-23d) — same shape/reasoning
-- as activity_type_registry (010_activity_type_registry.sql): correspondence.type_key
-- stays free TEXT (no FK) so a since-deactivated type never breaks historical rows.
CREATE TABLE IF NOT EXISTS correspondence_type_registry (
  key TEXT PRIMARY KEY,
  label_fa TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_correspondence_type_registry_active_order
  ON correspondence_type_registry (is_active, sort_order);

INSERT INTO correspondence_type_registry (key, label_fa, sort_order, is_active) VALUES
  ('OFFICIAL', 'رسمی', 10, true),
  ('INTERNAL', 'داخلی', 20, true),
  ('ESTELAM', 'استعلام', 30, true),
  ('GHARARDAD', 'قرارداد', 40, true),
  ('PASOKH', 'پاسخ', 50, true),
  ('ELAMIEH', 'اعلامیه', 60, true)
ON CONFLICT (key) DO NOTHING;

-- Concurrency-safe official numbering (DDL-23a).
-- One row per (year_short, direction_code); atomic INSERT..ON CONFLICT..RETURNING
-- avoids the read-then-write race a plain SELECT MAX + client compute would have.
CREATE TABLE IF NOT EXISTS correspondence_number_counters (
  year_short TEXT NOT NULL,
  direction_code TEXT NOT NULL CHECK (direction_code IN ('IN', 'OUT', 'INT')),
  next_seq INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (year_short, direction_code)
);

CREATE TABLE IF NOT EXISTS correspondence (
  id TEXT PRIMARY KEY,

  direction TEXT NOT NULL
    CHECK (direction IN ('INCOMING', 'OUTGOING', 'INTERNAL')),
  type_key TEXT NOT NULL DEFAULT 'OFFICIAL',

  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'FINAL')),

  -- Official registry number — assigned ONLY at finalize (DDL-23a). NULL while DRAFT.
  official_number TEXT,

  subject TEXT NOT NULL,

  -- Audit trail of content evolution (DDL product rule 10 / DDL-23c):
  -- raw_body = original user text (never overwritten after first save).
  -- ai_rewritten_body = last AI output shown to the user for review (nullable).
  -- final_body = the body that was accepted/edited by the human and persisted at FINAL.
  raw_body TEXT,
  ai_rewritten_body TEXT,
  final_body TEXT,

  record_date TEXT,
  received_date TEXT,

  attention_name TEXT,

  sender_party JSONB NOT NULL DEFAULT '{}'::jsonb,
  receiver_party JSONB NOT NULL DEFAULT '{}'::jsonb,

  company_id TEXT,
  order_id TEXT,

  thread_id TEXT,
  reference_id TEXT,

  assignee_user_id TEXT REFERENCES users(id),
  assignee_name TEXT,

  tags JSONB NOT NULL DEFAULT '[]'::jsonb,

  issued_at TIMESTAMPTZ,
  issued_by TEXT,
  issuer_title TEXT,

  finalized_at TIMESTAMPTZ,
  finalized_by TEXT REFERENCES users(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT REFERENCES users(id),
  deleted_at TIMESTAMPTZ,
  deleted_by TEXT REFERENCES users(id),

  -- Numbering never trusted from client; unique once assigned (DDL-23a safety net).
  CONSTRAINT correspondence_official_number_unique UNIQUE (official_number)
);

CREATE INDEX IF NOT EXISTS idx_correspondence_direction
  ON correspondence (direction);

CREATE INDEX IF NOT EXISTS idx_correspondence_status
  ON correspondence (status);

CREATE INDEX IF NOT EXISTS idx_correspondence_company
  ON correspondence (company_id);

CREATE INDEX IF NOT EXISTS idx_correspondence_order
  ON correspondence (order_id);

CREATE INDEX IF NOT EXISTS idx_correspondence_thread
  ON correspondence (thread_id);

CREATE INDEX IF NOT EXISTS idx_correspondence_created
  ON correspondence (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_correspondence_active
  ON correspondence (updated_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_correspondence_subject_trgm
  ON correspondence (subject);

-- Attachments (DDL-23b): base64 bytes in a dedicated child table, Gahshomar-owned only.
CREATE TABLE IF NOT EXISTS correspondence_attachments (
  id TEXT PRIMARY KEY,
  correspondence_id TEXT NOT NULL REFERENCES correspondence(id) ON DELETE CASCADE,

  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INT,
  data_base64 TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_correspondence_attachments_correspondence
  ON correspondence_attachments (correspondence_id);
