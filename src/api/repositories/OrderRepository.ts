import type { Order, OrderStatus } from '@domain/order/order.types';
import { apiClient } from '../client';
import { orderFromApi, orderToApi } from '../mappers/orderMapper';
import { useMockApi } from '../useMockApi';
import { ORDERS_MOCK } from '../../mockData/orders';

function asOrders(source: unknown): Order[] {
  return Array.isArray(source) ? (source as Order[]) : [];
}

export const OrderRepository = {
  async getOrders(): Promise<Order[]> {
    if (useMockApi()) {
      return asOrders(ORDERS_MOCK).map((order) => ({ ...order }));
    }

    const { data } = await apiClient.get<{ items: unknown[] }>('/orders');
    return (data.items || []).map((row) => orderFromApi(row) as Order);
  },

  async getOrderById(id: string): Promise<Order | null> {
    if (useMockApi()) {
      const found = asOrders(ORDERS_MOCK).find(
        (order) => String(order.id) === String(id) || String(order.code) === String(id),
      );
      return found ? { ...found } : null;
    }

    const { data } = await apiClient.get<{ order: unknown }>(`/orders/${id}`);
    return orderFromApi(data.order) as Order | null;
  },

  async createOrder(order: Partial<Order>): Promise<Order> {
    if (useMockApi()) {
      return order as Order;
    }
    const { data } = await apiClient.post<{ order: unknown }>('/orders', orderToApi(order));
    return orderFromApi(data.order) as Order;
  },

  async saveOrder(order: Partial<Order>): Promise<Order> {
    if (useMockApi()) {
      return order as Order;
    }
    const id = order.id || order.code;
    if (!id) {
      throw new Error('Order id or code required for save');
    }
    const { data } = await apiClient.patch<{ order: unknown }>(`/orders/${id}`, orderToApi(order));
    return orderFromApi(data.order) as Order;
  },

  async updateOrderStatus(id: string, status: OrderStatus): Promise<Order | void> {
    if (useMockApi()) {
      return Promise.resolve();
    }

    const { data } = await apiClient.patch<{ order: unknown }>(`/orders/${id}`, { status });
    return orderFromApi(data.order) as Order;
  },
};

export default OrderRepository;
