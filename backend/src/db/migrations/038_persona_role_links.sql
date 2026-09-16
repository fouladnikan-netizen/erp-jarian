-- DDL-44 — Role 1—1 Persona, Persona 1—N Roles (catalog identity only).
-- Does not grant permissions. Does not alter role_permissions or user_roles.
-- Additive join table. Backfill from personas.role_code then clear that column.

CREATE TABLE IF NOT EXISTS persona_role_links (
  role_code TEXT PRIMARY KEY REFERENCES roles (code) ON DELETE CASCADE,
  persona_code TEXT NOT NULL REFERENCES personas (code) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS persona_role_links_persona_idx
  ON persona_role_links (persona_code);

INSERT INTO persona_role_links (role_code, persona_code)
SELECT p.role_code, p.code
FROM personas p
WHERE p.role_code IS NOT NULL
ON CONFLICT (role_code) DO NOTHING;

UPDATE personas SET role_code = NULL WHERE role_code IS NOT NULL;
