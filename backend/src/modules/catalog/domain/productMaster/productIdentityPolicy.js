/**
 * Canonical Product identity / SKU policy (Modular Monolith Phase 1).
 *
 * THIS is the only module that *defines* identity and SKU generation rules.
 * Helpers in `skuCode.js` are string mechanics. `skuGenerator.js` is a thin
 * alias. Services and import paths must call this file — never a second formula.
 *
 * Chosen formula (DDL-24m; supersedes DDL-24b 8-digit GG-CC-TT-VV):
 *   `{groupSku}-{categorySku}-{typeSku}-{identityValue…}`
 *
 * Identity values = PRODUCT-scoped bindings with `is_identity_relevant`
 * (DDL-46). Required does not imply identity. Brand is never in the SKU.
 * Issued Product SKU is immutable after INSERT.
 *
 * See Docs/ARCHITECTURE.md §۳.
 */
import { appError } from '../../../../lib/errors.js';
import { buildCanonicalIdentityKey } from './normalize.js';
import {
  PRODUCT_SKU_PATTERN,
  SKU_CODE_PATTERN,
  buildProductSku,
  formatIdentitySkuSegment,
  normalizeSkuCode,
  pickSkuCode,
  skuCodeKey,
} from './skuCode.js';

export const PRODUCT_SKU_POLICY = 'DDL-24m';
export const SUPERSEDED_PRODUCT_SKU_POLICY = 'DDL-24b';
export const PRODUCT_SKU_FORMULA = '{groupSku}-{categorySku}-{typeSku}-{identityValue…}';

/** Fields that must never appear on Product PATCH. */
export const IMMUTABLE_PRODUCT_IDENTITY_FIELDS = Object.freeze(['sku']);

export {
  PRODUCT_SKU_PATTERN,
  SKU_CODE_PATTERN,
  formatIdentitySkuSegment,
  normalizeSkuCode,
  pickSkuCode,
  skuCodeKey,
};

/**
 * Identity participants for SKU / canonical key — `isIdentityRelevant` only.
 * `isRequired` is ignored (DDL-46).
 *
 * @param {Array<{ isIdentityRelevant?: boolean, sortOrder?: number }>} entries
 */
export function selectIdentityEntries(entries = []) {
  return [...entries]
    .filter((entry) => entry && entry.isIdentityRelevant)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

/**
 * Issue a Product SKU from taxonomy mnemonic codes + identity attribute values.
 *
 * @param {{
 *   groupSkuCode: string,
 *   categorySkuCode: string,
 *   typeSkuCode: string,
 *   identityEntries?: Array<{ dataType: string, normalized: string, isIdentityRelevant?: boolean, sortOrder?: number }>,
 * }} parts
 */
export function allocateProductSku({
  groupSkuCode,
  categorySkuCode,
  typeSkuCode,
  identityEntries = [],
}) {
  const identitySegments = selectIdentityEntries(identityEntries)
    .map((entry) => formatIdentitySkuSegment(entry.dataType, entry.normalized))
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

/** Stable alias — `skuGenerator.allocateSku` re-exports this same function. */
export const allocateSku = allocateProductSku;

/**
 * Canonical identity key: Product Type + identity-relevant normalized values.
 * Same participant set as {@link allocateProductSku}; different encoding
 * (stable key, not the display SKU).
 */
export function buildProductIdentityKey(productTypeId, identityAttributeEntries) {
  return buildCanonicalIdentityKey(productTypeId, identityAttributeEntries);
}

/**
 * Reject any attempt to mutate issued Product SKU (DDL-24i / DDL-24m).
 * @param {object} body
 */
export function assertSkuImmutable(body) {
  const attempted = IMMUTABLE_PRODUCT_IDENTITY_FIELDS.filter(
    (field) => body && Object.prototype.hasOwnProperty.call(body, field),
  );
  if (attempted.length) {
    throw appError(
      'SKU_IMMUTABLE',
      'شناسه کالای SKU پس از صدور غیرقابل تغییر است و در درخواست ویرایش نمی‌تواند ارسال شود.',
      400,
      { field: attempted[0], immutableFields: attempted },
    );
  }
}

/** Taxonomy / Brand / Attribute Definition mnemonic code (not the Product SKU). */
export function allocateNodeSkuCode(args) {
  return pickSkuCode(args);
}
