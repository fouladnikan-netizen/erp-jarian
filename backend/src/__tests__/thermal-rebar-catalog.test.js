/**
 * Thermal rebar identity matrix (operator catalog, not a second SoR).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  THERMAL_REBAR_GRADES,
  THERMAL_REBAR_SIZES_MM,
  thermalRebarIdentityRows,
} from '../domain/productMaster/thermalRebarCatalog.js';

describe('thermalRebarCatalog', () => {
  it('pairs A1/A2/A3 with mill sizes 5.5, 6, 6.5, 8', () => {
    assert.deepEqual([...THERMAL_REBAR_GRADES], ['A1', 'A2', 'A3']);
    assert.deepEqual([...THERMAL_REBAR_SIZES_MM], [5.5, 6, 6.5, 8]);
    const rows = thermalRebarIdentityRows();
    assert.equal(rows.length, 12);
    assert.deepEqual(rows[0], { grade: 'A1', size: 5.5 });
    assert.deepEqual(rows[3], { grade: 'A1', size: 8 });
    assert.deepEqual(rows[4], { grade: 'A2', size: 5.5 });
    assert.deepEqual(rows[8], { grade: 'A3', size: 5.5 });
    assert.deepEqual(rows.at(-1), { grade: 'A3', size: 8 });
  });
});
