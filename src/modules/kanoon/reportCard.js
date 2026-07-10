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
    return {
      totalOrders: orders.length || 12,
      successfulOrders: orders.filter((o) => o.stage === 'تحقق').length || 8,
      failedOrders: 1,
      activeOrders: orders.filter((o) => !['تحقق'].includes(o.stage)).length || 3,
      totalSales: '۴۲٬۸۰۰٬۰۰۰٬۰۰۰ ریال',
      totalProfit: '۵٬۱۲۰٬۰۰۰٬۰۰۰ ریال',
      avgSaleAmount: '۳٬۵۶۶٬۶۶۶ ریال',
      avgSaleProfit: '۱۲٪',
    };
  }

  return {
    totalPurchases: 24,
    totalInquiries: 18,
    totalPurchaseAmount: '۱۸٬۴۰۰٬۰۰۰٬۰۰۰ ریال',
    totalPurchaseProfit: '۲٬۲۰۰٬۰۰۰٬۰۰۰ ریال',
    avgPurchaseAmount: '۷۶۶٬۶۶۶ ریال',
    avgPurchaseProfit: '۱۱٪',
  };
}
