import { create } from 'zustand';
import type { Order, OrderStatus } from '@domain/order/order.types';
import { OrderRepository } from '@api/repositories/OrderRepository';
import { diffAndScheduleOrders } from '@api/orderPersistence';

/**
 * Order aggregate write surface (Nabz).
 * Owner module: نبض. Root document embeds lines, quoting, gateway, proforma,
 * tadarok/PO, QC, shipping, rahsepar, saranjam, CRM activities, events, revisions.
 * Do NOT invent a parallel Order store elsewhere.
 * Future: extract Shipment / Payment / Invoice only after persistence exists.
 * Business / financial math stays in domain & nabz services (quotingService).
 */

export interface OrderDraft {
  contactId: string;
  createdAt: number;
}

type OrdersUpdater = Order[] | ((prev: Order[]) => Order[]);

interface NabzState {
  orders: Order[];
  selectedOrderId: string | null;
  loading: boolean;
  orderDraft: OrderDraft | null;
  fetchOrders: () => Promise<void>;
  setOrders: (ordersOrUpdater: OrdersUpdater) => void;
  selectOrder: (id: string | null) => void;
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
  setLoading: (loading: boolean) => void;
  createOrderDirect: (contactId: string) => void;
  clearOrderDraft: () => void;
}

export const useNabzStore = create<NabzState>((set, get) => ({
  orders: [],
  selectedOrderId: null,
  loading: false,
  orderDraft: null,

  fetchOrders: async () => {
    set({ loading: true });
    try {
      const orders = await OrderRepository.getOrders();
      set({ orders, loading: false });
    } catch (error) {
      console.error('[nabz-store] fetchOrders failed', error);
      set({ loading: false });
    }
  },

  setOrders: (ordersOrUpdater) =>
    set((state) => {
      const nextOrders =
        typeof ordersOrUpdater === 'function'
          ? ordersOrUpdater(state.orders)
          : ordersOrUpdater;

      diffAndScheduleOrders(state.orders, nextOrders, (prevOrder, saved) => {
        useNabzStore.setState((current) => ({
          orders: current.orders.map((item) => {
            if (String(item.id) !== String(prevOrder.id)) return item;
            return { ...item, ...saved, id: saved.id };
          }),
        }));
      });

      return { orders: nextOrders };
    }),

  selectOrder: (id) => set({ selectedOrderId: id }),

  updateOrderStatus: async (id, status) => {
    await OrderRepository.updateOrderStatus(id, status);
    set({
      orders: get().orders.map((order) =>
        String(order.id) === String(id) ? { ...order, status } : order
      ),
    });
  },

  setLoading: (loading) => set({ loading }),

  createOrderDirect: (contactId) =>
    set({
      orderDraft: { contactId, createdAt: Date.now() },
    }),

  clearOrderDraft: () => set({ orderDraft: null }),
}));
