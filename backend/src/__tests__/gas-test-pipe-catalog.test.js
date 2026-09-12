/**
 * Gas-test pipe identity matrix (operator catalog, not a second SoR).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  GAS_TEST_PIPE_ROWS,
  gasTestPipeIdentityRows,
} from '../domain/productMaster/gasTestPipeCatalog.js';

function hasRow(rows, size, thickness) {
  return rows.some((row) => row.size === size && row.thickness === thickness);
}

describe('gasTestPipeCatalog', () => {
  it('keeps the closed inch×thickness mill pairs, not a cartesian grid', () => {
    const rows = gasTestPipeIdentityRows();
    assert.equal(rows, GAS_TEST_PIPE_ROWS);
    assert.equal(rows.length, 16);
    const keys = rows.map((row) => `${row.size}@${row.thickness}`);
    assert.equal(new Set(keys).size, 16);

    assert.equal(hasRow(rows, 0.5, 2.5), true);
    assert.equal(hasRow(rows, 0.5, 2.8), true);
    assert.equal(hasRow(rows, 0.5, 2.9), false);
    assert.equal(hasRow(rows, 0.75, 2.5), true);
    assert.equal(hasRow(rows, 0.75, 2.9), true);
    assert.equal(hasRow(rows, 1, 3), true);
    assert.equal(hasRow(rows, 1, 3.2), true);
    assert.equal(hasRow(rows, 1.25, 3.2), true);
    assert.equal(hasRow(rows, 1.25, 3.6), true);
    assert.equal(hasRow(rows, 1.5, 3.7), true);
    assert.equal(hasRow(rows, 2, 3.5), true);
    assert.equal(hasRow(rows, 2.5, 4.2), true);
    assert.equal(hasRow(rows, 3, 4), true);
    assert.equal(hasRow(rows, 3, 4.5), true);
    assert.equal(hasRow(rows, 3, 3.2), false);
    assert.deepEqual(rows[0], { size: 0.5, thickness: 2.5 });
    assert.deepEqual(rows.at(-1), { size: 3, thickness: 4.5 });
    assert.equal(rows.every((row) => row.length === undefined), true);
  });
});
