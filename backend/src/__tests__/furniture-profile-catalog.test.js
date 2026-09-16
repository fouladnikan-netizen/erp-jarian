/**
 * Furniture-profile identity matrix (operator catalog, not a second SoR).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  FURNITURE_PROFILE_SIZES,
  FURNITURE_PROFILE_THICKNESSES,
  furnitureProfileIdentityRows,
} from '../domain/productMaster/furnitureProfileCatalog.js';

describe('furnitureProfileCatalog', () => {
  it('pairs mill sizes with light-gauge thicknesses', () => {
    assert.equal(FURNITURE_PROFILE_SIZES.length, 17);
    assert.deepEqual([...FURNITURE_PROFILE_THICKNESSES], [0.5, 0.6, 1, 1.25, 1.4, 1.5]);
    assert.deepEqual([...FURNITURE_PROFILE_SIZES[0]], [10, 10]);
    assert.deepEqual([...FURNITURE_PROFILE_SIZES.at(-1)], [80, 40]);
    assert.equal(FURNITURE_PROFILE_SIZES.some(([w, h]) => w === 20 && h === 10), true);
    assert.equal(FURNITURE_PROFILE_SIZES.some(([w, h]) => w === 10 && h === 20), false);
    const rows = furnitureProfileIdentityRows();
    assert.equal(rows.length, 17 * 6);
    assert.deepEqual(rows[0], { width: 10, height: 10, thickness: 0.5 });
    assert.deepEqual(rows[16], { width: 80, height: 40, thickness: 0.5 });
    assert.deepEqual(rows.at(-1), { width: 80, height: 40, thickness: 1.5 });
  });
});
