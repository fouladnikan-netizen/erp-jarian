import { useSalesStore } from './store/useSalesStore';

/**
 * No-op provider kept so App.jsx / nabz wiring stays valid.
 * Canonical cache is useSalesStore (API SoR when mock is off).
 */
export function SalesOrdersProvider({ children }) {
  return children;
}

/**
 * Compatibility hook over the sales store.
 * Prefer `useSalesStore` selectors or `modules/sales/public`.
 */
export function useSalesOrders() {
  const orders = useSalesStore((s) => s.orders);
  const setOrders = useSalesStore((s) => s.setOrders);
  const commitOrders = useSalesStore((s) => s.commitOrders);
  const saveOrder = useSalesStore((s) => s.saveOrder);
  const orderDraft = useSalesStore((s) => s.orderDraft);
  const createOrderDirect = useSalesStore((s) => s.createOrderDirect);
  const clearOrderDraft = useSalesStore((s) => s.clearOrderDraft);
  const fetchOrderById = useSalesStore((s) => s.fetchOrderById);

  return {
    orders,
    setOrders,
    commitOrders,
    saveOrder,
    orderDraft,
    createOrderDirect,
    clearOrderDraft,
    fetchOrderById,
  };
}
