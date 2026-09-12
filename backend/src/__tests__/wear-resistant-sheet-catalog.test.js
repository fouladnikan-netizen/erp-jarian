/**
 * Wear-resistant sheet identity matrix (operator catalog, not a second SoR).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sheetMillLengthDefault } from '../domain/productMaster/sheetMillLength.js';
import {
  WEAR_RESISTANT_SHEET_KINDS,
  WEAR_RESISTANT_SHEET_WIDTHS,
  wearResistantSheetIdentityRows,
} from '../domain/productMaster/wearResistantSheetCatalog.js';

function hasRow(rows, thickness, width, kind) {
  return rows.some((row) => (
    row.thickness === thickness && row.width === width && row.kind === kind
  ));
}

describe('wearResistantSheetCatalog', () => {
  it('pairs mill 6–30 میل with widths 1500/2000 and three hardness kinds', () => {
    assert.deepEqual([...WEAR_RESISTANT_SHEET_KINDS], ['سختی ۴۰۰', 'سختی ۴۵۰', 'سختی ۵۰۰']);
    assert.deepEqual([...WEAR_RESISTANT_SHEET_WIDTHS], [1500, 2000]);
    const rows = wearResistantSheetIdentityRows();
    assert.equal(rows.length, 48);
    const keys = rows.map((row) => `${row.width}@${row.thickness}@${row.kind}`);
    assert.equal(new Set(keys).size, 48);

    assert.equal(hasRow(rows, 5, 1500, 'سختی ۴۰۰'), false);
    assert.equal(hasRow(rows, 6, 1500, 'سختی ۴۰۰'), true);
    assert.equal(hasRow(rows, 6, 2000, 'سختی ۵۰۰'), true);
    assert.equal(hasRow(rows, 6, 1250, 'سختی ۴۰۰'), false);
    assert.equal(hasRow(rows, 8, 1500, 'سختی ۴۵۰'), true);
    assert.equal(hasRow(rows, 30, 2000, 'سختی ۵۰۰'), true);
    assert.equal(hasRow(rows, 35, 2000, 'سختی ۴۰۰'), false);
    assert.equal(rows.filter((row) => row.thickness === 12).length, 6);
    assert.deepEqual(rows[0], { thickness: 6, width: 1500, kind: 'سختی ۴۰۰' });
    assert.deepEqual(rows.at(-1), { thickness: 30, width: 2000, kind: 'سختی ۵۰۰' });
    assert.equal(rows.every((row) => row.length === undefined && row.sheetLength === undefined), true);
  });

  it('does not put mill length on Product identity', () => {
    assert.equal(sheetMillLengthDefault({ width: 1500, thickness: 6 }), '6000');
    assert.equal(sheetMillLengthDefault({ width: 2000, thickness: 30 }), '6000');
  });
});
