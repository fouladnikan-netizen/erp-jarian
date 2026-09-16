/**
 * Steel flat bar identity matrix (operator catalog, not a second SoR).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  STEEL_FLAT_HEAVY_THICKNESSES,
  STEEL_FLAT_HEAVY_WIDTHS,
  STEEL_FLAT_LOW_THICKNESSES,
  STEEL_FLAT_LOW_WIDTHS,
  STEEL_FLAT_MID_THICKNESSES,
  STEEL_FLAT_MID_WIDTHS,
  steelFlatIdentityRows,
} from '../domain/productMaster/steelFlatCatalog.js';

function hasRow(rows, thickness, stripWidth) {
  return rows.some((row) => row.thickness === thickness && row.stripWidth === stripWidth);
}

describe('steelFlatCatalog', () => {
  it('unions the mill thickness×width bands without duplicate identity', () => {
    assert.deepEqual([...STEEL_FLAT_LOW_THICKNESSES], [3, 4, 5]);
    assert.deepEqual([...STEEL_FLAT_LOW_WIDTHS], [10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100]);
    assert.deepEqual([...STEEL_FLAT_MID_THICKNESSES], [6, 8, 10]);
    assert.deepEqual([...STEEL_FLAT_MID_WIDTHS], [20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 120, 150]);
    assert.deepEqual([...STEEL_FLAT_HEAVY_THICKNESSES], [12, 15, 20]);
    assert.deepEqual([...STEEL_FLAT_HEAVY_WIDTHS], [30, 40, 50, 60, 80, 100, 120, 150, 200, 250, 300]);

    const rows = steelFlatIdentityRows();
    assert.equal(rows.length, 105);
    const keys = rows.map((row) => `${row.stripWidth}@${row.thickness}`);
    assert.equal(new Set(keys).size, 105);
    assert.equal(rows.every((row) => row.kind === undefined && row.length === undefined), true);

    assert.equal(hasRow(rows, 3, 20), true);
    assert.equal(hasRow(rows, 5, 40), true);
    assert.equal(hasRow(rows, 3, 10), true);
    assert.equal(hasRow(rows, 3, 120), false);
    assert.equal(hasRow(rows, 6, 20), true);
    assert.equal(hasRow(rows, 6, 10), false);
    assert.equal(hasRow(rows, 6, 15), false);
    assert.equal(hasRow(rows, 10, 150), true);
    assert.equal(hasRow(rows, 12, 30), true);
    assert.equal(hasRow(rows, 12, 20), false);
    assert.equal(hasRow(rows, 15, 60), true);
    assert.equal(hasRow(rows, 20, 100), true);
    assert.equal(hasRow(rows, 20, 300), true);
    assert.equal(hasRow(rows, 20, 70), false);
    assert.deepEqual(rows[0], { thickness: 3, stripWidth: 10 });
    assert.deepEqual(rows.at(-1), { thickness: 20, stripWidth: 300 });
  });
});
