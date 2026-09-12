/**
 * Stainless equal-leg angle identity matrix (operator catalog, not a second SoR).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildDisplayNameFromRule } from '../domain/productMaster/displayNameRule.js';
import {
  STAINLESS_ANGLE_DEFAULT_LENGTH_M,
  STAINLESS_ANGLE_LEG_VALUES,
  STAINLESS_ANGLE_ROWS,
  STAINLESS_ANGLE_TYPE_NAMES,
  stainlessAngleDisplayNameRule,
  stainlessAngleIdentityRows,
} from '../domain/productMaster/stainlessAngleCatalog.js';

function hasPair(rows, size, thickness) {
  return rows.some((row) => row.size === size && row.thickness === thickness);
}

describe('stainlessAngleCatalog', () => {
  it('lists 16 closed equal-leg mill pairs and no unequal legs', () => {
    assert.deepEqual([...STAINLESS_ANGLE_TYPE_NAMES], [
      'نبشی استیل ۳۰۴',
      'نبشی استیل ۳۱۶',
    ]);
    assert.equal(STAINLESS_ANGLE_ROWS.length, 16);
    assert.deepEqual(STAINLESS_ANGLE_ROWS[0], { size: 20, thickness: 2 });
    assert.deepEqual(STAINLESS_ANGLE_ROWS.at(-1), { size: 100, thickness: 10 });
    assert.equal(hasPair(STAINLESS_ANGLE_ROWS, 40, 4), true);
    assert.equal(hasPair(STAINLESS_ANGLE_ROWS, 25, 3), true);
    assert.equal(hasPair(STAINLESS_ANGLE_ROWS, 20, 10), false);
    assert.equal(hasPair(STAINLESS_ANGLE_ROWS, 20, 4), false);
    assert.equal(STAINLESS_ANGLE_ROWS.some((row) => row.size === 20 && row.thickness === 10), false);
    assert.equal(STAINLESS_ANGLE_ROWS.every((row) => row.height2 === undefined && row.leg2 === undefined), true);
    const keys = STAINLESS_ANGLE_ROWS.map((row) => `${row.size}x${row.size}@${row.thickness}`);
    assert.equal(new Set(keys).size, 16);
    assert.equal(keys.some((key) => key.startsWith('20x10')), false);
    assert.deepEqual([...STAINLESS_ANGLE_LEG_VALUES], ['20', '25', '30', '40', '50', '60', '70', '80', '100']);
  });

  it('uses the same identity matrix for both Types, without grade or length', () => {
    const rows = stainlessAngleIdentityRows();
    assert.equal(rows.length, 16);
    assert.deepEqual(rows[0], { height: '20', height2: '20', thickness: 2 });
    assert.deepEqual(rows.at(-1), { height: '100', height2: '100', thickness: 10 });
    assert.equal(rows.every((row) => row.height === row.height2), true);
    assert.equal(rows.some((row) => row.height === '20' && row.height2 === '10'), false);
    assert.equal(rows.every((row) => row.grade === undefined && row.length === undefined), true);
    assert.equal(STAINLESS_ANGLE_DEFAULT_LENGTH_M, '6');
    assert.equal(STAINLESS_ANGLE_TYPE_NAMES.length * rows.length, 32);
  });

  it('builds carbon-style names: equal-leg × thickness + شاخه 6 متری', () => {
    const rule = stainlessAngleDisplayNameRule({
      heightId: 'h',
      height2Id: 'h2',
      thicknessId: 't',
      lengthId: 'len',
    });
    const name = buildDisplayNameFromRule(rule, {
      sources: { type: 'نبشی استیل ۳۰۴' },
      attributes: {
        h: { nameFa: 'بال ۱', displayValue: '40' },
        h2: { nameFa: 'بال ۲', displayValue: '40' },
        t: { nameFa: 'ضخامت', displayValue: '4', unitLabel: 'میل' },
        len: { nameFa: 'طول', displayValue: '6', unitLabel: 'متری' },
      },
    });
    assert.equal(name, 'نبشی استیل ۳۰۴ 40×40 ضخامت 4 میل شاخه 6 متری');
    assert.equal(name.includes('گرید'), false);
  });
});
