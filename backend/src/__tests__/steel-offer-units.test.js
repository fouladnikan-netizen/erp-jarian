/**
 * Catalog invariants for carbon-steel Type offer units (not a second SoR).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  RING_UOM,
  STEEL_TYPE_OFFER_UNITS,
  resolveTypeName,
  resolveUomName,
} from '../domain/productMaster/steelOfferUnits.js';
import { FORGED_FITTING_TYPE_NAMES } from '../domain/productMaster/forgedFittingCatalog.js';
import { THREADED_FITTING_TYPE_NAMES } from '../domain/productMaster/threadedFittingCatalog.js';
import { FLANGE_TYPE_NAMES } from '../domain/productMaster/flangeCatalog.js';
import { FASTENER_TYPE_NAMES } from '../domain/productMaster/fastenerCatalog.js';

describe('steel offer units catalog', () => {
  it('has unique type names after alias resolution', () => {
    const seen = new Set();
    for (const row of STEEL_TYPE_OFFER_UNITS) {
      const name = resolveTypeName(row.typeName);
      assert.equal(seen.has(name), false, `duplicate type ${name}`);
      seen.add(name);
    }
    assert.equal(seen.size, STEEL_TYPE_OFFER_UNITS.length);
    assert.ok(seen.size >= 108, `expected ≥108 (45 carbon + 9 seamless + 26 fittings + 28 fasteners), got ${seen.size}`);
  });

  it('maps operator aliases to catalog type names', () => {
    assert.equal(resolveTypeName('لوله جدارچاه'), 'لوله جدار چاه');
    assert.equal(resolveTypeName('توری'), 'توری جوشی');
    assert.equal(resolveTypeName('توری فولادی'), 'توری جوشی');
    assert.equal(resolveUomName('مترمربع'), 'متر مربع');
  });

  it('sells IPE by شاخه and mesh by متر مربع; sheets by برگ', () => {
    const byType = new Map(STEEL_TYPE_OFFER_UNITS.map((r) => [resolveTypeName(r.typeName), r]));
    assert.equal(byType.get('تیرآهن IPE').salesUnitFa, 'شاخه');
    assert.equal(byType.get('توری جوشی').countUnitFa, 'متر مربع');
    assert.equal(byType.get('توری حصاری').countUnitFa, 'متر مربع');
    assert.equal(byType.get('مش جوشی ساختمانی').countUnitFa, 'متر مربع');
    assert.equal(byType.get('سیم فولادی').countUnitFa, RING_UOM.nameFa);
    const sheets = STEEL_TYPE_OFFER_UNITS.filter((r) => resolveTypeName(r.typeName).startsWith('ورق'));
    assert.ok(sheets.length >= 13);
    for (const row of sheets) {
      assert.equal(row.countUnitFa, 'برگ', row.typeName);
      assert.equal(row.salesUnitFa, 'کیلوگرم', row.typeName);
    }
    const branchSales = STEEL_TYPE_OFFER_UNITS.filter((r) => r.salesUnitFa === 'شاخه');
    assert.deepEqual(branchSales.map((r) => r.typeName), ['تیرآهن IPE']);
    const fittings = STEEL_TYPE_OFFER_UNITS.filter((r) => (
      (r.typeName.includes('مانیسمان') && r.typeName !== 'لوله مانیسمان')
      || r.typeName === 'تبدیل لبه‌دار (استب اند)'
    ));
    assert.equal(fittings.length, 9);
    for (const row of fittings) {
      assert.equal(row.countUnitFa, 'عدد', row.typeName);
      assert.equal(row.salesUnitFa, 'عدد', row.typeName);
    }
    const extraFittingNames = [
      ...FORGED_FITTING_TYPE_NAMES,
      ...THREADED_FITTING_TYPE_NAMES,
      ...FLANGE_TYPE_NAMES,
    ];
    assert.equal(extraFittingNames.length, 26);
    for (const name of extraFittingNames) {
      const row = byType.get(name);
      assert.ok(row, name);
      assert.equal(row.countUnitFa, 'عدد', name);
      assert.equal(row.salesUnitFa, 'عدد', name);
    }
    assert.equal(FASTENER_TYPE_NAMES.length, 28);
    for (const name of FASTENER_TYPE_NAMES) {
      const row = byType.get(name);
      assert.ok(row, name);
      assert.equal(row.countUnitFa, 'عدد', name);
      assert.equal(row.salesUnitFa, 'عدد', name);
    }
  });
});
