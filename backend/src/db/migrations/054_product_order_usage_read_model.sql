-- Catalog-owned read model: Product ← Order line references.
-- Replaces catalog scanning sales `orders.payload.items` (rule 3).
-- No FK to products/orders: this is a projection, not an aggregate.
-- Archived orders keep rows (DDL-24n — in-use guard includes archives).

CREATE TABLE IF NOT EXISTS product_order_usage (
  product_id TEXT NOT NULL DEFAULT '',
  sku TEXT NOT NULL DEFAULT '',
  order_id TEXT NOT NULL,
  order_code TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (order_id, product_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_product_order_usage_product
  ON product_order_usage (product_id)
  WHERE product_id <> '';

CREATE INDEX IF NOT EXISTS idx_product_order_usage_sku
  ON product_order_usage (sku)
  WHERE sku <> '';

-- One-shot backfill from existing fat-document lines (including archived orders).
INSERT INTO product_order_usage (product_id, sku, order_id, order_code)
SELECT DISTINCT
  COALESCE(item->>'productId', ''),
  COALESCE(item->>'sku', ''),
  o.id,
  o.code
FROM orders o
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(o.payload->'items', '[]'::jsonb)) AS item
WHERE jsonb_typeof(COALESCE(o.payload->'items', '[]'::jsonb)) = 'array'
  AND (
    NULLIF(item->>'productId', '') IS NOT NULL
    OR NULLIF(item->>'sku', '') IS NOT NULL
  )
ON CONFLICT (order_id, product_id, sku) DO NOTHING;
