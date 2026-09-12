/**
 * Galvanized hollow-section identity matrix (operator catalog, not a second SoR).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  GALVANIZED_PROFILE_ROWS,
  galvanizedProfileIdentityRows,
} from '../domain/productMaster/galvanizedProfileCatalog.js';

describe('galvanizedProfileCatalog', () => {
  it('lists mill width×height×thickness rows', () => {
    assert.equal(GALVANIZED_PROFILE_ROWS.length, 25);
    assert.deepEqual(GALVANIZED_PROFILE_ROWS[0], { width: 20, height: 20, thickness: 2 });
    assert.deepEqual(GALVANIZED_PROFILE_ROWS.at(-1), { width: 100, height: 100, thickness: 2.5 });
    assert.equal(GALVANIZED_PROFILE_ROWS.filter((row) => row.thickness === 2).length, 13);
    assert.equal(GALVANIZED_PROFILE_ROWS.filter((row) => row.thickness === 2.5).length, 12);
    assert.equal(
      GALVANIZED_PROFILE_ROWS.some((row) => row.width === 20 && row.height === 20 && row.thickness === 2.5),
      false,
    );
    assert.equal(
      GALVANIZED_PROFILE_ROWS.some((row) => row.width === 20 && row.height === 40 && row.thickness === 2),
      true,
    );
    const keys = GALVANIZED_PROFILE_ROWS.map((row) => `${row.width}x${row.height}@${row.thickness}`);
    assert.equal(new Set(keys).size, 25);
    const rows = galvanizedProfileIdentityRows();
    assert.equal(rows.length, 25);
    assert.deepEqual(rows[0], { width: 20, height: 20, thickness: 2 });
  });
});
