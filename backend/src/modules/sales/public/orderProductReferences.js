/**
 * Catalog-facing port: hydrate-only fallback for Product in-use checks.
 * Canonical read model is catalog `product_order_usage` (Phase 4 events).
 * Catalog must not query `orders` SQL directly (rule 3).
 */
import * as orderRepo from '../infrastructure/orderRepository.js';

export function findOrdersReferencingProduct(query, client = null) {
  return orderRepo.findOrdersReferencingProduct(query, client);
}
