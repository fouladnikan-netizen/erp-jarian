/**
 * ST52 sheet identity matrix (operator catalog, not a second SoR).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sheetMillLengthDefault } from '../domain/productMaster/sheetMillLength.js';
import {
  ST52_SHEET_CLONE_TYPE_NAMES,
  ST52_SHEET_HEAVY_WIDTH,
  ST52_SHEET_MID_WIDTH,
  ST52_SHEET_THIN_WIDTHS,
  ST52_SHEET_TYPE_NAME,
  st52SheetIdentityRows,
} from '../domain/productMaster/st52SheetCatalog.js';

function hasRow(rows, thickness, width) {
  return rows.some((row) => row.thickness === thickness && row.width === width);
}

describe('st52SheetCatalog', () => {
  it('unions mill thickness×width bands without duplicate identity', () => {
    const rows = st52SheetIdentityRows();
    assert.equal(rows.length, 32);
    const keys = rows.map((row) => `${row.width}@${row.thickness}`);
    assert.equal(new Set(keys).size, 32);
    assert.deepEqual([...ST52_SHEET_THIN_WIDTHS], [1250, 1500]);
    assert.equal(ST52_SHEET_MID_WIDTH, 1500);
    assert.equal(ST52_SHEET_HEAVY_WIDTH, 2000);

    assert.equal(hasRow(rows, 2, 1250), true);
    assert.equal(hasRow(rows, 2, 1500), true);
    assert.equal(hasRow(rows, 2, 2000), false);
    assert.equal(hasRow(rows, 1.5, 1250), false);
    assert.equal(hasRow(rows, 3, 1500), true);
    assert.equal(hasRow(rows, 3, 2000), false);
    assert.equal(hasRow(rows, 6, 1500), true);
    assert.equal(hasRow(rows, 6, 2000), false);
    assert.equal(hasRow(rows, 8, 1500), true);
    assert.equal(hasRow(rows, 8, 2000), true);
    assert.equal(hasRow(rows, 40, 1500), true);
    assert.equal(hasRow(rows, 40, 2000), true);
    assert.equal(hasRow(rows, 45, 1500), false);
    assert.equal(hasRow(rows, 45, 2000), true);
    assert.equal(hasRow(rows, 100, 2000), true);
    assert.equal(hasRow(rows, 100, 1500), false);
    assert.deepEqual(rows[0], { thickness: 2, width: 1250 });
    assert.deepEqual(rows.at(-1), { thickness: 100, width: 2000 });
  });

  it('does not put mill length on Product identity', () => {
    const rows = st52SheetIdentityRows();
    assert.equal(rows.every((row) => row.length === undefined && row.sheetLength === undefined), true);
    assert.equal(sheetMillLengthDefault({ width: 1250, thickness: 2 }), '2500');
    assert.equal(sheetMillLengthDefault({ width: 1500, thickness: 3 }), '6000');
    assert.equal(sheetMillLengthDefault({ width: 2000, thickness: 8 }), '6000');
    assert.equal(sheetMillLengthDefault({ width: 2000, thickness: 45 }), 'طول');
  });

  it('defines ورق A516 with the same identity matrix as ورق ST52', () => {
    assert.equal(ST52_SHEET_TYPE_NAME, 'ورق ST52');
    assert.deepEqual([...ST52_SHEET_CLONE_TYPE_NAMES], ['ورق A516']);
    assert.equal(st52SheetIdentityRows().length, 32);
  });
});
