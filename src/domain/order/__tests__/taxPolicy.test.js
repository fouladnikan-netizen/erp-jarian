import { describe, expect, it } from 'vitest';
import {
  deriveFormalSellingDisplay,
  computeFormalTaxFromInclusive,
  computeInformalTaxFromInclusive,
  resolveSellingPrice,
} from '../taxPolicy.js';

describe('taxPolicy — two real prices + formal display only', () => {
  it('formal: sellingPrice 800000 → display ≈ 727273, VAT remainder, grand = 800000', () => {
    const r = deriveFormalSellingDisplay({ sellingPrice: 800_000, qty: 1 });
    expect(r.ok).toBe(true);
    expect(r.sellingPrice).toBe(800_000);
    expect(r.displaySellingUnitPrice).toBe(Math.round(800_000 / 1.1));
    expect(r.vatAmount).toBe(800_000 - r.displaySellingUnitPrice);
    expect(r.grandTotal).toBe(800_000);
    expect(r.grandTotal).not.toBe(880_000);
  });

  it('informal and formal share same economic sellingPrice', () => {
    const lines = [{ sellingPrice: 800_000, qty: 1, purchasePrice: 770_000 }];
    const formal = computeFormalTaxFromInclusive(lines);
    const informal = computeInformalTaxFromInclusive(lines);
    expect(formal.grandTotal).toBe(800_000);
    expect(informal.grandTotal).toBe(800_000);
    expect(informal.lines[0].displaySellingUnitPrice).toBe(800_000);
    expect(formal.lines[0].displaySellingUnitPrice).toBe(Math.round(800_000 / 1.1));
    expect(formal.lines[0].purchasePrice).toBe(770_000);
  });

  it('resolveSellingPrice prefers sellingPrice over legacy aliases', () => {
    expect(resolveSellingPrice({ sellingPrice: 1, sellingPriceInclVat: 2 })).toBe(1);
    expect(resolveSellingPrice({ sellingPriceInclVat: 800_000 })).toBe(800_000);
  });
});
