/**
 * Catalog delete-guard query: prefer the owned read model.
 * Sales JSON scan is hydrate-only for rows written before events existed
 * (or tests that INSERT into `orders` directly).
 */
import * as usageRepo from '../infrastructure/productOrderUsageRepository.js';
import { findOrdersReferencingProduct } from '../../sales/public/orderProductReferences.js';

export async function findProductOrderUsage({ productId, sku = null } = {}, client = null) {
  const projected = await usageRepo.findByProduct({ productId, sku }, client);
  if (projected.length > 0) return projected;

  const legacy = await findOrdersReferencingProduct({ productId, sku }, client);
  if (legacy.length > 0) {
    await usageRepo.upsertLegacyHits({ productId, sku, orders: legacy }, client);
  }
  return legacy;
}
