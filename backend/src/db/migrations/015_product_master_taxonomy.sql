-- Product Master Taxonomy Foundation (DDL-24) — Shirazeh-owned, expand-only.
-- Product Group -> Product Category -> Product Type. Historical products must
-- remain resolvable after any node is deactivated, so no destructive
-- constraints; deactivation only (is_active flag), same posture as
-- activity_type_registry / correspondence_type_registry (DDL-19 / DDL-23d).

CREATE TABLE IF NOT EXISTS product_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  code TEXT, -- 2-digit stable code for SKU GG segment (DDL-24b), assigned atomically at create
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT REFERENCES users(id),

  CONSTRAINT product_groups_normalized_name_unique UNIQUE (normalized_name),
  CONSTRAINT product_groups_code_unique UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS idx_product_groups_active ON product_groups (is_active, sort_order);

CREATE TABLE IF NOT EXISTS product_categories (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES product_groups(id),
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  code TEXT, -- 2-digit, unique within group (SKU CC segment)
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT REFERENCES users(id),

  CONSTRAINT product_categories_group_name_unique UNIQUE (group_id, normalized_name),
  CONSTRAINT product_categories_group_code_unique UNIQUE (group_id, code)
);

CREATE INDEX IF NOT EXISTS idx_product_categories_group ON product_categories (group_id, is_active, sort_order);

CREATE TABLE IF NOT EXISTS product_types (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES product_categories(id),
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  code TEXT, -- 2-digit, unique within category (SKU TT segment)
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  allowed_brand_ids JSONB NOT NULL DEFAULT '[]'::jsonb, -- optional: Brand relevance hint per Type (not identity)

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT REFERENCES users(id),

  CONSTRAINT product_types_category_name_unique UNIQUE (category_id, normalized_name),
  CONSTRAINT product_types_category_code_unique UNIQUE (category_id, code)
);

CREATE INDEX IF NOT EXISTS idx_product_types_category ON product_types (category_id, is_active, sort_order);

-- Atomic 2-digit code allocation per taxonomy scope (DDL-24b) — same
-- INSERT..ON CONFLICT..RETURNING pattern proven by correspondence_number_counters
-- (DDL-23a) / registryNumber.js. scope examples: 'GROUP', 'CATEGORY:<groupId>',
-- 'TYPE:<categoryId>'. Codes are 2-digit (01..99); if a scope exceeds 99
-- children the allocator throws a clear error rather than silently wrapping —
-- see backend/src/domain/productMaster/taxonomyCode.js.
CREATE TABLE IF NOT EXISTS product_taxonomy_code_counters (
  scope TEXT PRIMARY KEY,
  next_seq INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- UOM Registry (DDL-24) — centrally governed in Shirazeh; Vitrin references it.
CREATE TABLE IF NOT EXISTS uom_registry (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL, -- e.g. KG, TON, METER, PIECE, SHEET, BRANCH, ROLL, PACK
  name_fa TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'GENERIC', -- WEIGHT / LENGTH / COUNT / AREA / VOLUME / GENERIC
  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT REFERENCES users(id),

  CONSTRAINT uom_registry_code_unique UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS idx_uom_registry_active ON uom_registry (is_active, category);

CREATE TABLE IF NOT EXISTS uom_conversions (
  id TEXT PRIMARY KEY,
  from_uom_id TEXT NOT NULL REFERENCES uom_registry(id),
  to_uom_id TEXT NOT NULL REFERENCES uom_registry(id),
  numerator NUMERIC NOT NULL,
  denominator NUMERIC NOT NULL DEFAULT 1,
  is_exact BOOLEAN NOT NULL DEFAULT true, -- exact (defined ratio) vs approximate (average/theoretical)
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT REFERENCES users(id),

  CONSTRAINT uom_conversions_pair_unique UNIQUE (from_uom_id, to_uom_id),
  CONSTRAINT uom_conversions_no_self CHECK (from_uom_id <> to_uom_id)
);

CREATE INDEX IF NOT EXISTS idx_uom_conversions_from ON uom_conversions (from_uom_id);

-- Brand Registry (DDL-24) — centrally defined in Shirazeh. Brand is NOT part
-- of Product/SKU identity (see products.brand_id being an optional relevance
-- reference, not part of canonical_identity_key).
CREATE TABLE IF NOT EXISTS brands (
  id TEXT PRIMARY KEY,
  brand_name TEXT NOT NULL,
  legal_name TEXT,
  normalized_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT REFERENCES users(id),

  CONSTRAINT brands_normalized_name_unique UNIQUE (normalized_name)
);

CREATE INDEX IF NOT EXISTS idx_brands_active ON brands (is_active);

-- Seed canonical UOM registry from the product contract's example units, plus
-- a representative approximate conversion (تیرآهن base=KG, alt=شاخه). Extensible —
-- ops can add more via the Shirazeh UOM Registry admin UI, not hardcoded logic.
INSERT INTO uom_registry (id, code, name_fa, category, is_active) VALUES
  ('uom_kg', 'KG', 'کیلوگرم', 'WEIGHT', true),
  ('uom_ton', 'TON', 'تن', 'WEIGHT', true),
  ('uom_meter', 'METER', 'متر', 'LENGTH', true),
  ('uom_piece', 'PIECE', 'عدد', 'COUNT', true),
  ('uom_sheet', 'SHEET', 'برگ', 'COUNT', true),
  ('uom_branch', 'BRANCH', 'شاخه', 'COUNT', true),
  ('uom_roll', 'ROLL', 'رول', 'COUNT', true),
  ('uom_pack', 'PACK', 'بسته', 'COUNT', true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO uom_conversions (id, from_uom_id, to_uom_id, numerator, denominator, is_exact, notes, is_active) VALUES
  ('uomc_ton_kg', 'uom_ton', 'uom_kg', 1000, 1, true, 'تبدیل دقیق واحد وزنی استاندارد', true)
ON CONFLICT (from_uom_id, to_uom_id) DO NOTHING;
