import {
  calculateLineSubtotal,
  calculateVatAmount,
  calculateQuoteWithDiscount,
  calculateTotalsWithVat,
  canCompleteOrderInquiries,
  canCompleteQuoting,
  marginTypeToMode,
  getItemsMissingTarget,
} from '../quotingService.js';
import { roundMoney } from '../../../../shared/utils/money.js';
import { describe, expect, it } from 'vitest';

describe('quotingService — financial engine', () => {
  it('calculates base subtotal: 1000 kg × 50000 = 50,000,000', () => {
    expect(calculateLineSubtotal(1000, 50000)).toBe(50_000_000);
  });

  it('calculates 10% VAT on 100,000,000 → tax 10,000,000 and final 110,000,000', () => {
    const result = calculateTotalsWithVat(100_000_000, 0.1);
    expect(result.tax).toBe(10_000_000);
    expect(result.final).toBe(110_000_000);
    expect(calculateVatAmount(100_000_000, 0.1)).toBe(10_000_000);
  });

  it('applies discount then tax for B2B negotiations', () => {
    const result = calculateQuoteWithDiscount({
      subtotal: 100_000_000,
      discount: 10_000_000,
      vatRate: 0.1,
    });
    expect(result.taxable).toBe(90_000_000);
    expect(result.tax).toBe(9_000_000);
    expect(result.final).toBe(99_000_000);
  });

  it('handles floating-point precision without 0.30000000000004 artifacts', () => {
    const raw = 0.1 + 0.2;
    expect(raw).not.toBe(0.3);
    expect(roundMoney(raw * 1_000_000)).toBe(300_000);
    expect(calculateLineSubtotal(3, 100_000 / 3)).toBe(100_000);
    expect(calculateVatAmount(100.4, 0.1)).toBe(10);
  });

  it('rejects negative quantity or unit price', () => {
    expect(() => calculateLineSubtotal(-10, 5000)).toThrow(/quantity/i);
    expect(() => calculateLineSubtotal(10, -5000)).toThrow(/unitPrice/i);
    expect(() => calculateVatAmount(-1000)).toThrow(/taxableAmount/i);
    expect(() => calculateQuoteWithDiscount({
      subtotal: 1000,
      discount: -50,
    })).toThrow(/discount/i);
  });
});

describe('quotingService — completion gates', () => {
  it('canCompleteOrderInquiries requires an inquiry on every line', () => {
    expect(canCompleteOrderInquiries({ items: [] })).toBe(false);
    expect(canCompleteOrderInquiries({
      items: [{ name: 'A', inquiries: [] }],
    })).toBe(false);
    expect(canCompleteOrderInquiries({
      items: [{ name: 'A', inquiries: [{ id: 1 }] }],
    })).toBe(true);
  });

  it('canCompleteOrderInquiries requires new inquiries after proformaUpdate baseline', () => {
    const order = {
      items: [{ name: 'A', inquiries: [{ id: 10 }, { id: 11 }] }],
      proformaUpdate: { baselineInquiryIds: { 0: [10] } },
    };
    expect(canCompleteOrderInquiries(order)).toBe(true);
    expect(canCompleteOrderInquiries({
      items: [{ name: 'A', inquiries: [{ id: 10 }] }],
      proformaUpdate: { baselineInquiryIds: { 0: [10] } },
    })).toBe(false);
  });

  it('canCompleteQuoting requires inquiries, no blockers, and saved margins', () => {
    const incomplete = {
      items: [{ name: 'A', inquiries: [{ id: 1 }], targetInquiryId: 1 }],
      quoting: { marginMode: 'line_fixed_rial', lineMargins: {} },
    };
    expect(canCompleteQuoting(incomplete)).toBe(false);

    const ready = {
      items: [{
        name: 'A',
        inquiries: [{ id: 1, unitPrice: 1000 }],
        targetInquiryId: 1,
      }],
      quoting: {
        marginMode: 'line_fixed_rial',
        lineMargins: { 0: 100 },
      },
    };
    expect(canCompleteOrderInquiries(ready)).toBe(true);
    expect(getItemsMissingTarget(ready)).toEqual([]);
    expect(canCompleteQuoting(ready)).toBe(true);
  });

  it('marginTypeToMode maps percent and rial', () => {
    expect(marginTypeToMode('percent')).toBe('line_fixed_percent');
    expect(marginTypeToMode('rial')).toBe('line_fixed_rial');
  });
});
