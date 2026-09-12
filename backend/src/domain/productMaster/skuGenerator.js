/**
 * Product SKU (DDL-24m). `{groupSku}-{categorySku}-{typeSku}-{identityValue…}`.
 *
 * Identity values come from `is_identity_relevant` PRODUCT bindings (DDL-46),
 * in sort order. Required does not imply identity.
 * The issued string is still immutable after INSERT.
 */
import { buildProductSku, formatIdentitySkuSegment, normalizeSkuCode } from './skuCode.js';

/**
 * @param {{
 *   groupSkuCode: string,
 *   categorySkuCode: string,
 *   typeSkuCode: string,
 *   identityEntries?: Array<{ dataType: string, normalized: string, isIdentityRelevant?: boolean, sortOrder?: number }>,
 * }} parts
 */
export function allocateSku({ groupSkuCode, categorySkuCode, typeSkuCode, identityEntries = [] }) {
  const identitySegments = [...identityEntries]
    .filter((e) => e && e.isIdentityRelevant)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((e) => formatIdentitySkuSegment(e.dataType, e.normalized))
    .filter(Boolean);

  const sku = buildProductSku({
    groupSku: groupSkuCode,
    categorySku: categorySkuCode,
    typeSku: typeSkuCode,
    identitySegments,
  });

  return {
    sku,
    groupSkuCode: normalizeSkuCode(groupSkuCode),
    categorySkuCode: normalizeSkuCode(categorySkuCode),
    typeSkuCode: normalizeSkuCode(typeSkuCode),
  };
}
