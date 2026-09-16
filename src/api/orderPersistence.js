import { OrderRepository } from '@api/repositories/OrderRepository';
import { useMockApi } from '@api/useMockApi';
import { getOrderApiErrorMessage } from './orderApiErrors.js';

function isPersistedOrder(order) {
  return typeof order?.id === 'string' && order.id.startsWith('ord_');
}

/**
 * SERVER_FIRST — await API; return server order. No debounce.
 * Callers must update Zustand cache from the returned value (or use store.saveOrder).
 * Authority for stage/status/completion = Backend (orderLifecycle).
 */
export async function persistOrderServerFirst(order) {
  if (useMockApi() || !order) return order;

  try {
    if (isPersistedOrder(order)) {
      return await OrderRepository.saveOrder(order);
    }
    return await OrderRepository.createOrder(order);
  } catch (error) {
    const message = getOrderApiErrorMessage(error);
    const wrapped = new Error(message);
    wrapped.code = error?.response?.data?.error || error?.code;
    wrapped.details = error?.response?.data?.details;
    wrapped.cause = error;
    throw wrapped;
  }
}

/**
 * Persist every changed order (by reference) SERVER_FIRST, then return the
 * next list with server fields merged. Unchanged refs kept. Failed creates dropped;
 * failed updates revert to previous row.
 */
export async function commitOrdersServerFirst(prevOrders, nextOrders) {
  if (useMockApi()) return nextOrders;

  const prevMap = new Map(prevOrders.map((o) => [String(o.id), o]));
  const committed = [];
  let lastErrorMessage = null;

  for (const order of nextOrders) {
    const key = String(order.id);
    const prev = prevMap.get(key);
    if (prev === order) {
      committed.push(order);
      continue;
    }
    try {
      const saved = await persistOrderServerFirst(order);
      committed.push({ ...order, ...saved, id: saved.id });
    } catch (error) {
      lastErrorMessage = getOrderApiErrorMessage(error);
      console.error('[order-persist] SERVER_FIRST failed', lastErrorMessage, error);
      if (prev) committed.push(prev);
      // new order that failed create: omit from cache
    }
  }

  if (lastErrorMessage) {
    committed.__persistError = lastErrorMessage;
  }

  return committed;
}
