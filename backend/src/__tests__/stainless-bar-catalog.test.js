/**
 * Stainless round-bar identity matrix (operator catalog, not a second SoR).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildDisplayNameFromRule } from '../domain/productMaster/displayNameRule.js';
import {
  DEFORMED_REBAR_SIZES,
  DEFORMED_REBAR_TYPE_NAME,
  deformedRebarIdentityRows,
} from '../domain/productMaster/deformedRebarCatalog.js';
import {
  STAINLESS_BAR_DEFAULT_LENGTH_M,
  STAINLESS_BAR_SIZES_MM,
  STAINLESS_BAR_TYPE_NAMES,
  stainlessBarDisplayNameRule,
  stainlessBarIdentityRows,
} from '../domain/productMaster/stainlessBarCatalog.js';

describe('stainlessBarCatalog', () => {
  it('lists 23 mill diameters under four Type names, size-only identity', () => {
    assert.deepEqual([...STAINLESS_BAR_TYPE_NAMES], [
      'میلگرد استیل ۳۰۴',
      'میلگرد استیل ۳۱۶',
      'میلگرد استیل ۳۲۱',
      'میلگرد استیل ۴۲۰',
    ]);
    assert.deepEqual([...STAINLESS_BAR_SIZES_MM], [
      6, 8, 10, 12, 14, 16, 18, 20, 22, 25, 28, 30, 32, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80,
    ]);
    assert.equal(STAINLESS_BAR_SIZES_MM.length, 23);
    assert.equal(STAINLESS_BAR_DEFAULT_LENGTH_M, '6');

    const rows = stainlessBarIdentityRows(STAINLESS_BAR_TYPE_NAMES[0]);
    assert.equal(rows.length, 23);
    assert.deepEqual(rows[0], { size: 6 });
    assert.deepEqual(rows.at(-1), { size: 80 });
    assert.equal(rows.every((row) => row.grade === undefined && row.length === undefined), true);
    assert.equal(new Set(rows.map((row) => row.size)).size, 23);

    const skuCount = STAINLESS_BAR_TYPE_NAMES.reduce(
      (sum, name) => sum + stainlessBarIdentityRows(name).length,
      0,
    );
    assert.equal(skuCount, 92);
    assert.equal(skuCount, 4 * 23);
  });

  it('does not cartesian size×grade like construction deformed rebar', () => {
    const deformed = deformedRebarIdentityRows();
    assert.equal(DEFORMED_REBAR_TYPE_NAME, 'میلگرد آجدار');
    assert.equal(deformed.some((row) => row.grade), true);
    assert.equal(deformed.length, 26);
    assert.equal(STAINLESS_BAR_TYPE_NAMES.includes(DEFORMED_REBAR_TYPE_NAME), false);
    assert.equal(STAINLESS_BAR_SIZES_MM.includes(6), true);
    assert.equal(DEFORMED_REBAR_SIZES.includes(6), false);
    assert.equal(STAINLESS_BAR_SIZES_MM.includes(36), false);
    assert.equal(DEFORMED_REBAR_SIZES.includes(36), true);

    const stainless = stainlessBarIdentityRows('میلگرد استیل ۳۰۴');
    assert.equal(stainless.length, STAINLESS_BAR_SIZES_MM.length);
    assert.equal(stainless.every((row) => Object.keys(row).join() === 'size'), true);
  });

  it('builds names from type + mill size + شاخه, not stored grade or length', () => {
    const rule = stainlessBarDisplayNameRule({
      sizeId: 'sz',
      lengthId: 'len',
    });
    const name = buildDisplayNameFromRule(rule, {
      sources: { type: 'میلگرد استیل ۳۰۴' },
      attributes: {
        sz: { nameFa: 'سایز', displayValue: '12', unitLabel: 'میل' },
        len: { nameFa: 'طول', displayValue: '6', unitLabel: 'متری' },
      },
    });
    assert.equal(name, 'میلگرد استیل ۳۰۴ 12 میل شاخه 6 متری');
    assert.equal(name.includes('گرید'), false);
    assert.equal(name.includes('سایز'), false);
  });
});
