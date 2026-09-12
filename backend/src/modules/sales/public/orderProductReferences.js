/**
 * Catalog-facing port: does any Order line reference this Product?
 * Catalog must not query `orders` SQL directly (rule 3). Phase 3 will
 * replace this with an internal event / read model.
 */
import * as orderRepo from '../infrastructure/orderRepository.js';

export function findOrdersReferencingProduct(query, client = null) {
  return orderRepo.findOrdersReferencingProduct(query, client);
}
