/**
 * Nabz public Order query surface.
 * Cross-module consumers must import from here — not useNabzStore / NabzOrdersContext.
 */
import { useNabzStore } from '../store/useNabzStore';

/**
 * @returns {Array<object>}
 */
export function listOrders() {
  const orders = useNabzStore.getState().orders;
  return Array.isArray(orders) ? orders : [];
}

/**
 * @param {string|number} id
 */
export function getOrder(id) {
  if (id == null || id === '') return null;
  return listOrders().find((order) => (
    String(order.id) === String(id) || String(order.code) === String(id)
  )) || null;
}

/** @deprecated Prefer getOrder */
export function getOrderById(id) {
  return getOrder(id);
}

/**
 * @param {string|number} companyId
 */
export function listOrdersForCompany(companyId) {
  if (companyId == null || companyId === '') return [];
  const key = String(companyId);
  return listOrders().filter((order) => (
    String(order.customerId || order.companyId || '') === key
  ));
}

/**
 * Lightweight summary for profile cards.
 */
export function getOrderSummary(orderId) {
  const order = getOrder(orderId);
  if (!order) return null;
  return {
    id: order.id,
    code: order.code,
    status: order.status,
    stageId: order.stageId,
    companyId: order.customerId || order.companyId || null,
    title: order.title || order.customer || null,
    amountRial: order.amountRial ?? null,
  };
}

/** React subscription — public replacement for useNabzOrders().orders */
export function useOrders() {
  return useNabzStore((s) => s.orders);
}

export function useCreateOrderDirect() {
  return useNabzStore((s) => s.createOrderDirect);
}

export function useOrdersForCompany(companyId) {
  return useNabzStore((s) => {
    const key = companyId == null ? '' : String(companyId);
    if (!key) return [];
    return (s.orders || []).filter((order) => (
      String(order.customerId || order.companyId || '') === key
    ));
  });
}

export const ordersFacade = {
  listOrders,
  getOrder,
  getOrderById,
  listOrdersForCompany,
  getOrderSummary,
};

export default ordersFacade;
