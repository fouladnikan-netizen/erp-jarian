-- Product Master Attribute Engine (DDL-24) — Shirazeh-owned, expand-only.
-- Controlled Attribute Definition + per-Product-Type schema binding (avoids
-- EAV chaos: attribute identity/type/validation metadata lives centrally in
-- attribute_definitions; product_type_attributes only binds+configures which
-- definitions apply to which Product Type, plus per-binding overrides and the
-- Master-vs-Transactional classification, DDL-24d).

CREATE TABLE IF NOT EXISTS attribute_definitions (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL, -- normalized machine key, e.g. thickness_mm
  name_fa TEXT NOT NULL,
  description TEXT,
  data_type TEXT NOT NULL CHECK (data_type IN ('STRING', 'DECIMAL', 'INTEGER', 'BOOLEAN', 'ENUM', 'DATE', 'REFERENCE')),
  uom_id TEXT REFERENCES uom_registry(id), -- relevant for DECIMAL/INTEGER physical quantities
  allowed_values JSONB, -- for ENUM: array of { value, labelFa }
  default_value TEXT,
  min_value NUMERIC,
  max_value NUMERIC,
  precision INT,
  is_searchable BOOLEAN NOT NULL DEFAULT true,
  is_filterable BOOLEAN NOT NULL DEFAULT true,
  is_reportable BOOLEAN NOT NULL DEFAULT true,
  is_sortable BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT REFERENCES users(id),

  CONSTRAINT attribute_definitions_code_unique UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS idx_attribute_definitions_active ON attribute_definitions (is_active);

CREATE TABLE IF NOT EXISTS product_type_attributes (
  id TEXT PRIMARY KEY,
  product_type_id TEXT NOT NULL REFERENCES product_types(id),
  attribute_definition_id TEXT NOT NULL REFERENCES attribute_definitions(id),
  is_required BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,

  -- Identity/display relevance (DDL-24c duplicate-detection + generated-name inputs)
  is_identity_relevant BOOLEAN NOT NULL DEFAULT false,
  is_display_relevant BOOLEAN NOT NULL DEFAULT false,

  -- Master vs Transactional metadata contract (DDL-24d) — informational-only
  -- classification for a FUTURE Nabz Order Line contract; no Nabz storage
  -- implemented here. See Docs/architecture/product-master-nabz-future-contract.md.
  attribute_role TEXT NOT NULL DEFAULT 'MASTER_ONLY'
    CHECK (attribute_role IN ('MASTER_ONLY', 'TRANSACTION_OVERRIDE_ALLOWED', 'TRANSACTION_ONLY')),

  -- Per-binding overrides (a Type may narrow a shared Attribute Definition's
  -- generic min/max/default without forking the definition itself)
  override_default_value TEXT,
  override_min NUMERIC,
  override_max NUMERIC,

  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT REFERENCES users(id),

  CONSTRAINT product_type_attributes_unique UNIQUE (product_type_id, attribute_definition_id)
);

CREATE INDEX IF NOT EXISTS idx_product_type_attributes_type
  ON product_type_attributes (product_type_id, is_active, sort_order);
