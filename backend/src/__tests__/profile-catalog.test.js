/**
 * Hollow-section profile identity matrix (operator catalog, not a second SoR).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PROFILE_ROWS,
  profileIdentityRows,
} from '../domain/productMaster/profileCatalog.js';

describe('profileCatalog', () => {
  it('lists mill width×height×thickness rows', () => {
    assert.equal(PROFILE_ROWS.length, 114);
    assert.deepEqual(PROFILE_ROWS[0], { width: 20, height: 20, thickness: 1.8 });
    assert.deepEqual(PROFILE_ROWS.at(-1), { width: 140, height: 140, thickness: 4 });
    assert.equal(PROFILE_ROWS.filter((row) => row.thickness === 1.8).length, 16);
    assert.equal(PROFILE_ROWS.filter((row) => row.thickness === 2).length, 27);
    assert.equal(PROFILE_ROWS.filter((row) => row.thickness === 2.5).length, 29);
    assert.equal(PROFILE_ROWS.filter((row) => row.thickness === 3).length, 21);
    assert.equal(PROFILE_ROWS.filter((row) => row.thickness === 4).length, 21);
    assert.equal(PROFILE_ROWS.some((row) => row.width === 35 && row.height === 35 && row.thickness === 2), true);
    assert.equal(PROFILE_ROWS.some((row) => row.width === 20 && row.height === 40 && row.thickness === 4), false);
    const rows = profileIdentityRows();
    assert.equal(rows.length, 114);
    assert.deepEqual(rows[16], { width: 20, height: 20, thickness: 2 });
  });
});
