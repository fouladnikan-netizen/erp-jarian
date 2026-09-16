/**
 * Catalog projection: keep product_order_usage in sync with sales events.
 * Archived orders keep their rows (DDL-24n).
 */
import { EVENT } from '../../shared/events/eventNames.js';
import * as usageRepo from '../infrastructure/productOrderUsageRepository.js';

/**
 * @param {{ on: Function }} bus
 * @param {{ replaceForOrder?: Function }} [deps]
 */
export function registerCatalogProductUsageHandlers(bus, deps = {}) {
  const replaceForOrder = deps.replaceForOrder || usageRepo.replaceForOrder;

  bus.on(EVENT.SALES_ORDER_COMMITTED, async (event) => {
    const p = event.payload || {};
    await replaceForOrder({
      orderId: p.orderId,
      orderCode: p.orderCode || null,
      items: p.items || [],
    });
  });

  // Archive is a no-op on the projection: usage rows remain so hard-delete
  // of Product stays blocked (same as the former JSON scan including deleted_at).
}
