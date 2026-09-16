/**
 * Catalog-owned read model: which Orders reference a Product.
 * Written only from sales.order.* events (or a one-shot hydrate).
 * Catalog delete guards query this table — not `orders.payload.items`.
 */
import { query } from '../../../db/pool.js';

function runner(client) {
  return client ? client.query.bind(client) : query;
}

function mapUsage(row) {
  return {
    id: row.order_id,
    code: row.order_code,
    name: row.order_code,
    productId: row.product_id,
    sku: row.sku,
  };
}

export async function findByProduct({ productId, sku = null } = {}, client = null) {
  if (!productId && !sku) return [];
  const run = runner(client);
  const res = await run(
    `SELECT DISTINCT order_id, order_code, product_id, sku
     FROM product_order_usage
     WHERE ($1::text IS NOT NULL AND $1 <> '' AND product_id = $1)
        OR ($2::text IS NOT NULL AND $2 <> '' AND sku = $2)
     ORDER BY order_code`,
    [productId || null, sku || null],
  );
  return res.rows.map(mapUsage);
}

/**
 * Replace all usage rows for one order (create/update). Empty items → delete rows.
 */
export async function replaceForOrder({ orderId, orderCode = null, items = [] } = {}, client = null) {
  if (!orderId) return;
  const run = runner(client);
  await run(`DELETE FROM product_order_usage WHERE order_id = $1`, [orderId]);
  const refs = Array.isArray(items) ? items : [];
  for (const ref of refs) {
    const productId = ref?.productId != null ? String(ref.productId).trim() : '';
    const sku = ref?.sku != null ? String(ref.sku).trim() : '';
    if (!productId && !sku) continue;
    await run(
      `INSERT INTO product_order_usage (product_id, sku, order_id, order_code)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (order_id, product_id, sku)
       DO UPDATE SET order_code = EXCLUDED.order_code, updated_at = NOW()`,
      [productId, sku, orderId, orderCode || null],
    );
  }
}

/**
 * Hydrate from sales public-port rows `{ id, code }` for one product.
 */
export async function upsertLegacyHits({ productId, sku = null, orders = [] } = {}, client = null) {
  const run = runner(client);
  for (const order of orders) {
    if (!order?.id) continue;
    await run(
      `INSERT INTO product_order_usage (product_id, sku, order_id, order_code)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (order_id, product_id, sku)
       DO UPDATE SET order_code = EXCLUDED.order_code, updated_at = NOW()`,
      [productId || '', sku || '', order.id, order.code || order.name || null],
    );
  }
}
