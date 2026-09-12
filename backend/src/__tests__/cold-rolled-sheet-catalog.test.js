/**
 * Cold-rolled sheet identity matrix (operator catalog, not a second SoR).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GALVANIZED_SHEET_THICKNESSES } from '../domain/productMaster/galvanizedSheetCatalog.js';
import {
  COLD_ROLLED_SHEET_THICKNESSES,
  COLD_ROLLED_SHEET_WIDTHS,
  coldRolledSheetIdentityRows,
} from '../domain/productMaster/coldRolledSheetCatalog.js';

describe('coldRolledSheetCatalog', () => {
  it('reuses galvanized sizes through 2.5 میل on widths 1000 and 1250 without grade', () => {
    assert.deepEqual(
      [...COLD_ROLLED_SHEET_THICKNESSES],
      [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.25, 1.5, 2, 2.5],
    );
    assert.deepEqual([...COLD_ROLLED_SHEET_WIDTHS], [1000, 1250]);
    assert.equal(
      COLD_ROLLED_SHEET_THICKNESSES.every((thickness) => GALVANIZED_SHEET_THICKNESSES.includes(thickness)),
      true,
    );
    assert.equal(COLD_ROLLED_SHEET_THICKNESSES.some((thickness) => thickness > 2.5), false);
    const rows = coldRolledSheetIdentityRows();
    assert.equal(rows.length, 24);
    assert.deepEqual(rows[0], { thickness: 0.3, width: 1000 });
    assert.deepEqual(rows.at(-1), { thickness: 2.5, width: 1250 });
    assert.equal(rows.every((row) => row.grade === undefined), true);
    const keys = rows.map((row) => `${row.width}@${row.thickness}`);
    assert.equal(new Set(keys).size, 24);
  });
});
