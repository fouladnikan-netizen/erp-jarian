import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { initialOrders } from './ordersData';
import { buildNewOrder } from './createOrder';
import { getCustomerById } from './customers';
import { getDisplayName } from '../kanoon/columns';
import { ORDER_TABS } from './config';
import { getTodayJalali, getNowTimeFa } from './dateUtils';

const NabzOrdersContext = createContext(null);

/**
 * Fallback امن (پل طلایی): اگر buildNewOrder به هر دلیلی شکست خورد،
 * یک سفارش خام با شناسه/کد ساختگی می‌سازد تا مسیریابی و به‌روزرسانی افق بدون خطا جلو برود.
 */
function buildFallbackOrder(orders, contactId) {
  const customer = getCustomerById(contactId);
  const nextId = orders.reduce((max, o) => Math.max(max, o.id), 0) + 1;
  const serial = String(Date.now()).slice(-6);

  return {
    id: nextId,
    code: `JR-MOCK-${serial}`,
    customerId: contactId,
    customer: customer ? getDisplayName(customer) : '—',
    assignee: 'سیستم',
    orderType: 'عادی',
    saleType: 'رسمی',
    isOfficial: true,
    generalNotes: '',
    itemCount: 0,
    amountRial: null,
    isPriced: false,
    stageId: 1,
    inquiryCompletedAt: null,
    status: ORDER_TABS.CURRENT,
    registeredDate: getTodayJalali(),
    registeredTime: getNowTimeFa(),
    items: [],
    events: [],
  };
}

export function NabzOrdersProvider({ children }) {
  const [orders, setOrders] = useState(initialOrders);
  const ordersRef = useRef(orders);
  ordersRef.current = orders;

  /**
   * پل طلایی افق → نبض: ساخت سفارش خام فاز ۱ (پیش‌کش) متصل به مخاطب کانون.
   * سفارش ساخته‌شده را برمی‌گرداند تا فراخوان بتواند به پروفایل آن ناوبری کند.
   */
  const createOrderForContact = useCallback((contactId) => {
    const current = ordersRef.current;
    let created;
    try {
      created = buildNewOrder({
        orders: current,
        customerId: contactId,
        lineItems: [],
      });
    } catch (error) {
      console.warn('[Nabz] buildNewOrder failed — falling back to mock order:', error);
      created = buildFallbackOrder(current, contactId);
    }
    setOrders((prev) => [created, ...prev]);
    return created;
  }, []);

  const value = useMemo(
    () => ({ orders, setOrders, createOrderForContact }),
    [orders, createOrderForContact],
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
