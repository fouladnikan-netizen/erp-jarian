import {
  calculateLineSubtotal,
  calculateVatAmount,
  calculateQuoteWithDiscount,
  calculateTotalsWithVat,
} from '../services/quotingService';
import { roundMoney } from '../../../shared/utils/money';
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
    // subtotal 100M − discount 10M = 90M taxable; VAT 9M; final 99M
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
    // Scale to rials: float noise must still round to exact integer money
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
