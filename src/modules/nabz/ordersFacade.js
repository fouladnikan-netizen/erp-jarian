/**
 * Thin Nabz orders facade — list without UI coupling.
 * Adapters may use this; Mowj domain must not import the store.
 */

import { useNabzStore } from './store/useNabzStore';

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
export function getOrderById(id) {
  if (id == null || id === '') return null;
  return listOrders().find((order) => String(order.id) === String(id)) || null;
}
