import { ORDER_TABS } from './config';
import { resolveOrderViewTab } from '../../domain/order/orderLifecycle.js';

export function computeNabzKpis(orders) {
  const current = orders.filter((o) => resolveOrderViewTab(o) === ORDER_TABS.CURRENT);
  const success = orders.filter((o) => resolveOrderViewTab(o) === ORDER_TABS.SUCCESS);
  const failed = orders.filter((o) => resolveOrderViewTab(o) === ORDER_TABS.FAILED);
  const closed = orders.filter((o) => resolveOrderViewTab(o) === ORDER_TABS.CLOSED);
  const currentValue = current.reduce((sum, o) => sum + (o.amountRial || 0), 0);

  const formatBillions = (n) => {
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toLocaleString('fa-IR', { maximumFractionDigits: 1 })} میلیارد`;
    if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('fa-IR', { maximumFractionDigits: 0 })} میلیون`;
    return n.toLocaleString('fa-IR');
  };

  return [
    { label: 'سفارشات جاری', value: current.length.toLocaleString('fa-IR'), trend: formatBillions(currentValue), trendDir: 'up', tone: 'current' },
    { label: 'سفارشات موفق', value: success.length.toLocaleString('fa-IR'), trend: 'خرید موفق', trendDir: 'up', tone: 'success' },
    { label: 'سفارشات ناموفق', value: failed.length.toLocaleString('fa-IR'), trend: 'متوقف‌شده', trendDir: 'down', tone: 'failed' },
    { label: 'سفارشات بسته‌شده', value: closed.length.toLocaleString('fa-IR'), trend: 'بایگانی', trendDir: 'up', tone: 'closed' },
  ];
}

export function filterOrders(orders, { tab, search }) {
  const filtered = orders.filter((order) => {
    if (resolveOrderViewTab(order) !== tab) return false;
    if (!search) return true;
    const haystack = [order.code, order.customer, order.assignee, order.amountRial, order.failReason, ...(order.items || []).map((i) => i.name)].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(search.toLowerCase());
  });
  return filtered.map((order, index) => ({ order, index })).sort((a, b) => {
    const ta = a.order.updatedAt || a.order.updated_at || 0;
    const tb = b.order.updatedAt || b.order.updated_at || 0;
    if (tb !== ta) return tb - ta;
    return a.index - b.index;
  }).map(({ order }) => order);
}

export function filterKanbanOrders(orders, tab, search) {
  if (tab === ORDER_TABS.FAILED || tab === ORDER_TABS.CLOSED) return [];
  return filterOrders(orders, { tab, search });
}
