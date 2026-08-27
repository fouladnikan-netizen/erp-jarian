import { useNabzStore } from './store/useNabzStore';

/**
 * Backward-compatible hook. New code should prefer `useNabzStore` with
 * selective selectors to avoid unnecessary re-renders.
 * Provider is a no-op shell so existing App.jsx wiring stays valid.
 */
export function NabzOrdersProvider({ children }) {
  return children;
}

export function useNabzOrders() {
  const orders = useNabzStore((s) => s.orders);
  const setOrders = useNabzStore((s) => s.setOrders);
  const commitOrders = useNabzStore((s) => s.commitOrders);
  const saveOrder = useNabzStore((s) => s.saveOrder);
  const orderDraft = useNabzStore((s) => s.orderDraft);
  const createOrderDirect = useNabzStore((s) => s.createOrderDirect);
  const clearOrderDraft = useNabzStore((s) => s.clearOrderDraft);

  return {
    orders,
    setOrders,
    commitOrders,
    saveOrder,
    orderDraft,
    createOrderDirect,
    clearOrderDraft,
  };
}
