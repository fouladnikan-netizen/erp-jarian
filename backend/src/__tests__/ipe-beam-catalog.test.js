/**
 * IPE beam identity matrix (operator catalog, not a second SoR).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  IPE_BEAM_SIZES,
  ipeBeamIdentityRows,
} from '../domain/productMaster/ipeBeamCatalog.js';

describe('ipeBeamCatalog', () => {
  it('lists mill sizes 10–30 including 27', () => {
    assert.deepEqual([...IPE_BEAM_SIZES], [10, 12, 14, 16, 18, 20, 22, 24, 27, 30]);
    const rows = ipeBeamIdentityRows();
    assert.equal(rows.length, 10);
    assert.deepEqual(rows[0], { size: 10 });
    assert.deepEqual(rows.at(-1), { size: 30 });
    assert.equal(rows.some((row) => row.size === 27), true);
    assert.equal(rows.some((row) => row.kind), false);
  });
});
