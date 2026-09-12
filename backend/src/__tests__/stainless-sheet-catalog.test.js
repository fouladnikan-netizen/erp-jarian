/**
 * Stainless mill-sheet identity matrix (operator catalog, not a second SoR).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sheetMillLengthDefault } from '../domain/productMaster/sheetMillLength.js';
import {
  STAINLESS_SHEET_FROM_1_5_TYPE_NAMES,
  STAINLESS_SHEET_FULL_TYPE_NAMES,
  STAINLESS_SHEET_THICKNESSES,
  STAINLESS_SHEET_TYPE_NAMES,
  stainlessSheetIdentityRows,
  stainlessSheetWidthsForThickness,
} from '../domain/productMaster/stainlessSheetCatalog.js';

function hasRow(rows, thickness, width) {
  return rows.some((row) => row.thickness === thickness && row.width === width);
}

describe('stainlessSheetCatalog', () => {
  it('uses thickness×width bands and keeps grade on the Type name', () => {
    assert.deepEqual([...STAINLESS_SHEET_THICKNESSES], [
      0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30,
    ]);
    assert.deepEqual(stainlessSheetWidthsForThickness(0.4), [1000, 1250]);
    assert.deepEqual(stainlessSheetWidthsForThickness(1), [1000, 1250]);
    assert.deepEqual(stainlessSheetWidthsForThickness(1.25), [1000, 1250, 1500]);
    assert.deepEqual(stainlessSheetWidthsForThickness(4), [1000, 1250, 1500]);
    assert.deepEqual(stainlessSheetWidthsForThickness(5), [1000, 1250, 1500, 2000]);
    assert.deepEqual(stainlessSheetWidthsForThickness(8), [1250, 1500, 2000]);
    assert.deepEqual(stainlessSheetWidthsForThickness(30), [1250, 1500, 2000]);
    assert.deepEqual(stainlessSheetWidthsForThickness(7), []);

    const full = stainlessSheetIdentityRows(STAINLESS_SHEET_FULL_TYPE_NAMES[0]);
    assert.equal(full.length, 61);
    assert.equal(hasRow(full, 0.4, 1000), true);
    assert.equal(hasRow(full, 1.25, 1500), true);
    assert.equal(hasRow(full, 6, 2000), true);
    assert.equal(hasRow(full, 8, 1000), false);
    assert.equal(hasRow(full, 25, 2000), true);
    assert.equal(full.every((row) => row.grade === undefined && row.length === undefined), true);

    const industrial = stainlessSheetIdentityRows(STAINLESS_SHEET_FROM_1_5_TYPE_NAMES[0]);
    assert.equal(industrial.length, 44);
    assert.equal(hasRow(industrial, 0.9, 1250), false);
    assert.equal(hasRow(industrial, 1.25, 1000), false);
    assert.equal(hasRow(industrial, 1.5, 1000), true);
    assert.equal(STAINLESS_SHEET_TYPE_NAMES.length, 6);
    assert.equal(STAINLESS_SHEET_TYPE_NAMES.includes('ورق استیل ۲۰۱'), false);
  });

  it('leaves mill length as a TRANSACTION default, not identity', () => {
    const rows = stainlessSheetIdentityRows('ورق استیل ۳۰۴L');
    assert.equal(rows.every((row) => row.sheetLength === undefined), true);
    assert.equal(sheetMillLengthDefault({ width: 1000, thickness: 0.5 }), '2000');
    assert.equal(sheetMillLengthDefault({ width: 1250, thickness: 1 }), '2500');
    assert.equal(sheetMillLengthDefault({ width: 2000, thickness: 8 }), '6000');
  });
});
