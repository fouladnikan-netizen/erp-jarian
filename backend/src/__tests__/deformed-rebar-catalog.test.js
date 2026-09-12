/**
 * Deformed rebar identity matrix (operator catalog, not a second SoR).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFORMED_REBAR_SIZES,
  deformedRebarIdentityRows,
  gradesForDeformedRebarSize,
} from '../domain/productMaster/deformedRebarCatalog.js';

describe('deformedRebarCatalog', () => {
  it('pairs 8–12 with A2/A3 and 14–40 with A3/A4', () => {
    assert.deepEqual(gradesForDeformedRebarSize(8), ['A2', 'A3']);
    assert.deepEqual(gradesForDeformedRebarSize(12), ['A2', 'A3']);
    assert.deepEqual(gradesForDeformedRebarSize(14), ['A3', 'A4']);
    assert.deepEqual(gradesForDeformedRebarSize(40), ['A3', 'A4']);
    const rows = deformedRebarIdentityRows();
    assert.equal(rows.length, 26);
    assert.equal(DEFORMED_REBAR_SIZES.length, 13);
    assert.deepEqual(rows[0], { size: 8, grade: 'A2' });
    assert.deepEqual(rows[5], { size: 12, grade: 'A3' });
    assert.deepEqual(rows[6], { size: 14, grade: 'A3' });
    assert.deepEqual(rows[rows.length - 1], { size: 40, grade: 'A4' });
  });
});
