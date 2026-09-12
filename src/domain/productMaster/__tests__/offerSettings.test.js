import { describe, expect, it } from 'vitest';
import {
  isCustomLengthAllowed,
  resolveProductOfferSettings,
  seedOfferSettingsFromType,
} from '../offerSettings.js';

const UOMS = [
  { id: 'uom_branch', nameFa: 'شاخه' },
  { id: 'uom_kg', nameFa: 'کیلوگرم' },
];

describe('seedOfferSettingsFromType', () => {
  it('copies Type defaults into the Product form seed', () => {
    expect(seedOfferSettingsFromType({
      defaultCountUnitId: 'uom_branch',
      defaultSalesUnitId: 'uom_kg',
      defaultUnitWeight: 12,
      customLengthAllowed: true,
    })).toEqual({
      countUnitId: 'uom_branch',
      salesUnitId: 'uom_kg',
      unitWeight: '12',
      customLengthAllowed: true,
    });
  });
});

describe('resolveProductOfferSettings', () => {
  it('reads count/sales aliases and labels from Unit Master', () => {
    const offer = resolveProductOfferSettings({
      baseUomId: 'uom_branch',
      salesUomId: 'uom_kg',
      unitWeight: 4,
      customLengthAllowed: true,
    }, UOMS);
    expect(offer.countUnitLabel).toBe('شاخه');
    expect(offer.salesUnitLabel).toBe('کیلوگرم');
    expect(offer.unitWeight).toBe(4);
    expect(isCustomLengthAllowed({ customLengthAllowed: true })).toBe(true);
    expect(isCustomLengthAllowed({ customLengthAllowed: false })).toBe(false);
  });
});
