/**
 * Industrial hollow-section identity matrix (operator catalog, not a second SoR).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  INDUSTRIAL_PROFILE_EXTRA_ROWS,
  INDUSTRIAL_PROFILE_MILL_ROWS,
  INDUSTRIAL_PROFILE_ROWS,
  industrialProfileIdentityRows,
  industrialProfileListDiff,
} from '../domain/productMaster/industrialProfileCatalog.js';

describe('industrialProfileCatalog', () => {
  it('unions mill-common and mill-specific lists without duplicates', () => {
    assert.equal(INDUSTRIAL_PROFILE_MILL_ROWS.length, 57);
    assert.equal(INDUSTRIAL_PROFILE_EXTRA_ROWS.length, 35);
    assert.equal(INDUSTRIAL_PROFILE_ROWS.length, 81);
    const diff = industrialProfileListDiff();
    assert.equal(diff.both.length, 11);
    assert.equal(diff.onlyMill.length, 46);
    assert.equal(diff.onlyExtra.length, 24);
    assert.equal(
      INDUSTRIAL_PROFILE_ROWS.some((row) => row.width === 200 && row.height === 200 && row.thickness === 12),
      true,
    );
    assert.equal(
      INDUSTRIAL_PROFILE_MILL_ROWS.some((row) => row.width === 200 && row.height === 200 && row.thickness === 12),
      false,
    );
    assert.equal(
      INDUSTRIAL_PROFILE_ROWS.some((row) => row.width === 60 && row.height === 60 && row.thickness === 5),
      true,
    );
    assert.equal(
      INDUSTRIAL_PROFILE_EXTRA_ROWS.some((row) => row.width === 60 && row.height === 60 && row.thickness === 5),
      false,
    );
    const rows = industrialProfileIdentityRows();
    assert.equal(rows.length, 81);
    assert.deepEqual(rows[0], { width: 40, height: 80, thickness: 5 });
    assert.deepEqual(rows.at(-1), { width: 400, height: 400, thickness: 15 });
  });
});
