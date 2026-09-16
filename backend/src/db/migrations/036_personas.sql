-- DDL-42 — Persona as persisted Definitions data (extends DDL-40).
-- Additive only. Persona is not authorization and is not on users.
-- Seed inserts missing codes only; never overwrites name/domain.

CREATE TABLE IF NOT EXISTS personas (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT personas_code_format_check
    CHECK (code ~ '^[A-Z][A-Z0-9_]{1,47}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS personas_code_uidx ON personas (code);

CREATE INDEX IF NOT EXISTS personas_active_idx ON personas (is_active, code);

INSERT INTO personas (id, code, name, domain, is_active) VALUES
  ('prs_sales', 'SALES', 'شوالیه', 'فروش', TRUE),
  ('prs_procurement', 'PROCUREMENT', 'سامورایی', 'تأمین', TRUE),
  ('prs_finance', 'FINANCE', 'مُستوفی', 'مالی و حسابداری', TRUE),
  ('prs_logistics', 'LOGISTICS', 'قافله‌سالار', 'لجستیک', TRUE),
  ('prs_quality', 'QUALITY', 'عیارگر', 'کنترل کیفیت', TRUE),
  ('prs_system', 'SYSTEM', 'سپهسالار', 'مدیریت سیستم', TRUE)
ON CONFLICT (code) DO NOTHING;
