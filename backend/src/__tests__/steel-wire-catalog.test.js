/**
 * Steel-wire identity matrix (operator catalog, not a second SoR).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  STEEL_WIRE_SIZES_MM,
  STEEL_WIRE_TYPE_NAME,
  steelWireIdentityRows,
} from '../domain/productMaster/steelWireCatalog.js';

describe('steelWireCatalog', () => {
  it('lists mill sizes 1.5 and 2.5 under سیم فولادی', () => {
    assert.equal(STEEL_WIRE_TYPE_NAME, 'سیم فولادی');
    assert.deepEqual([...STEEL_WIRE_SIZES_MM], [1.5, 2.5]);
    const rows = steelWireIdentityRows();
    assert.equal(rows.length, 2);
    assert.deepEqual(rows[0], { size: 1.5 });
    assert.deepEqual(rows.at(-1), { size: 2.5 });
    assert.equal(rows.some((row) => row.kind), false);
  });
});
