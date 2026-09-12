/**
 * Hot-rolled sheet identity matrix (operator catalog, not a second SoR).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sheetMillLengthDefault } from '../domain/productMaster/sheetMillLength.js';
import {
  ASTM_HOT_ROLLED_SHEET_TYPE_NAMES,
  HOT_ROLLED_SHEET_AFTER_10_THICKNESSES,
  HOT_ROLLED_SHEET_TYPE_NAME,
  hotRolledSheetIdentityRows,
  hotRolledSheetThicknessesBetween,
} from '../domain/productMaster/hotRolledSheetCatalog.js';

function hasRow(rows, thickness, width) {
  return rows.some((row) => row.thickness === thickness && row.width === width);
}

describe('hotRolledSheetCatalog', () => {
  it('unions the mill thickness×width bands without duplicate identity', () => {
    const rows = hotRolledSheetIdentityRows();
    assert.equal(rows.length, 62);
    const keys = rows.map((row) => `${row.width}@${row.thickness}`);
    assert.equal(new Set(keys).size, 62);
    assert.deepEqual(
      [...HOT_ROLLED_SHEET_AFTER_10_THICKNESSES],
      [12, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80, 90, 100],
    );
    assert.deepEqual(hotRolledSheetThicknessesBetween(6, 15), [6, 8, 10, 12, 15]);
    assert.deepEqual(hotRolledSheetThicknessesBetween(8, 40), [8, 10, 12, 15, 20, 25, 30, 35, 40]);
    assert.equal(hotRolledSheetThicknessesBetween(8, 100).length, 17);

    assert.equal(hasRow(rows, 1.5, 1000), true);
    assert.equal(hasRow(rows, 1.8, 1250), true);
    assert.equal(hasRow(rows, 2.5, 1500), false);
    assert.equal(hasRow(rows, 3, 1500), true);
    assert.equal(hasRow(rows, 6, 1200), true);
    assert.equal(hasRow(rows, 6, 2000), false);
    assert.equal(hasRow(rows, 5, 1200), false);
    assert.equal(hasRow(rows, 12, 1000), false);
    assert.equal(hasRow(rows, 12, 1200), true);
    assert.equal(hasRow(rows, 20, 1200), false);
    assert.equal(hasRow(rows, 40, 1250), true);
    assert.equal(hasRow(rows, 40, 1500), true);
    assert.equal(hasRow(rows, 45, 1250), false);
    assert.equal(hasRow(rows, 45, 2000), true);
    assert.equal(hasRow(rows, 100, 2000), true);
    assert.equal(hasRow(rows, 100, 1500), false);
    assert.deepEqual(rows[0], { thickness: 1.5, width: 1000 });
    assert.deepEqual(rows.at(-1), { thickness: 100, width: 2000 });
  });

  it('does not put mill length on Product identity', () => {
    const rows = hotRolledSheetIdentityRows();
    assert.equal(rows.every((row) => row.length === undefined && row.sheetLength === undefined), true);
    assert.equal(sheetMillLengthDefault({ width: 1000, thickness: 1.5 }), '2000');
    assert.equal(sheetMillLengthDefault({ width: 1250, thickness: 2.5 }), '2500');
    assert.equal(sheetMillLengthDefault({ width: 1250, thickness: 12 }), '6000');
    assert.equal(sheetMillLengthDefault({ width: 1200, thickness: 6 }), '6000');
    assert.equal(sheetMillLengthDefault({ width: 2000, thickness: 8 }), '6000');
    assert.equal(sheetMillLengthDefault({ width: 2000, thickness: 45 }), 'طول');
  });

  it('defines ورق A283 and ورق A36 with the same identity matrix as ورق ساده فولادی', () => {
    assert.deepEqual([...ASTM_HOT_ROLLED_SHEET_TYPE_NAMES], ['ورق A283', 'ورق A36']);
    assert.equal(HOT_ROLLED_SHEET_TYPE_NAME, 'ورق ساده فولادی');
    const rows = hotRolledSheetIdentityRows();
    assert.equal(rows.length, 62);
    assert.equal(rows.every((row) => row.length === undefined && row.sheetLength === undefined), true);
  });
});
