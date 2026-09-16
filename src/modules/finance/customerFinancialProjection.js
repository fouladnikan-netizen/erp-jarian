/**
 * Customer financial projection (read model).
 *
 * Builds a normalized cockpit view from Company seed / related-order data.
 * No ledger, no accounting model changes — preserves existing profile behavior.
 */

import { ENTITY_TYPES } from '../kanoon/config';
import { getReportCard } from '../kanoon/reportCard';

/**
 * مانده حساب — فیلد صریح یا برآورد از سفارش‌های مرتبط (هم‌منطق سرانجام).
 * @param {object|null|undefined} company
 * @returns {number}
 */
export function resolveBalanceRial(company) {
  if (!company) return 0;
  if (company.financial?.accountBalanceRial != null) {
    return Number(company.financial.accountBalanceRial);
  }
  if (company.accountBalanceRial != null) {
    return Number(company.accountBalanceRial);
  }
  return (company.relatedOrders || []).reduce((sum, row) => {
    const digits = String(row.amount || '').replace(/[^\d]/g, '');
    return sum + (Number(digits) || 0);
  }, 0);
}

/**
 * Display helper for rial amounts (seed strings with Persian digits preserved).
 * @param {unknown} amount
 * @returns {string}
 */
export function formatRial(amount) {
  if (amount == null || amount === '') return '—';
  if (typeof amount === 'string' && /[۰-۹]/.test(amount)) return `${amount} ریال`;
  const num = typeof amount === 'number' ? amount : Number(String(amount).replace(/[^\d.-]/g, ''));
  if (!Number.isFinite(num)) return String(amount);
  return `${Math.abs(num).toLocaleString('fa-IR')} ریال`;
}

/**
 * @param {object|null|undefined} company
 * @returns {{
 *   balanceRial: number,
 *   creditLimitRial: number|null,
 *   availableCreditRial: number|null,
 *   creditStatus: 'debtor'|'settled',
 *   metrics: {
 *     isCustomer: boolean,
 *     creditUsageRatio: number|null,
 *     totalSales: string|null,
 *     totalPurchaseAmount: string|null,
 *     totalPurchases: number|null,
 *     totalInquiries: number|null,
 *   },
 * }}
 */
export function getCustomerFinancialSummary(company) {
  if (!company) {
    return {
      balanceRial: 0,
      creditLimitRial: null,
      availableCreditRial: null,
      creditStatus: 'settled',
      metrics: {
        isCustomer: true,
        creditUsageRatio: null,
        totalSales: null,
        totalPurchaseAmount: null,
        totalPurchases: null,
        totalInquiries: null,
      },
    };
  }

  const isCustomer = company.entityType !== ENTITY_TYPES.SUPPLIER;
  const balanceRial = resolveBalanceRial(company);
  const creditLimitRaw = company.financial?.creditLimitRial ?? company.creditLimitRial ?? null;
  const creditLimitRial = creditLimitRaw == null || creditLimitRaw === ''
    ? null
    : Number(creditLimitRaw);
  const safeLimit = Number.isFinite(creditLimitRial) ? creditLimitRial : null;

  const creditStatus = balanceRial > 0 ? 'debtor' : 'settled';
  const availableCreditRial = safeLimit != null
    ? Math.max(0, safeLimit - balanceRial)
    : null;
  const creditUsageRatio = safeLimit
    ? Math.min(1, Math.max(0, balanceRial / safeLimit))
    : null;

  const report = getReportCard(company);

  return {
    balanceRial,
    creditLimitRial: safeLimit,
    availableCreditRial,
    creditStatus,
    metrics: {
      isCustomer,
      creditUsageRatio,
      totalSales: isCustomer ? report.totalSales : null,
      totalPurchaseAmount: isCustomer ? null : report.totalPurchaseAmount,
      totalPurchases: isCustomer ? null : Number(report.totalPurchases || 0),
      totalInquiries: isCustomer ? null : Number(report.totalInquiries || 0),
    },
  };
}

export default {
  getCustomerFinancialSummary,
  resolveBalanceRial,
  formatRial,
};
