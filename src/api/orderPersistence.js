import { OrderRepository } from '@api/repositories/OrderRepository';
import { useMockApi } from '@api/useMockApi';

const timers = new Map();

function isPersistedOrder(order) {
  return typeof order?.id === 'string' && order.id.startsWith('ord_');
}

/**
 * Debounced persist for Nabz fat orders — keeps UI snappy, writes to Postgres.
 */
export function scheduleOrderPersist(order, onSaved) {
  if (useMockApi() || !order) return;

  const key = String(order.id || order.code || Math.random());
  clearTimeout(timers.get(key));

  timers.set(
    key,
    setTimeout(async () => {
      try {
        const saved = isPersistedOrder(order)
          ? await OrderRepository.saveOrder(order)
          : await OrderRepository.createOrder(order);
        onSaved?.(order, saved);
      } catch (error) {
        console.error('[order-persist] failed', error);
      } finally {
        timers.delete(key);
      }
    }, 700),
  );
}

export function diffAndScheduleOrders(prevOrders, nextOrders, onSaved) {
  if (useMockApi()) return;

  const prevMap = new Map(prevOrders.map((o) => [String(o.id), o]));
  nextOrders.forEach((order) => {
    const prev = prevMap.get(String(order.id));
    if (!prev || prev !== order) {
      scheduleOrderPersist(order, onSaved);
    }
  });
}
