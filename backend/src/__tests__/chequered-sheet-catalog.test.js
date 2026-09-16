/**
 * Chequered sheet identity matrix (operator catalog, not a second SoR).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sheetMillLengthDefault } from '../domain/productMaster/sheetMillLength.js';
import {
  CHEQUERED_SHEET_THICKNESSES,
  CHEQUERED_SHEET_WIDTHS,
  chequeredSheetIdentityRows,
} from '../domain/productMaster/chequeredSheetCatalog.js';

describe('chequeredSheetCatalog', () => {
  it('pairs 2–2.5 میل with 1000/1250 and 3–10 میل with 1000/1250/1500', () => {
    assert.deepEqual([...CHEQUERED_SHEET_THICKNESSES], [2, 2.5, 3, 4, 5, 6, 8, 10]);
    assert.deepEqual([...CHEQUERED_SHEET_WIDTHS], [1000, 1250, 1500]);
    const rows = chequeredSheetIdentityRows();
    assert.equal(rows.length, 22);
    assert.deepEqual(rows[0], { thickness: 2, width: 1000 });
    assert.deepEqual(rows[1], { thickness: 2, width: 1250 });
    assert.equal(rows.some((row) => row.thickness === 2 && row.width === 1500), false);
    assert.equal(rows.some((row) => row.thickness === 2.5 && row.width === 1500), false);
    assert.equal(rows.some((row) => row.thickness === 3 && row.width === 1500), true);
    assert.deepEqual(rows.at(-1), { thickness: 10, width: 1500 });
    assert.equal(rows.filter((row) => row.width === 1250).length, 8);
    assert.equal(rows.filter((row) => row.thickness === 2.5).length, 2);
    assert.equal(rows.filter((row) => row.width === 1500).length, 6);
    assert.equal(rows.every((row) => row.kind === undefined && row.length === undefined), true);
    const keys = rows.map((row) => `${row.width}@${row.thickness}`);
    assert.equal(new Set(keys).size, 22);
  });

  it('does not put mill length on Product identity', () => {
    assert.equal(sheetMillLengthDefault({ width: 1000, thickness: 2 }), '2000');
    assert.equal(sheetMillLengthDefault({ width: 1250, thickness: 10 }), '6000');
    assert.equal(sheetMillLengthDefault({ width: 1500, thickness: 6 }), '6000');
  });
});
