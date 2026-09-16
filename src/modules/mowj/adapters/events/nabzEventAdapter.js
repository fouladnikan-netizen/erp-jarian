/**
 * Nabz → Mowj event adapters (mapping only, no dispatch).
 */

import {
  createOrderDeliveredEvent,
  createShipmentDeliveredEvent,
  createFirstPurchaseCompletedEvent,
  validateMowjDomainEvent,
} from '../../domain/events.contracts';

const DELIVERED_STAGE_IDS = new Set([7, 8]); // رهسپار / سرانجام

/**
 * @param {object} order
 * @returns {object|null}
 */
export function adaptOrderDeliveredEvent(order) {
  if (!order || order.id == null) return null;
  if (order.stageId != null && !DELIVERED_STAGE_IDS.has(Number(order.stageId))) {
    return null;
  }
  const event = createOrderDeliveredEvent({
    orderId: String(order.id),
    customerId: String(order.customerId),
    stageId: order.stageId != null ? Number(order.stageId) : null,
  });
  return validateMowjDomainEvent(event).ok ? event : null;
}

/**
 * @param {object} order
 * @param {{ shipmentId?: string }} [extra]
 */
export function adaptShipmentDeliveredEvent(order, extra = {}) {
  if (!order || order.id == null) return null;
  const event = createShipmentDeliveredEvent({
    orderId: String(order.id),
    shipmentId: extra.shipmentId != null ? String(extra.shipmentId) : undefined,
    companyId: order.customerId != null ? String(order.customerId) : undefined,
  });
  return validateMowjDomainEvent(event).ok ? event : null;
}

/**
 * @param {object} order
 */
export function adaptFirstPurchaseCompletedEvent(order) {
  if (!order || order.id == null || order.customerId == null) return null;
  const event = createFirstPurchaseCompletedEvent({
    orderId: String(order.id),
    companyId: String(order.customerId),
  });
  return validateMowjDomainEvent(event).ok ? event : null;
}
