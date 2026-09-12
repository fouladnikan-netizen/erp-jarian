-- DDL-43 — Persona create allocates persona_N; optional 1:1 link to a Role.
-- Persona still does not grant permissions. Link is catalog-only.
-- Additive. Seeded personas keep NULL role_code.

ALTER TABLE personas ALTER COLUMN domain SET DEFAULT '';

ALTER TABLE personas DROP CONSTRAINT IF EXISTS personas_code_format_check;
ALTER TABLE personas
  ADD CONSTRAINT personas_code_format_check
  CHECK (
    code ~ '^[A-Z][A-Z0-9_]{1,47}$'
    OR code ~ '^persona_[0-9]+$'
  );

ALTER TABLE personas ADD COLUMN IF NOT EXISTS role_code TEXT REFERENCES roles (code) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS personas_role_code_uidx
  ON personas (role_code)
  WHERE role_code IS NOT NULL;
