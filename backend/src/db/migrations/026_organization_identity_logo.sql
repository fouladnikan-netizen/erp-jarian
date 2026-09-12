-- DDL-31 — canonical Organization Identity logo (expand-only).
-- Bytes live in a sibling table (DDL-23b pattern). Not on organization_identity.
-- Existing identity row is preserved; logo_file_id stays NULL until first upload.

CREATE TABLE IF NOT EXISTS organization_identity_logo (
  id TEXT PRIMARY KEY,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INT NOT NULL,
  data_base64 TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT REFERENCES users(id)
);

ALTER TABLE organization_identity
  ADD COLUMN IF NOT EXISTS logo_file_id TEXT REFERENCES organization_identity_logo(id);
