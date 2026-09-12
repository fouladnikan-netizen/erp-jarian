/**
 * Product Type → Product offer defaults (DDL-47).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { applyTypeOfferDefaults, aliasProductOfferInput } from '../domain/productMaster/offerSettings.js';

const TYPE = {
  defaultCountUnitId: 'uom_branch',
  defaultSalesUnitId: 'uom_kg',
  defaultUnitWeight: null,
  customLengthAllowed: true,
};

describe('applyTypeOfferDefaults', () => {
  it('copies Type defaults when the create payload omits offer fields', () => {
    const offer = applyTypeOfferDefaults(TYPE, {});
    assert.equal(offer.baseUomId, 'uom_branch');
    assert.equal(offer.salesUomId, 'uom_kg');
    assert.equal(offer.unitWeight, null);
    assert.equal(offer.customLengthAllowed, true);
  });

  it('keeps explicit Product values over Type defaults', () => {
    const offer = applyTypeOfferDefaults(TYPE, {
      baseUomId: 'uom_piece',
      salesUomId: 'uom_ton',
      unitWeight: 12.5,
      customLengthAllowed: false,
    });
    assert.equal(offer.baseUomId, 'uom_piece');
    assert.equal(offer.salesUomId, 'uom_ton');
    assert.equal(offer.unitWeight, 12.5);
    assert.equal(offer.customLengthAllowed, false);
  });

  it('treats explicit null as empty, not as a request to copy', () => {
    const offer = applyTypeOfferDefaults(
      { ...TYPE, defaultUnitWeight: 8 },
      { unitWeight: null, baseUomId: null },
    );
    assert.equal(offer.baseUomId, null);
    assert.equal(offer.unitWeight, null);
  });

  it('maps countUnitId / salesUnitId aliases onto base/sales UOM', () => {
    const aliased = aliasProductOfferInput({ countUnitId: 'uom_sheet', salesUnitId: 'uom_kg' });
    assert.equal(aliased.baseUomId, 'uom_sheet');
    assert.equal(aliased.salesUomId, 'uom_kg');
    const offer = applyTypeOfferDefaults(TYPE, aliased);
    assert.equal(offer.baseUomId, 'uom_sheet');
    assert.equal(offer.salesUomId, 'uom_kg');
  });
});
