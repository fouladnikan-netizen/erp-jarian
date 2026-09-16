-- Product Master — Vitrin-owned Product/SKU aggregate (DDL-24) — expand-only.
-- Product = Product Type + normalized structured Master Attribute Values +
-- UOM/weight metadata. Names are NOT identity — canonical_identity_key is.

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  sku TEXT NOT NULL, -- immutable once created (DDL-24b) — GGCCTTVV, identity/reference only
  product_type_id TEXT NOT NULL REFERENCES product_types(id),
  brand_id TEXT REFERENCES brands(id), -- relevance reference only — NOT part of identity

  generated_name TEXT NOT NULL, -- derived from Product Type + identity/display attribute values
  display_name_override TEXT, -- controlled override; never used for identity/duplicate checks

  -- Canonical identity = Product Type + normalized identity-relevant Master
  -- Attribute values (DDL-24c). Enforced unique at DB level (P0 requirement).
  canonical_identity_key TEXT NOT NULL,

  base_uom_id TEXT REFERENCES uom_registry(id),
  sales_uom_id TEXT REFERENCES uom_registry(id),
  purchase_uom_id TEXT REFERENCES uom_registry(id),

  -- Weight Calculation Profile (DDL-24e): FIXED / PER_LENGTH / DIMENSIONAL / MANUAL_ACTUAL
  weight_profile_type TEXT NOT NULL DEFAULT 'MANUAL_ACTUAL'
    CHECK (weight_profile_type IN ('FIXED', 'PER_LENGTH', 'DIMENSIONAL', 'MANUAL_ACTUAL')),
  weight_profile_coefficients JSONB NOT NULL DEFAULT '{}'::jsonb,

  lifecycle_status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (lifecycle_status IN ('ACTIVE', 'INACTIVE')),
  data_quality_flags JSONB NOT NULL DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT REFERENCES users(id),
  deactivated_at TIMESTAMPTZ,
  deactivated_by TEXT REFERENCES users(id),

  CONSTRAINT products_sku_unique UNIQUE (sku),
  CONSTRAINT products_canonical_identity_unique UNIQUE (canonical_identity_key)
);

CREATE INDEX IF NOT EXISTS idx_products_type ON products (product_type_id);
CREATE INDEX IF NOT EXISTS idx_products_lifecycle ON products (lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products (brand_id);
CREATE INDEX IF NOT EXISTS idx_products_generated_name_trgm ON products (generated_name);

-- Structured attribute values per Product (per its Product Type's schema).
-- normalized_value is what identity/search/filter compare against — never
-- the free-text display value (Persian/Latin digit + numeric-format safe).
CREATE TABLE IF NOT EXISTS product_attribute_values (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  attribute_definition_id TEXT NOT NULL REFERENCES attribute_definitions(id),
  value_text TEXT,
  value_number NUMERIC,
  value_boolean BOOLEAN,
  normalized_value TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT product_attribute_values_unique UNIQUE (product_id, attribute_definition_id)
);

CREATE INDEX IF NOT EXISTS idx_pav_attr_value ON product_attribute_values (attribute_definition_id, normalized_value);
CREATE INDEX IF NOT EXISTS idx_pav_product ON product_attribute_values (product_id);

-- Atomic SKU variant-sequence generation per Product Type (DDL-24b) — same
-- concurrency-safe INSERT..ON CONFLICT..RETURNING pattern as
-- correspondence_number_counters (DDL-23a) / registryNumber.js. VV is a
-- variant sequence, never parsed back to reconstruct attributes.
CREATE TABLE IF NOT EXISTS product_sku_counters (
  product_type_id TEXT PRIMARY KEY REFERENCES product_types(id),
  next_seq INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Product Relationships (simple extensible model) — business knowledge only,
-- never auto-substituted.
CREATE TABLE IF NOT EXISTS product_relationships (
  id TEXT PRIMARY KEY,
  source_product_id TEXT NOT NULL REFERENCES products(id),
  target_product_id TEXT NOT NULL REFERENCES products(id),
  relationship_type TEXT NOT NULL
    CHECK (relationship_type IN ('ALTERNATIVE', 'SUBSTITUTE', 'SUBSTITUTE_WITH_CONVERSION')),
  conversion_numerator NUMERIC,
  conversion_denominator NUMERIC,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT REFERENCES users(id),

  CONSTRAINT product_relationships_no_self CHECK (source_product_id <> target_product_id),
  CONSTRAINT product_relationships_unique UNIQUE (source_product_id, target_product_id, relationship_type)
);

CREATE INDEX IF NOT EXISTS idx_product_relationships_source ON product_relationships (source_product_id, is_active);
CREATE INDEX IF NOT EXISTS idx_product_relationships_target ON product_relationships (target_product_id, is_active);
