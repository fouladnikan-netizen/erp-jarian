import { ORDER_TABS, isPhase1Stage } from './config';

export function computeNabzKpis(orders) {
  const current = orders.filter((o) => o.status === ORDER_TABS.CURRENT);
  const success = orders.filter((o) => o.status === ORDER_TABS.SUCCESS);
  const failed = orders.filter((o) => o.status === ORDER_TABS.FAILED);
  const currentValue = current.reduce((sum, o) => sum + (o.amountRial || 0), 0);

  const formatBillions = (n) => {
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toLocaleString('fa-IR', { maximumFractionDigits: 1 })} میلیارد`;
    if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('fa-IR', { maximumFractionDigits: 0 })} میلیون`;
    return n.toLocaleString('fa-IR');
  };

  return [
    { label: 'سفارشات جاری', value: current.length.toLocaleString('fa-IR'), trend: formatBillions(currentValue), trendDir: 'up', variant: 'accent' },
    { label: 'سفارشات موفق', value: success.length.toLocaleString('fa-IR'), trend: 'نهایی‌شده', trendDir: 'up' },
    { label: 'سفارشات ناموفق', value: failed.length.toLocaleString('fa-IR'), trend: 'متوقف‌شده', trendDir: 'down', variant: 'danger' },
  ];
}

export function filterOrders(orders, { tab, search }) {
  return orders.filter((order) => {
    if (order.status !== tab) return false;
    if (!search) return true;
    const haystack = [
      order.code,
      order.customer,
      order.assignee,
      order.amountRial,
      order.failReason,
      ...(order.items || []).map((i) => i.name),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(search.toLowerCase());
  });
}

/** سفارشات قابل نمایش در کانبان — فقط وضعیت تب فعال */
export function filterKanbanOrders(orders, tab, search) {
  if (tab === ORDER_TABS.FAILED) return [];
  const filtered = filterOrders(orders, { tab, search });
  if (tab === ORDER_TABS.CURRENT) {
    return filtered.filter((o) => isPhase1Stage(o.stageId));
  }
  return filtered;
}
