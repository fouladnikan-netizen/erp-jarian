/**
 * Tee-section identity matrix (operator catalog, not a second SoR).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  TEE_SIZES,
  teeIdentityRows,
} from '../domain/productMaster/teeCatalog.js';

describe('teeCatalog', () => {
  it('lists mill sizes 3–6', () => {
    assert.deepEqual([...TEE_SIZES], [3, 4, 5, 6]);
    const rows = teeIdentityRows();
    assert.equal(rows.length, 4);
    assert.deepEqual(rows[0], { size: 3 });
    assert.deepEqual(rows.at(-1), { size: 6 });
    assert.equal(rows.some((row) => row.kind), false);
  });
});
