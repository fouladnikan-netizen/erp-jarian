import { getCustomerById } from './customers';
import { listCrmPaymentsAsCustomerPayments } from './orderCrmService';
import { getAllLoadItems, LOAD_ITEM_STATUS } from './rahseparLoadingService';
import { getFulfilledPurchaseRows } from './shippingService';
import { getTadarokLines } from './tadarokStageService';
import { TADAROK_LINE_STATUS } from './tadarokStageConfig';
import { getSupplierName } from './suppliers';

const WEIGHT_VARIANCE_WARN_RATIO = 0.005; // 0.5%

function toNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function qtyToKilograms(qty, unit = 'تن') {
  const amount = toNum(qty);
  const normalized = String(unit || '').trim();
  if (normalized === 'کیلوگرم' || normalized === 'kg' || normalized === 'KG') return amount;
  if (normalized === 'تن' || normalized === 'تنه') return amount * 1000;
  return amount;
}

function kilogramsToDisplayTons(kg) {
  return toNum(kg) / 1000;
}

/**
 * مانده حساب مشتری در کانون (در صورت نبود فیلد صریح، از سفارش‌های مرتبط برآورد می‌شود).
 */
export function getCustomerKanoonAccountBalanceRial(customerId) {
  const customer = getCustomerById(customerId);
  if (!customer) return 0;
  if (customer.accountBalanceRial != null && customer.accountBalanceRial !== '') {
    return toNum(customer.accountBalanceRial);
  }
  return (customer.relatedOrders || []).reduce((sum, row) => {
    const digits = String(row.amount || '').replace(/[^\d]/g, '');
    return sum + (Number(digits) || 0);
  }, 0);
}

function buildSettlementLines(order) {
  const purchaseRows = getFulfilledPurchaseRows(order);
  const loadItems = getAllLoadItems(order);
  const loadById = new Map(loadItems.map((item) => [String(item.id), item]));

  return purchaseRows.map((row, index) => {
    const load = loadById.get(String(row.id)) || loadById.get(String(row.shippingRowKey)) || null;
    const invoicedWeightKg = qtyToKilograms(row.qty, row.unit);
    const scaleWeightKg = load?.scaleWeight != null
      ? toNum(load.scaleWeight)
      : (load?.status === LOAD_ITEM_STATUS.DISPATCHED ? invoicedWeightKg : null);
    const effectiveWeightKg = scaleWeightKg != null && scaleWeightKg > 0
      ? scaleWeightKg
      : invoicedWeightKg;
    const varianceRatio = invoicedWeightKg > 0 && scaleWeightKg != null
      ? Math.abs(scaleWeightKg - invoicedWeightKg) / invoicedWeightKg
      : 0;
    const saleUnitPrice = toNum(row.saleUnitPriceRial);
    const purchaseUnitPrice = toNum(row.purchaseUnitPriceRial);
    const saleLineTotal = kilogramsToDisplayTons(effectiveWeightKg) * saleUnitPrice;
    const purchaseLineTotal = kilogramsToDisplayTons(invoicedWeightKg) * purchaseUnitPrice;
    const loadingFee = toNum(load?.loadingFee);
    const freightFare = toNum(load?.assignment?.freightFare);

    return {
      id: row.id || `settle-${index}`,
      name: row.name,
      description: row.description || '',
      unit: row.unit || 'تن',
      supplierId: row.supplierId,
      supplierName: row.supplierName || '—',
      agreedRateRial: saleUnitPrice,
      purchaseUnitPriceRial: purchaseUnitPrice,
      invoicedQty: toNum(row.qty),
      invoicedWeightKg,
      scaleWeightKg,
      effectiveWeightKg,
      varianceRatio,
      hasWeightVarianceWarning: varianceRatio > WEIGHT_VARIANCE_WARN_RATIO,
      saleLineTotalRial: Math.round(saleLineTotal),
      purchaseLineTotalRial: Math.round(purchaseLineTotal),
      loadingFeeRial: loadingFee,
      freightFareRial: freightFare,
      logisticsCostRial: loadingFee + freightFare,
      warehouseVoucherCode: row.warehouseVoucherCode,
    };
  });
}

