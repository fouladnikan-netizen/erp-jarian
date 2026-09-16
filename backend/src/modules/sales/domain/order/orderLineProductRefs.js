/**
 * Collect productId/sku pairs from a fat Order payload (Nabz line items).
 * Used when publishing sales.order.* events — catalog must not scan JSON.
 */
export function collectOrderLineProductRefs(payload) {
  const items = payload?.items;
  if (!Array.isArray(items)) return [];
  const seen = new Set();
  const refs = [];
  for (const item of items) {
    const productId = item?.productId != null ? String(item.productId).trim() : '';
    const sku = item?.sku != null ? String(item.sku).trim() : '';
    if (!productId && !sku) continue;
    const key = `${productId}\0${sku}`;
    if (seen.has(key)) continue;
    seen.add(key);
    refs.push({ productId, sku });
  }
  return refs;
}
