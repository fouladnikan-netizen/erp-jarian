import { ENTITY_TYPES } from './config';

export const DEFAULT_CUSTOMER_REPORT = {
  totalOrders: 0,
  successfulOrders: 0,
  failedOrders: 0,
  activeOrders: 0,
  totalSales: '۰ ریال',
  totalProfit: '۰ ریال',
  avgSaleAmount: '۰ ریال',
  avgSaleProfit: '۰٪',
};

export const DEFAULT_SUPPLIER_REPORT = {
  totalPurchases: 0,
  totalInquiries: 0,
  totalPurchaseAmount: '۰ ریال',
  totalPurchaseProfit: '۰ ریال',
  avgPurchaseAmount: '۰ ریال',
  avgPurchaseProfit: '۰٪',
};

export function getReportCard(contact) {
  if (contact.reportCard) return contact.reportCard;

  if (contact.entityType === ENTITY_TYPES.CUSTOMER) {
    const orders = contact.relatedOrders || [];
    if (orders.length === 0) {
      return { ...DEFAULT_CUSTOMER_REPORT };
    }
    const successful = orders.filter((o) => o.stage === 'تحقق').length;
    const active = orders.filter((o) => !['تحقق'].includes(o.stage)).length;
    return {
      ...DEFAULT_CUSTOMER_REPORT,
      totalOrders: orders.length,
      successfulOrders: successful,
      failedOrders: Math.max(0, orders.length - successful - active),
      activeOrders: active,
    };
  }

  const inquiries = contact.relatedInquiries || [];
  if (inquiries.length === 0) {
    return { ...DEFAULT_SUPPLIER_REPORT };
  }

  return {
    ...DEFAULT_SUPPLIER_REPORT,
    totalPurchases: inquiries.length,
    totalInquiries: inquiries.length,
  };
}
