/**
 * CRM-facing port: orders for a Company (lifecycle / engagement facts).
 * CRM must not query `orders` SQL directly (rule 3).
 */
import * as orderRepo from '../infrastructure/orderRepository.js';

export function findOrdersForCompany(companyId, { limit = 200 } = {}, client = null) {
  return orderRepo.findMany({ companyId: String(companyId), limit }, client);
}
