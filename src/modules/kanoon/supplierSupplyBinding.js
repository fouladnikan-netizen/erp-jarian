import { getTadarokLines } from '../nabz/tadarokStageService';
import { TADAROK_LINE_STATUS } from '../nabz/tadarokStageConfig';

/**
 * Read-only supply-side projections for a supplier Company profile.
 * Does not invent a store — scans Nabz orders for inquiry / PO rows.
 */

function formatPrice(amount) {
  if (amount == null || amount === '') return '—';
  const num = typeof amount === 'number' ? amount : Number(String(amount).replace(/[^\d.-]/g, ''));
  if (!Number.isFinite(num)) return String(amount);
  return `${Math.abs(num).toLocaleString('fa-IR')} ریال`;
}

/**
 * @param {string|number} supplierId
 * @param {Array<object>} orders
 */
export function listSupplierInquiries(supplierId, orders = []) {
  const sid = String(supplierId);
  const rows = [];

  for (const order of orders || []) {
    for (const item of order.items || []) {
      for (const inquiry of item.inquiries || []) {
        if (String(inquiry.supplierId) !== sid) continue;
        rows.push({
          id: `inq-${order.code || order.id}-${inquiry.id}`,
          inquiryId: inquiry.id,
          orderCode: order.code || String(order.id),
          date: inquiry.registeredAt || order.registeredDate || '',
          unitPrice: inquiry.unitPrice,
          unitPriceLabel: formatPrice(inquiry.unitPrice),
          supplyType: inquiry.supplyType || '—',
          description: item.description || '',
          productName: item.name || '—',
          status: inquiry.status || '—',
          notes: inquiry.notes || '',
          qty: item.qty,
          unit: item.unit || '',
        });
      }
    }
  }

  return rows.sort((a, b) => String(b.date).localeCompare(String(a.date), 'fa'));
}

/**
 * Purchase-order style rows issued (or drafted) against this supplier.
 * @param {string|number} supplierId
 * @param {Array<object>} orders
 */
export function listSupplierPurchaseOrders(supplierId, orders = []) {
  const sid = String(supplierId);
  const rows = [];

  for (const order of orders || []) {
    let lines = [];
    try {
      lines = getTadarokLines(order) || [];
    } catch {
      lines = order.tadarokLines || [];
    }

    for (const line of lines) {
      const po = line.purchaseOrder || null;
      const lineSupplierId = po?.supplierId ?? line.kavoshSupplierId ?? line.supplierId;
      if (lineSupplierId == null || String(lineSupplierId) !== sid) continue;

      const isIssued = line.status === TADAROK_LINE_STATUS.PO_ISSUED || Boolean(po);
      if (!isIssued && String(line.kavoshSupplierId) !== sid) continue;

      const price = po?.agreedUnitPriceRial ?? line.estimatedUnitPriceRial ?? null;
      rows.push({
        id: `po-${order.code || order.id}-${line.id}`,
        lineId: line.id,
        orderCode: order.code || String(order.id),
        date: po?.issuedAt || po?.createdAt || order.registeredDate || '',
        unitPrice: price,
        unitPriceLabel: formatPrice(price),
        supplyType: po?.supplyType || line.supplyType || '—',
        description: line.description || '',
        productName: line.name || '—',
        status: line.status || '—',
        qty: po?.purchaseQty ?? line.qty,
        unit: line.unit || '',
        poNumber: po?.documentNumber || po?.id || '',
      });
    }
  }

  return rows.sort((a, b) => String(b.date).localeCompare(String(a.date), 'fa'));
}
