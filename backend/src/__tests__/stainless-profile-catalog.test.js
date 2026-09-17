/**
 * Stainless square/rectangular tube identity matrix (operator catalog, not a second SoR).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildDisplayNameFromRule } from '../domain/productMaster/displayNameRule.js';
import {
  PROFILE_TYPE_NAME,
  PROFILE_ROWS,
} from '../domain/productMaster/profileCatalog.js';
import {
  FURNITURE_PROFILE_TYPE_NAME,
  furnitureProfileIdentityRows,
} from '../domain/productMaster/furnitureProfileCatalog.js';
import {
  STAINLESS_PROFILE_DEFAULT_LENGTH_M,
  STAINLESS_PROFILE_RECTANGLE_ROWS,
  STAINLESS_PROFILE_ROWS,
  STAINLESS_PROFILE_SQUARE_ROWS,
  STAINLESS_PROFILE_TYPE_NAMES,
  foldStainlessProfileTypeName,
  matchStainlessProfileTypeName,
  canonicalSides,
  stainlessProfileCatalogKey,
  stainlessProfileDisplayNameRule,
  stainlessProfileIdentityRows,
} from '../domain/productMaster/stainlessProfileCatalog.js';

describe('stainlessProfileCatalog', () => {
  it('lists 15 square + 15 rectangle mill rows, 30 unique keys, no cartesian extras', () => {
    assert.deepEqual([...STAINLESS_PROFILE_TYPE_NAMES], [
      'پروفیل استیل ۳۰۴',
      'پروفیل استیل ۳۱۶',
    ]);
    assert.equal(STAINLESS_PROFILE_DEFAULT_LENGTH_M, '6');
    assert.equal(foldStainlessProfileTypeName('پروفیل استیل 304L'), foldStainlessProfileTypeName('پروفیل استیل ۳۰۴'));
    assert.equal(matchStainlessProfileTypeName('پروفیل استیل 304', 'پروفیل استیل ۳۰۴'), true);
    assert.equal(matchStainlessProfileTypeName('پروفیل استیل 316L', 'پروفیل استیل ۳۱۶'), true);
    assert.equal(matchStainlessProfileTypeName('نبشی استیل ۳۰۴', 'پروفیل استیل ۳۰۴'), false);
    assert.equal(STAINLESS_PROFILE_SQUARE_ROWS.length, 15);
    assert.equal(STAINLESS_PROFILE_RECTANGLE_ROWS.length, 15);
    assert.equal(STAINLESS_PROFILE_ROWS.length, 30);
    assert.equal(STAINLESS_PROFILE_SQUARE_ROWS.every((row) => row.width === row.height), true);
    assert.equal(STAINLESS_PROFILE_RECTANGLE_ROWS.every((row) => row.width < row.height), true);

    assert.deepEqual(STAINLESS_PROFILE_SQUARE_ROWS[0], { width: 20, height: 20, thickness: 1 });
    assert.deepEqual(STAINLESS_PROFILE_SQUARE_ROWS.at(-1), { width: 100, height: 100, thickness: 2 });
    assert.deepEqual(STAINLESS_PROFILE_RECTANGLE_ROWS[0], { width: 10, height: 20, thickness: 1 });
    assert.deepEqual(STAINLESS_PROFILE_RECTANGLE_ROWS.at(-1), { width: 60, height: 120, thickness: 2 });

    const keys = STAINLESS_PROFILE_ROWS.map((row) => stainlessProfileCatalogKey(row.width, row.height, row.thickness));
    assert.equal(new Set(keys).size, 30);

    const rows = stainlessProfileIdentityRows(STAINLESS_PROFILE_TYPE_NAMES[0]);
    assert.equal(rows.length, 30);
    assert.equal(rows.every((row) => Object.keys(row).join() === 'width,height,thickness'), true);
    assert.equal(rows.every((row) => row.grade === undefined && row.length === undefined), true);

    const skuCount = STAINLESS_PROFILE_TYPE_NAMES.reduce(
      (sum, name) => sum + stainlessProfileIdentityRows(name).length,
      0,
    );
    assert.equal(skuCount, 60);
    assert.equal(skuCount, 2 * 30);

    assert.equal(
      STAINLESS_PROFILE_ROWS.some((row) => row.width === 30 && row.height === 30 && row.thickness === 1),
      false,
    );
    assert.equal(
      STAINLESS_PROFILE_ROWS.some((row) => row.width === 10 && row.height === 20 && row.thickness === 2),
      false,
    );
    assert.equal(
      STAINLESS_PROFILE_ROWS.some((row) => row.width === 20 && row.height === 20 && row.thickness === 3),
      false,
    );
    assert.deepEqual(
      STAINLESS_PROFILE_ROWS.filter((row) => row.width === 30 && row.height === 30).map((row) => row.thickness),
      [1.5, 2],
    );
  });

  it('canonicalizes 40×20 to 20×40 and never lists the swapped SKU', () => {
    assert.deepEqual(canonicalSides(40, 20), [20, 40]);
    assert.deepEqual(canonicalSides(20, 40), [20, 40]);
    assert.deepEqual(canonicalSides(20, 20), [20, 20]);
    assert.equal(stainlessProfileCatalogKey(40, 20, 2), stainlessProfileCatalogKey(20, 40, 2));
    assert.equal(stainlessProfileCatalogKey(40, 20, 2), '20x40@2');
    assert.equal(STAINLESS_PROFILE_ROWS.every((row) => row.width <= row.height), true);
    assert.equal(
      STAINLESS_PROFILE_ROWS.some((row) => row.width === 40 && row.height === 20),
      false,
    );
    assert.equal(
      STAINLESS_PROFILE_ROWS.some((row) => row.width === 20 && row.height === 40 && row.thickness === 2),
      true,
    );
    assert.equal(
      STAINLESS_PROFILE_ROWS.some((row) => row.width === 20 && row.height === 10),
      false,
    );
  });

  it('does not mix carbon پروفیل or furniture 40×20 identity', () => {
    assert.equal(PROFILE_TYPE_NAME, 'پروفیل');
    assert.equal(STAINLESS_PROFILE_TYPE_NAMES.includes(PROFILE_TYPE_NAME), false);
    assert.equal(STAINLESS_PROFILE_TYPE_NAMES.includes(FURNITURE_PROFILE_TYPE_NAME), false);
    assert.equal(PROFILE_ROWS.length > STAINLESS_PROFILE_ROWS.length, true);
    const furnitureSwapped = furnitureProfileIdentityRows().some(
      (row) => row.width === 40 && row.height === 20,
    );
    assert.equal(furnitureSwapped, true);
    assert.equal(
      stainlessProfileIdentityRows().some((row) => row.width === 40 && row.height === 20),
      false,
    );
  });

  it('builds names from type + canonical width×height + ضخامت میل + شاخه, not stored grade or length', () => {
    const rule = stainlessProfileDisplayNameRule({
      widthId: 'w',
      heightId: 'h',
      thicknessId: 't',
      lengthId: 'len',
    });
    const square = buildDisplayNameFromRule(rule, {
      sources: { type: 'پروفیل استیل ۳۰۴' },
      attributes: {
        w: { nameFa: 'عرض پروفیل', displayValue: '20' },
        h: { nameFa: 'طول پروفیل', displayValue: '20' },
        t: { nameFa: 'ضخامت', displayValue: '1', unitLabel: 'میل' },
        len: { nameFa: 'طول', displayValue: '6', unitLabel: 'متری' },
      },
    });
    assert.equal(square, 'پروفیل استیل ۳۰۴ ۲۰×۲۰ ضخامت ۱ میل شاخه ۶ متری');

    const rect = buildDisplayNameFromRule(rule, {
      sources: { type: 'پروفیل استیل ۳۰۴' },
      attributes: {
        w: { nameFa: 'عرض پروفیل', displayValue: '20' },
        h: { nameFa: 'طول پروفیل', displayValue: '40' },
        t: { nameFa: 'ضخامت', displayValue: '1.5', unitLabel: 'میل' },
        len: { nameFa: 'طول', displayValue: '6', unitLabel: 'متری' },
      },
    });
    assert.equal(rect, 'پروفیل استیل ۳۰۴ ۲۰×۴۰ ضخامت ۱.۵ میل شاخه ۶ متری');
    assert.equal(rect.includes('40×20'), false);
    assert.equal(rect.includes('گرید'), false);
    assert.equal(rect.includes('عرض پروفیل'), false);
  });
});
