import { createContext, useContext, useMemo, useState } from 'react';
import { initialOrders } from './ordersData';

const NabzOrdersContext = createContext(null);

export function NabzOrdersProvider({ children }) {
  const [orders, setOrders] = useState(initialOrders);

  const value = useMemo(() => ({ orders, setOrders }), [orders]);

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
