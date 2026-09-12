-- DDL-28 — Organization Identity singleton (expand-only, new table).
-- Does not alter companies / orders / users or any existing production data.
-- One row only: id = 'org'. Identifiers are TEXT so leading zeros are preserved.
-- Logo binary is intentionally not stored here.

CREATE TABLE IF NOT EXISTS organization_identity (
  id TEXT PRIMARY KEY CHECK (id = 'org'),
  trade_name TEXT NOT NULL,
  legal_name TEXT NOT NULL,
  national_id TEXT NOT NULL,
  legal_person_type TEXT CHECK (legal_person_type IS NULL OR legal_person_type IN ('legal', 'natural')),
  registration_number TEXT,
  economic_number TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  fax TEXT,
  province TEXT,
  city TEXT,
  official_address TEXT,
  postal_code TEXT,
  bank_name TEXT,
  bank_account_number TEXT,
  iban TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT REFERENCES users(id)
);
