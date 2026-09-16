/**
 * Ck45 sheet identity matrix (operator catalog, not a second SoR).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sheetMillLengthDefault } from '../domain/productMaster/sheetMillLength.js';
import {
  CK45_SHEET_HEAVY_WIDTH,
  CK45_SHEET_MID_WIDTH,
  ck45SheetIdentityRows,
} from '../domain/productMaster/ck45SheetCatalog.js';

function hasRow(rows, thickness, width) {
  return rows.some((row) => row.thickness === thickness && row.width === width);
}

describe('ck45SheetCatalog', () => {
  it('unions mill thickness×width bands without duplicate identity', () => {
    const rows = ck45SheetIdentityRows();
    assert.equal(rows.length, 19);
    const keys = rows.map((row) => `${row.width}@${row.thickness}`);
    assert.equal(new Set(keys).size, 19);
    assert.equal(CK45_SHEET_MID_WIDTH, 1500);
    assert.equal(CK45_SHEET_HEAVY_WIDTH, 2000);

    assert.equal(hasRow(rows, 2, 1500), false);
    assert.equal(hasRow(rows, 3, 1500), true);
    assert.equal(hasRow(rows, 3, 2000), false);
    assert.equal(hasRow(rows, 6, 1500), true);
    assert.equal(hasRow(rows, 6, 2000), false);
    assert.equal(hasRow(rows, 8, 1500), true);
    assert.equal(hasRow(rows, 8, 2000), true);
    assert.equal(hasRow(rows, 15, 1500), true);
    assert.equal(hasRow(rows, 15, 2000), true);
    assert.equal(hasRow(rows, 20, 1500), false);
    assert.equal(hasRow(rows, 20, 2000), true);
    assert.equal(hasRow(rows, 50, 2000), true);
    assert.equal(hasRow(rows, 50, 1500), false);
    assert.equal(hasRow(rows, 55, 2000), false);
    assert.deepEqual(rows[0], { thickness: 3, width: 1500 });
    assert.deepEqual(rows.at(-1), { thickness: 50, width: 2000 });
  });

  it('does not put mill length on Product identity', () => {
    const rows = ck45SheetIdentityRows();
    assert.equal(rows.every((row) => row.length === undefined && row.sheetLength === undefined), true);
    assert.equal(sheetMillLengthDefault({ width: 1500, thickness: 3 }), '6000');
    assert.equal(sheetMillLengthDefault({ width: 2000, thickness: 8 }), '6000');
    assert.equal(sheetMillLengthDefault({ width: 2000, thickness: 45 }), 'طول');
  });
});
