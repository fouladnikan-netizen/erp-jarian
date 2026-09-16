/**
 * Pickled sheet identity matrix (operator catalog, not a second SoR).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sheetMillLengthDefault } from '../domain/productMaster/sheetMillLength.js';
import {
  PICKLED_SHEET_THICKNESSES,
  PICKLED_SHEET_WIDTHS,
  pickledSheetIdentityRows,
} from '../domain/productMaster/pickledSheetCatalog.js';

describe('pickledSheetCatalog', () => {
  it('pairs mill thicknesses 2–5 میل with widths 1000 and 1250', () => {
    assert.deepEqual([...PICKLED_SHEET_THICKNESSES], [2, 2.5, 3, 3.5, 4, 4.5, 5]);
    assert.deepEqual([...PICKLED_SHEET_WIDTHS], [1000, 1250]);
    const rows = pickledSheetIdentityRows();
    assert.equal(rows.length, 14);
    assert.deepEqual(rows[0], { thickness: 2, width: 1000 });
    assert.deepEqual(rows[1], { thickness: 2, width: 1250 });
    assert.deepEqual(rows.at(-1), { thickness: 5, width: 1250 });
    assert.equal(rows.filter((row) => row.width === 1000).length, 7);
    assert.equal(rows.filter((row) => row.thickness === 3.5).length, 2);
    assert.equal(rows.every((row) => row.length === undefined && row.sheetLength === undefined), true);
    const keys = rows.map((row) => `${row.width}@${row.thickness}`);
    assert.equal(new Set(keys).size, 14);
  });

  it('does not put mill length on Product identity', () => {
    assert.equal(sheetMillLengthDefault({ width: 1000, thickness: 2 }), '2000');
    assert.equal(sheetMillLengthDefault({ width: 1250, thickness: 5 }), '2500');
  });
});
