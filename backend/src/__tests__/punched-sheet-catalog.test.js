/**
 * Perforated sheet identity matrix (operator catalog, not a second SoR).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sheetMillLengthDefault } from '../domain/productMaster/sheetMillLength.js';
import {
  PUNCHED_SHEET_MESH_SIZE,
  PUNCHED_SHEET_THICKNESS,
  PUNCHED_SHEET_WIDTH,
  punchedSheetIdentityRows,
} from '../domain/productMaster/punchedSheetCatalog.js';

describe('punchedSheetCatalog', () => {
  it('has a single mill identity: 2 mil, mesh 6, width 1000', () => {
    assert.equal(PUNCHED_SHEET_THICKNESS, 2);
    assert.equal(PUNCHED_SHEET_MESH_SIZE, 6);
    assert.equal(PUNCHED_SHEET_WIDTH, 1000);
    const rows = punchedSheetIdentityRows();
    assert.equal(rows.length, 1);
    assert.deepEqual(rows[0], { thickness: 2, meshSize: 6, width: 1000 });
    assert.equal(rows[0].length, undefined);
    assert.equal(rows[0].sheetLength, undefined);
  });

  it('does not put mill length on Product identity', () => {
    assert.equal(sheetMillLengthDefault({ width: 1000, thickness: 2 }), '2000');
  });
});
