/**
 * Pre-painted galvanized sheet identity matrix (operator catalog, not a second SoR).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GALVANIZED_SHEET_WIDTHS } from '../domain/productMaster/galvanizedSheetCatalog.js';
import {
  PRE_PAINTED_GALVANIZED_SHEET_THICKNESSES,
  PRE_PAINTED_GALVANIZED_SHEET_WIDTHS,
  prePaintedGalvanizedSheetIdentityRows,
} from '../domain/productMaster/prePaintedGalvanizedSheetCatalog.js';

describe('prePaintedGalvanizedSheetCatalog', () => {
  it('pairs mill thicknesses 0.48–0.8 میل with widths 1000 and 1250', () => {
    assert.deepEqual([...PRE_PAINTED_GALVANIZED_SHEET_THICKNESSES], [0.48, 0.5, 0.6, 0.7, 0.8]);
    assert.deepEqual([...PRE_PAINTED_GALVANIZED_SHEET_WIDTHS], [...GALVANIZED_SHEET_WIDTHS]);
    const rows = prePaintedGalvanizedSheetIdentityRows();
    assert.equal(rows.length, 10);
    assert.deepEqual(rows[0], { thickness: 0.48, width: 1000 });
    assert.deepEqual(rows[1], { thickness: 0.48, width: 1250 });
    assert.deepEqual(rows.at(-1), { thickness: 0.8, width: 1250 });
    assert.equal(rows.filter((row) => row.width === 1000).length, 5);
    assert.equal(rows.every((row) => row.ral === undefined), true);
    const keys = rows.map((row) => `${row.width}@${row.thickness}`);
    assert.equal(new Set(keys).size, 10);
  });
});
