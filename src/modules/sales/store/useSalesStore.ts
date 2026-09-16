import { create } from 'zustand';
import type { Order, OrderStatus } from '@domain/order/order.types';
import { OrderRepository } from '@api/repositories/OrderRepository';
import { commitOrdersServerFirst, persistOrderServerFirst } from '@api/orderPersistence';
import { useMockApi } from '@api/useMockApi';

/**
 * Order aggregate write surface (sales FE).
 * Product name: نبض. Postgres is SoR when VITE_USE_MOCK_API=false.
 * Update policy: SERVER_FIRST — cache updates after successful API (see commitOrders).
 * `src/modules/nabz/store/useNabzStore` re-exports this store instance.
 */

export interface OrderDraft {
  contactId: string;
  createdAt: number;
}

type OrdersUpdater = Order[] | ((prev: Order[]) => Order[]);

interface SalesState {
  orders: Order[];
  selectedOrderId: string | null;
  loading: boolean;
  persisting: boolean;
  persistError: string | null;
  orderDraft: OrderDraft | null;
  fetchOrders: () => Promise<void>;
  /** Patch cache from API when a deep-link order is missing from the list cache. */
  fetchOrderById: (id: string) => Promise<Order | null>;
  /** @deprecated Prefer commitOrders — sync alias that voids the SERVER_FIRST promise */
  setOrders: (ordersOrUpdater: OrdersUpdater) => void;
  /** SERVER_FIRST: persist changed rows, then replace cache with server-confirmed list */
  commitOrders: (ordersOrUpdater: OrdersUpdater) => Promise<Order[]>;
  /** SERVER_FIRST: persist one order, then patch cache */
  saveOrder: (order: Order) => Promise<Order>;
  selectOrder: (id: string | null) => void;
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
  setLoading: (loading: boolean) => void;
  createOrderDirect: (contactId: string) => void;
  clearOrderDraft: () => void;
}

function resolveOrders(ordersOrUpdater: OrdersUpdater, prev: Order[]): Order[] {
  return typeof ordersOrUpdater === 'function' ? ordersOrUpdater(prev) : ordersOrUpdater;
}

function matchesOrderKey(order: Order, id: string): boolean {
  const key = String(id);
  return String(order.id) === key || String(order.code) === key;
}

export const useSalesStore = create<SalesState>((set, get) => ({
  orders: [],
  selectedOrderId: null,
  loading: false,
  persisting: false,
  persistError: null,
  orderDraft: null,

  fetchOrders: async () => {
    set({ loading: true });
    try {
      const orders = await OrderRepository.getOrders();
      set({ orders, loading: false });
    } catch (error) {
      console.error('[sales-store] fetchOrders failed', error);
      set({ loading: false });
    }
  },

  fetchOrderById: async (id) => {
    if (id == null || id === '') return null;
    const key = String(id);
    const cached = get().orders.find((order) => matchesOrderKey(order, key));
    if (cached) return cached;

    try {
      const order = await OrderRepository.getOrderById(key);
      if (!order) return null;
      set((state) => {
        const exists = state.orders.some(
          (row) => matchesOrderKey(row, String(order.id)) || matchesOrderKey(row, String(order.code || '')),
        );
        return {
          orders: exists
            ? state.orders.map((row) => (
              matchesOrderKey(row, String(order.id)) || matchesOrderKey(row, String(order.code || ''))
                ? { ...row, ...order }
                : row
            ))
            : [order, ...state.orders],
        };
      });
      return get().orders.find((row) => matchesOrderKey(row, String(order.id))) || order;
    } catch (error) {
      console.error('[sales-store] fetchOrderById failed', error);
      return null;
    }
  },

  commitOrders: async (ordersOrUpdater) => {
    const prev = get().orders;
    const next = resolveOrders(ordersOrUpdater, prev);

    if (useMockApi()) {
      set({ orders: next, persistError: null });
      return next;
    }

    set({ persisting: true, persistError: null });
    try {
      const committed = await commitOrdersServerFirst(prev, next);
      const persistError = (committed as Order[] & { __persistError?: string }).__persistError || null;
      if (persistError) {
        delete (committed as Order[] & { __persistError?: string }).__persistError;
      }
      set({ orders: committed, persisting: false, persistError });
      return committed;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'persist failed';
      console.error('[sales-store] commitOrders failed', error);
      set({ persisting: false, persistError: message });
      return prev;
    }
  },

  setOrders: (ordersOrUpdater) => {
    void get().commitOrders(ordersOrUpdater);
  },

  saveOrder: async (order) => {
    if (useMockApi()) {
      set((state) => ({
        orders: state.orders.some((o) => String(o.id) === String(order.id))
          ? state.orders.map((o) => (String(o.id) === String(order.id) ? order : o))
          : [order, ...state.orders],
        persistError: null,
      }));
      return order;
    }

    set({ persisting: true, persistError: null });
    try {
      const saved = await persistOrderServerFirst(order);
      const merged = { ...order, ...saved, id: saved.id } as Order;
      set((state) => {
        const exists = state.orders.some((o) => String(o.id) === String(order.id) || String(o.id) === String(saved.id));
        return {
          orders: exists
            ? state.orders.map((o) =>
                String(o.id) === String(order.id) || String(o.id) === String(saved.id) ? merged : o,
              )
            : [merged, ...state.orders],
          persisting: false,
        };
      });
      return merged;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'save failed';
      set({ persisting: false, persistError: message });
      throw error;
    }
  },

  selectOrder: (id) => set({ selectedOrderId: id }),

  updateOrderStatus: async (id, status) => {
    const current = get().orders.find((order) => String(order.id) === String(id));
    if (!current) {
      throw new Error(`Order not found in cache: ${id}`);
    }

    if (useMockApi()) {
      set({
        orders: get().orders.map((order) =>
          String(order.id) === String(id) ? { ...order, status } : order,
        ),
      });
      return;
    }

    const version = Number(current.version);
    const saved = await OrderRepository.updateOrderStatus(id, status, version);
    set({
      orders: get().orders.map((order) =>
        String(order.id) === String(id)
          ? { ...order, ...(saved || {}), status: (saved as Order | void)?.status ?? status }
          : order,
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

/** @deprecated Product-name alias — same store instance as useSalesStore */
export const useNabzStore = useSalesStore;
