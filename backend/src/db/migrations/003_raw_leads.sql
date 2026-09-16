-- Raw Lead independent aggregate (DDL-13) — expand-only

CREATE TABLE IF NOT EXISTS raw_leads (
  id TEXT PRIMARY KEY,
  company_name TEXT NOT NULL,
  person_name TEXT,
  mobile TEXT,
  lead_source TEXT,
  description TEXT,
  activity_domain TEXT,
  status TEXT NOT NULL DEFAULT 'NEW'
    CHECK (status IN ('NEW', 'QUALIFYING', 'CONVERTED', 'REJECTED')),
  converted_company_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
  converted_at TIMESTAMPTZ,
  converted_by TEXT REFERENCES users(id),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT REFERENCES users(id),
  deleted_at TIMESTAMPTZ,
  deleted_by TEXT REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_raw_leads_company_name ON raw_leads (company_name);
CREATE INDEX IF NOT EXISTS idx_raw_leads_mobile ON raw_leads (mobile);
CREATE INDEX IF NOT EXISTS idx_raw_leads_status ON raw_leads (status);
CREATE INDEX IF NOT EXISTS idx_raw_leads_lead_source ON raw_leads (lead_source);
CREATE INDEX IF NOT EXISTS idx_raw_leads_converted_company ON raw_leads (converted_company_id);
CREATE INDEX IF NOT EXISTS idx_raw_leads_created ON raw_leads (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_raw_leads_active ON raw_leads (updated_at DESC)
  WHERE deleted_at IS NULL;
