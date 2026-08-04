import { describe, expect, it } from 'vitest';
import {
  formatRial,
  getCustomerFinancialSummary,
  resolveBalanceRial,
} from '../customerFinancialProjection.js';
import { ENTITY_TYPES } from '../../kanoon/config.js';

describe('customerFinancialProjection', () => {
  it('balance calculation prefers financial.accountBalanceRial', () => {
    const company = {
      entityType: ENTITY_TYPES.CUSTOMER,
      financial: { accountBalanceRial: 6_050_000_000, creditLimitRial: 20_000_000_000 },
      accountBalanceRial: 1,
      relatedOrders: [{ amount: '۹۹۹٬۰۰۰' }],
    };

    expect(resolveBalanceRial(company)).toBe(6_050_000_000);
    const summary = getCustomerFinancialSummary(company);
    expect(summary.balanceRial).toBe(6_050_000_000);
    expect(summary.creditLimitRial).toBe(20_000_000_000);
    expect(summary.availableCreditRial).toBe(20_000_000_000 - 6_050_000_000);
    expect(summary.creditStatus).toBe('debtor');
    expect(summary.metrics.creditUsageRatio).toBeCloseTo(6_050_000_000 / 20_000_000_000);
  });

  it('credit status remains settled when balance is zero', () => {
    const summary = getCustomerFinancialSummary({
      entityType: ENTITY_TYPES.CUSTOMER,
      financial: { creditLimitRial: 5_000_000_000, accountBalanceRial: 0 },
    });

    expect(summary.balanceRial).toBe(0);
    expect(summary.creditStatus).toBe('settled');
    expect(summary.availableCreditRial).toBe(5_000_000_000);
    expect(summary.metrics.creditUsageRatio).toBe(0);
  });

  it('falls back to relatedOrders amounts when balance fields are missing', () => {
    const summary = getCustomerFinancialSummary({
      entityType: ENTITY_TYPES.CUSTOMER,
      relatedOrders: [
        { amount: '1,000,000' },
        { amount: '2,500,000' },
      ],
    });

    expect(summary.balanceRial).toBe(3_500_000);
    expect(summary.creditLimitRial).toBeNull();
    expect(summary.availableCreditRial).toBeNull();
    expect(summary.creditStatus).toBe('debtor');
    expect(summary.metrics.creditUsageRatio).toBeNull();
  });

  it('handles missing company / financial data safely', () => {
    const empty = getCustomerFinancialSummary(null);
    expect(empty.balanceRial).toBe(0);
    expect(empty.creditLimitRial).toBeNull();
    expect(empty.creditStatus).toBe('settled');
    expect(empty.metrics.creditUsageRatio).toBeNull();

    const bare = getCustomerFinancialSummary({ entityType: ENTITY_TYPES.CUSTOMER });
    expect(bare.balanceRial).toBe(0);
    expect(bare.creditStatus).toBe('settled');
    expect(bare.metrics.isCustomer).toBe(true);
    expect(bare.metrics.totalSales).toBeTruthy();
  });

  it('old company seed shape still renders customer metrics', () => {
    const summary = getCustomerFinancialSummary({
      entityType: ENTITY_TYPES.CUSTOMER,
      accountBalanceRial: 8_400_000_000,
      financial: { creditLimitRial: 10_000_000_000, accountBalanceRial: 8_400_000_000 },
      reportCard: {
        totalSales: '۴۲٬۸۰۰٬۰۰۰٬۰۰۰ ریال',
      },
    });

    expect(summary.balanceRial).toBe(8_400_000_000);
    expect(summary.creditStatus).toBe('debtor');
    expect(summary.metrics.totalSales).toBe('۴۲٬۸۰۰٬۰۰۰٬۰۰۰ ریال');
    expect(formatRial(summary.balanceRial)).toContain('ریال');
  });

  it('supplier projection uses purchase metrics, not credit cockpit fields as primary KPIs', () => {
    const summary = getCustomerFinancialSummary({
      entityType: ENTITY_TYPES.SUPPLIER,
      reportCard: {
        totalPurchases: 24,
        totalInquiries: 18,
        totalPurchaseAmount: '۱۸٬۴۰۰٬۰۰۰٬۰۰۰ ریال',
      },
    });

    expect(summary.metrics.isCustomer).toBe(false);
    expect(summary.metrics.totalPurchaseAmount).toBe('۱۸٬۴۰۰٬۰۰۰٬۰۰۰ ریال');
    expect(summary.metrics.totalPurchases).toBe(24);
    expect(summary.metrics.totalInquiries).toBe(18);
    expect(summary.metrics.totalSales).toBeNull();
  });
});
