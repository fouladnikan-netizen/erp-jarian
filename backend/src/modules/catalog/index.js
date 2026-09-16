/**
 * catalog — taxonomy, attributes, UOM, brands, Product/SKU.
 * Product owner UX: شیرازه (definitions) / ویترین (SKU).
 *
 * Identity/SKU SSOT: domain/productMaster/productIdentityPolicy.js
 * Public HTTP paths unchanged: /api/v1/products, brands, uom, product-taxonomy, attribute-definitions.
 */
export {
  PRODUCT_SKU_POLICY,
  PRODUCT_SKU_FORMULA,
  allocateProductSku,
  assertSkuImmutable,
  buildProductIdentityKey,
} from './domain/productMaster/productIdentityPolicy.js';
export { assertUnused } from './domain/productMaster/deleteGuard.js';
export { findProductOrderUsage } from './application/productOrderUsageQuery.js';
export { default as productRoutes } from './presentation/products.js';
export { default as brandRoutes } from './presentation/brands.js';
export { default as uomRoutes } from './presentation/uom.js';
export { default as productTaxonomyRoutes } from './presentation/productTaxonomy.js';
export { default as attributeDefinitionRoutes } from './presentation/attributeDefinitions.js';
