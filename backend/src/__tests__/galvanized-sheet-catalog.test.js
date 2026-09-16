/**
 * Galvanized sheet identity matrix (operator catalog, not a second SoR).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  GALVANIZED_SHEET_THICKNESSES,
  GALVANIZED_SHEET_WIDTHS,
  galvanizedSheetIdentityRows,
} from '../domain/productMaster/galvanizedSheetCatalog.js';

describe('galvanizedSheetCatalog', () => {
  it('pairs mill thicknesses 0.3–4 میل with widths 1000 and 1250', () => {
    assert.deepEqual(
      [...GALVANIZED_SHEET_THICKNESSES],
      [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.25, 1.5, 2, 2.5, 3, 4],
    );
    assert.deepEqual([...GALVANIZED_SHEET_WIDTHS], [1000, 1250]);
    const rows = galvanizedSheetIdentityRows();
    assert.equal(rows.length, 28);
    assert.deepEqual(rows[0], { thickness: 0.3, width: 1000 });
    assert.deepEqual(rows[1], { thickness: 0.3, width: 1250 });
    assert.deepEqual(rows.at(-1), { thickness: 4, width: 1250 });
    assert.equal(rows.filter((row) => row.width === 1000).length, 14);
    assert.equal(rows.filter((row) => row.thickness === 1.25).length, 2);
    const keys = rows.map((row) => `${row.width}@${row.thickness}`);
    assert.equal(new Set(keys).size, 28);
  });
});
