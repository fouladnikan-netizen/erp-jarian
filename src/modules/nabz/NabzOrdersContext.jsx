import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { initialOrders } from './ordersData';

const NabzOrdersContext = createContext(null);

export function NabzOrdersProvider({ children }) {
  const [orders, setOrders] = useState(initialOrders);
  /** پیش‌نویس پل طلایی — مخاطبی که از افق برای ثبت سفارش مستقیم ارجاع شده است. */
  const [orderDraft, setOrderDraft] = useState(null);

  /**
   * پل طلایی افق → نبض: به‌جای ساخت سفارش خام، مخاطب را برای فرم «ثبت سفارش»
   * آماده می‌کند؛ NabzPage در مسیر /nabz/new-order این پیش‌نویس را مصرف می‌کند.
   */
  const createOrderDirect = useCallback((contactId) => {
    setOrderDraft({ contactId, createdAt: Date.now() });
  }, []);

  const clearOrderDraft = useCallback(() => setOrderDraft(null), []);

  const value = useMemo(
    () => ({ orders, setOrders, orderDraft, createOrderDirect, clearOrderDraft }),
    [orders, orderDraft, createOrderDirect, clearOrderDraft],
  );

  return (
    <NabzOrdersContext.Provider value={value}>
      {children}
    </NabzOrdersContext.Provider>
  );
}

export function useNabzOrders() {
  const ctx = useContext(NabzOrdersContext);
  if (!ctx) {
    throw new Error('useNabzOrders must be used within NabzOrdersProvider');
  }
  return ctx;
}
