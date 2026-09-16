-- DDL-38 — Unique Role display name after normalization (expand-only).
-- Inactive roles participate. No drops. No merge/delete of existing rows.
-- Function must stay aligned with backend/src/domain/rbac/normalizeRoleLabel.js

CREATE OR REPLACE FUNCTION jarian_normalize_role_label(input TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT lower(
    btrim(
      regexp_replace(
        translate(COALESCE(input, ''), 'يك', 'یک'),
        '\s+',
        ' ',
        'g'
      )
    )
  );
$$;

ALTER TABLE roles
  ADD COLUMN IF NOT EXISTS label_fa_normalized TEXT
  GENERATED ALWAYS AS (jarian_normalize_role_label(label_fa)) STORED;

CREATE UNIQUE INDEX IF NOT EXISTS roles_label_fa_normalized_uidx
  ON roles (label_fa_normalized);
