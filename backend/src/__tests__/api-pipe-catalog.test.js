/**
 * API pipe identity matrix (operator catalog, not a second SoR).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatNpsInchDisplay } from '../domain/productMaster/npsInchDisplay.js';
import {
  API_PIPE_ROWS,
  apiPipeIdentityRows,
} from '../domain/productMaster/apiPipeCatalog.js';

function hasRow(rows, size, thickness) {
  return rows.some((row) => row.size === size && row.thickness === thickness);
}

describe('apiPipeCatalog', () => {
  it('keeps closed inch×thickness mill pairs with 6 m branch weights', () => {
    const rows = apiPipeIdentityRows();
    assert.equal(rows, API_PIPE_ROWS);
    assert.equal(rows.length, 24);
    const keys = rows.map((row) => `${row.size}@${row.thickness}`);
    assert.equal(new Set(keys).size, 24);

    assert.equal(hasRow(rows, 0.5, 2.8), true);
    assert.equal(hasRow(rows, 0.5, 2.5), false);
    assert.equal(hasRow(rows, 8, 8.2), true);
    assert.equal(hasRow(rows, 8, 6), true);
    assert.deepEqual(rows[0], { size: 0.5, thickness: 2.8, unitWeight: 7.66 });
    assert.deepEqual(rows.at(-1), { size: 8, thickness: 8.2, unitWeight: 255.89 });
    assert.equal(rows.every((row) => row.length === undefined && row.unitWeight > 0), true);
    assert.equal(formatNpsInchDisplay(rows[0].size), '۱/۲ اینچ');
    assert.equal(formatNpsInchDisplay(8), '۸ اینچ');
  });
});
