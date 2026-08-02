import type { Order, OrderStatus } from '@domain/order/order.types';
import { apiClient } from '../client';
import { ORDERS_MOCK } from '../../mockData/orders';

const useMockApi = () => String(import.meta.env.VITE_USE_MOCK_API).toLowerCase() === 'true';

/**
 * Cast network/mock payloads to domain Order.
 * Runtime shape may still include transitional Nabz fields until API is fully typed;
 * Zod (order.schemas) will validate at the boundary in a later phase.
 */
function asOrders(source: unknown): Order[] {
  return Array.isArray(source) ? (source as Order[]) : [];
}

/**
 * Switchable Order repository — MOCK vs REAL API via VITE_USE_MOCK_API.
 * UI and Zustand store must only talk to this layer, never to mock files directly.
 */
export const OrderRepository = {
  async getOrders(): Promise<Order[]> {
    if (useMockApi()) {
      return Promise.resolve(asOrders(ORDERS_MOCK).map((order) => ({ ...order })));
    }

    const { data } = await apiClient.get<Order[] | { data: Order[] }>('/orders');
    if (Array.isArray(data)) return data;
    return asOrders((data as { data: Order[] }).data);
  },

  async updateOrderStatus(id: string, status: OrderStatus): Promise<Order | void> {
    if (useMockApi()) {
      return Promise.resolve();
    }

    const { data } = await apiClient.patch<Order>(`/orders/${id}`, { status });
    return data;
  },

  async getOrderById(id: string): Promise<Order | null> {
    if (useMockApi()) {
      const found = asOrders(ORDERS_MOCK).find((order) => String(order.id) === String(id));
      return Promise.resolve(found ? { ...found } : null);
    }

    const { data } = await apiClient.get<Order>(`/orders/${id}`);
    return data;
  },
};

export default OrderRepository;
