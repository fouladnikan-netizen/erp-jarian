/**
 * Coil rebar identity matrix (operator catalog, not a second SoR).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  COIL_REBAR_GRADES,
  COIL_REBAR_SIZES_MM,
  coilRebarIdentityRows,
} from '../domain/productMaster/coilRebarCatalog.js';

describe('coilRebarCatalog', () => {
  it('pairs 8 coil grades with mill sizes 5.5–16', () => {
    assert.deepEqual([...COIL_REBAR_GRADES], [
      'RST34-2', 'RST37-2', 'SAE1006', 'SAE1008', '3SP', 'A1', 'A2', 'A3',
    ]);
    assert.deepEqual([...COIL_REBAR_SIZES_MM], [5.5, 6.5, 8, 10, 12, 14, 16]);
    const rows = coilRebarIdentityRows();
    assert.equal(rows.length, 56);
    assert.deepEqual(rows[0], { grade: 'RST34-2', size: 5.5 });
    assert.deepEqual(rows[6], { grade: 'RST34-2', size: 16 });
    assert.deepEqual(rows[7], { grade: 'RST37-2', size: 5.5 });
    assert.deepEqual(rows.at(-1), { grade: 'A3', size: 16 });
  });
});
