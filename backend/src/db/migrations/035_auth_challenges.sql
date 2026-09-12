-- DDL-41 — Authentication lifecycle challenges (invitation + OTP + password reset).
-- Additive only. Stores hashes, never raw tokens or OTP codes.
-- Persona is out of scope (DDL-40).

CREATE TABLE IF NOT EXISTS auth_challenges (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id),
  purpose TEXT NOT NULL,
  secret_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT REFERENCES users (id),
  CONSTRAINT auth_challenges_purpose_check
    CHECK (purpose IN ('INVITATION', 'OTP', 'PASSWORD_RESET')),
  CONSTRAINT auth_challenges_attempts_check
    CHECK (attempt_count >= 0)
);

CREATE INDEX IF NOT EXISTS auth_challenges_user_purpose_idx
  ON auth_challenges (user_id, purpose, created_at DESC);

CREATE INDEX IF NOT EXISTS auth_challenges_open_hash_idx
  ON auth_challenges (purpose, secret_hash)
  WHERE consumed_at IS NULL;
