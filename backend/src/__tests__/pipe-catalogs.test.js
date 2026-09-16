/**
 * Operator pipe identity catalogs (not a second SoR).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatNpsInchDisplay } from '../domain/productMaster/npsInchDisplay.js';
import { WATER_TEST_PIPE_ROWS, waterTestPipeIdentityRows } from '../domain/productMaster/waterTestPipeCatalog.js';
import { GALVANIZED_PIPE_ROWS, galvanizedPipeIdentityRows } from '../domain/productMaster/galvanizedPipeCatalog.js';
import { WELL_CASING_PIPE_ROWS, wellCasingPipeIdentityRows } from '../domain/productMaster/wellCasingPipeCatalog.js';
import { SPIRAL_PIPE_ROWS, spiralPipeIdentityRows } from '../domain/productMaster/spiralPipeCatalog.js';
import { SCAFFOLD_PIPE_ROWS, scaffoldPipeIdentityRows } from '../domain/productMaster/scaffoldPipeCatalog.js';
import { WELDED_PIPE_ROWS, weldedPipeIdentityRows } from '../domain/productMaster/weldedPipeCatalog.js';
import {
  SEAMLESS_PIPE_ROWS,
  seamlessPipeIdentityRows,
  SEAMLESS_PIPE_GRADE_BINDING,
  SEAMLESS_PIPE_GRADE_OPTIONS,
  SEAMLESS_PIPE_GRADE_VALUES,
  SEAMLESS_PIPE_SCH_VALUES,
} from '../domain/productMaster/seamlessPipeCatalog.js';

function uniqueKeys(rows, keyFn) {
  const keys = rows.map(keyFn);
  return new Set(keys).size === keys.length;
}

describe('pipe catalogs', () => {
  it('keeps water-test closed size×thickness pairs with 6 m weights', () => {
    const rows = waterTestPipeIdentityRows();
    assert.equal(rows, WATER_TEST_PIPE_ROWS);
    assert.equal(rows.length, 22);
    assert.equal(uniqueKeys(rows, (row) => `${row.size}@${row.thickness}`), true);
    assert.deepEqual(rows[0], {
      size: 0.5, thickness: 2, unitWeight: 5.71, weightClass: 'سبک',
    });
    assert.equal(rows.at(-1).unitWeight, 118.44);
    assert.equal(rows.every((row) => row.length === undefined), true);
    assert.equal(formatNpsInchDisplay(0.5), '۱/۲ اینچ');
  });

  it('keeps galvanized closed size×thickness pairs', () => {
    const rows = galvanizedPipeIdentityRows();
    assert.equal(rows, GALVANIZED_PIPE_ROWS);
    assert.equal(rows.length, 12);
    assert.equal(uniqueKeys(rows, (row) => `${row.size}@${row.thickness}`), true);
    assert.equal(rows.at(-1).size, 2);
    assert.equal(rows.at(-1).thickness, 3.6);
    assert.equal(rows.at(-1).unitWeight, 30.2);
  });

  it('keeps well-casing and spiral inch×thickness mill pairs', () => {
    assert.equal(wellCasingPipeIdentityRows(), WELL_CASING_PIPE_ROWS);
    assert.equal(WELL_CASING_PIPE_ROWS.length, 13);
    assert.equal(uniqueKeys(WELL_CASING_PIPE_ROWS, (row) => `${row.size}@${row.thickness}`), true);
    assert.equal(formatNpsInchDisplay(16), '۱۶ اینچ');
    assert.equal(spiralPipeIdentityRows(), SPIRAL_PIPE_ROWS);
    assert.equal(SPIRAL_PIPE_ROWS.length, 11);
    assert.equal(SPIRAL_PIPE_ROWS.at(-1).size, 32);
    assert.equal(formatNpsInchDisplay(32), '۳۲ اینچ');
  });

  it('keeps scaffold thickness-only mill SKUs', () => {
    const rows = scaffoldPipeIdentityRows();
    assert.equal(rows, SCAFFOLD_PIPE_ROWS);
    assert.equal(rows.length, 4);
    assert.equal(uniqueKeys(rows, (row) => String(row.thickness)), true);
    assert.equal(rows.every((row) => row.size === undefined), true);
    assert.equal(rows[0].nicknameKg, 14);
  });

  it('keeps welded-pipe closed size×thickness pairs', () => {
    const rows = weldedPipeIdentityRows();
    assert.equal(rows, WELDED_PIPE_ROWS);
    assert.equal(rows.length, 24);
    assert.equal(uniqueKeys(rows, (row) => `${row.size}@${row.thickness}`), true);
    assert.deepEqual(rows[0], { size: 0.5, thickness: 2, unitWeight: 5.71 });
    assert.equal(rows.at(-1).unitWeight, 249.7);
  });

  it('keeps seamless size×schedule pairs without persisting length', () => {
    const rows = seamlessPipeIdentityRows();
    assert.equal(rows, SEAMLESS_PIPE_ROWS);
    assert.equal(rows.length, 57);
    assert.equal(uniqueKeys(rows, (row) => `${row.size}@${row.sch}`), true);
    assert.deepEqual(rows[0], { size: 0.5, sch: 20, thickness: 2.5, unitWeight: 6.95 });
    assert.equal(rows.at(-1).sch, 80);
    assert.equal(rows.at(-1).size, 24);
    assert.equal(rows.at(-1).unitWeight, 2672);
    assert.equal(rows.every((row) => row.length === undefined && row.unitWeight > 0), true);
    assert.equal(formatNpsInchDisplay(24), '۲۴ اینچ');
  });

  it('reuses shared grade ENUM with a seamless Type subset, not a new attribute', () => {
    assert.equal(SEAMLESS_PIPE_GRADE_VALUES.length, 13);
    assert.equal(new Set(SEAMLESS_PIPE_GRADE_VALUES).size, 13);
    assert.equal(SEAMLESS_PIPE_GRADE_OPTIONS[0].value, 'ST37.2');
    assert.equal(SEAMLESS_PIPE_GRADE_OPTIONS.at(-1).value, 'ASTM A335 P22');
    assert.equal(SEAMLESS_PIPE_GRADE_BINDING.isRequired, false);
    assert.equal(SEAMLESS_PIPE_GRADE_BINDING.valueScope, 'TRANSACTION');
    assert.deepEqual(SEAMLESS_PIPE_GRADE_BINDING.overrideAllowedValues, SEAMLESS_PIPE_GRADE_VALUES);
  });

  it('keeps seamless schedule as a closed ENUM, not a number', () => {
    assert.equal(SEAMLESS_PIPE_SCH_VALUES.length, 17);
    assert.equal(new Set(SEAMLESS_PIPE_SCH_VALUES).size, 17);
    assert.deepEqual(SEAMLESS_PIPE_SCH_VALUES.slice(0, 10), [
      '10', '20', '30', '40', '60', '80', '100', '120', '140', '160',
    ]);
    assert.deepEqual(SEAMLESS_PIPE_SCH_VALUES.slice(10), [
      'STD', 'XS', 'XXS', '5S', '10S', '40S', '80S',
    ]);
  });
});
