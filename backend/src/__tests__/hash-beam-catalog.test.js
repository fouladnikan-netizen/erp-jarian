/**
 * H-beam identity matrix (operator catalog, not a second SoR).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  HASH_BEAM_KINDS,
  HASH_BEAM_SIZES,
  hashBeamIdentityRows,
} from '../domain/productMaster/hashBeamCatalog.js';

describe('hashBeamCatalog', () => {
  it('pairs HEA/HEB kinds with mill sizes 10–100', () => {
    assert.deepEqual([...HASH_BEAM_KINDS], ['سبک', 'سنگین']);
    assert.equal(HASH_BEAM_SIZES[0], 10);
    assert.equal(HASH_BEAM_SIZES.at(-1), 100);
    assert.equal(HASH_BEAM_SIZES.includes(27), true);
    assert.equal(HASH_BEAM_SIZES.includes(26), false);
    assert.equal(HASH_BEAM_SIZES.includes(99), false);
    const rows = hashBeamIdentityRows();
    assert.equal(rows.length, HASH_BEAM_KINDS.length * HASH_BEAM_SIZES.length);
    assert.deepEqual(rows[0], { kind: 'سبک', size: 10 });
    assert.deepEqual(rows[HASH_BEAM_SIZES.length - 1], { kind: 'سبک', size: 100 });
    assert.deepEqual(rows[HASH_BEAM_SIZES.length], { kind: 'سنگین', size: 10 });
    assert.deepEqual(rows.at(-1), { kind: 'سنگین', size: 100 });
  });
});