function buildSupplierSettlementRows(lines, supplierPayments = []) {
  const map = new Map();

  lines.forEach((line) => {
    const key = String(line.supplierName || line.supplierId || '—');
    if (!map.has(key)) {
      map.set(key, {
        supplierKey: key,
        supplierName: line.supplierName || '—',
        invoicedWeightKg: 0,
        deliveredWeightKg: 0,
        totalCostRial: 0,
        hasWeightVarianceWarning: false,
        lines: [],
        payments: [],
      });
    }
    const entry = map.get(key);
    entry.invoicedWeightKg += line.invoicedWeightKg;
    entry.deliveredWeightKg += line.effectiveWeightKg;
    entry.totalCostRial += line.purchaseLineTotalRial;
    entry.hasWeightVarianceWarning = entry.hasWeightVarianceWarning || line.hasWeightVarianceWarning;
    entry.lines.push(line);
  });

  (supplierPayments || []).forEach((pay) => {
    const key = String(pay.supplier || pay.supplierId || '—');
    if (!map.has(key)) {
      map.set(key, {
        supplierKey: key,
        supplierName: pay.supplier || getSupplierName(pay.supplierId) || '—',
        invoicedWeightKg: 0,
        deliveredWeightKg: 0,
        totalCostRial: 0,
        hasWeightVarianceWarning: false,
        lines: [],
        payments: [],
      });
    }
    map.get(key).payments.push(pay);
  });

  return Array.from(map.values()).map((entry) => {
    const paidRial = entry.payments.reduce((sum, pay) => sum + toNum(pay.amountRial), 0);
    const varianceRatio = entry.invoicedWeightKg > 0
      ? Math.abs(entry.deliveredWeightKg - entry.invoicedWeightKg) / entry.invoicedWeightKg
      : 0;
    return {
      ...entry,
      paidRial,
      balanceRial: entry.totalCostRial - paidRial,
      varianceRatio,
      hasWeightVarianceWarning: entry.hasWeightVarianceWarning || varianceRatio > WEIGHT_VARIANCE_WARN_RATIO,
    };
  });
}

function collectCustomerPayments(order) {
  const fromSaranjam = order?.saranjam?.customerPayments || [];
  const fromCrm = listCrmPaymentsAsCustomerPayments(order);
  const byId = new Map();
  fromSaranjam.forEach((pay) => byId.set(pay.id, pay));
  fromCrm.forEach((pay) => byId.set(pay.id, pay));
  return Array.from(byId.values());
}

/**
 * مدل محاسباتی کامل سرانجام برای KPI، دفتر دوگانه و بایگانی.
 */
export function buildSaranjamSettlementModel(order) {
  const lines = buildSettlementLines(order);
  const supplierPayments = order?.saranjam?.supplierPayments || [];
  const customerPayments = collectCustomerPayments(order);
  const suppliers = buildSupplierSettlementRows(lines, supplierPayments);

  const finalSalesAmountRial = lines.reduce((sum, line) => sum + line.saleLineTotalRial, 0);
  const totalPurchaseAmountRial = lines.reduce((sum, line) => sum + line.purchaseLineTotalRial, 0);
  const logisticsCostRial = lines.reduce((sum, line) => sum + line.logisticsCostRial, 0);
  const netProfitRial = finalSalesAmountRial - totalPurchaseAmountRial - logisticsCostRial;
  const profitPercent = finalSalesAmountRial > 0
    ? (netProfitRial / finalSalesAmountRial) * 100
    : 0;

  const customerPaidRial = customerPayments.reduce((sum, pay) => sum + toNum(pay.amountRial), 0);
  const orderCustomerBalanceRial = finalSalesAmountRial - customerPaidRial;
  const kanoonAccountBalanceRial = getCustomerKanoonAccountBalanceRial(order?.customerId);

  const tadarokIssued = getTadarokLines(order)
    .filter((line) => line.status === TADAROK_LINE_STATUS.PO_ISSUED);
  const purchaseInvoicesReady = tadarokIssued.length > 0
    && (
      order?.saranjam?.items?.length
        ? order.saranjam.items.every((item) => item.invoiceUploaded)
        : true
    );

  const archived = Boolean(order?.saranjam?.archivedAt || order?.saranjam?.locked);
  const salesInvoiceIssued = Boolean(order?.saranjam?.salesInvoiceIssued);

  return {
    lines,
    suppliers,
    customerPayments,
    kpis: {
      finalSalesAmountRial,
      totalPurchaseAmountRial,
      logisticsCostRial,
      netProfitRial,
      profitPercent,
    },
    customerLedger: {
      lines,
      payments: customerPayments,
      orderBalanceRial: orderCustomerBalanceRial,
      kanoonAccountBalanceRial,
      paidRial: customerPaidRial,
      finalSalesAmountRial,
    },
    gates: {
      purchaseInvoicesReady,
      salesInvoiceIssued,
      customerBalanceZero: orderCustomerBalanceRial === 0,
      supplierBalancesZero: suppliers.length > 0
        && suppliers.every((row) => row.balanceRial === 0),
      archived,
      canArchive: !archived,
    },
    archived,
    locked: archived || Boolean(order?.saranjam?.locked),
  };
}

export function isOrderArchived(order) {
  return Boolean(order?.saranjam?.archivedAt || order?.saranjam?.locked);
}

export { WEIGHT_VARIANCE_WARN_RATIO };
