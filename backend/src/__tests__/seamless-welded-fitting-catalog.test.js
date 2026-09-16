/**
 * Seamless welded fittings identity catalog (Type + fitting_material).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  FITTING_MATERIAL_VALUES,
  WELDED_FITTING_FAMILY,
} from '../domain/productMaster/weldedFittingCatalog.js';
import {
  SEAMLESS_WELDED_FITTING_CATEGORY_NAME,
  SEAMLESS_WELDED_FITTING_ELBOW_TYPE_NAMES,
  SEAMLESS_WELDED_FITTING_TYPE_NAMES,
  seamlessWeldedFittingBindingPlan,
  seamlessWeldedFittingCatalogRows,
  seamlessWeldedFittingFamily,
  seamlessWeldedFittingIdentityRows,
} from '../domain/productMaster/seamlessWeldedFittingCatalog.js';

describe('seamlessWeldedFittingCatalog', () => {
  it('lists 36 identity rows of fitting_material only (9 Types × 4 materials)', () => {
    assert.equal(SEAMLESS_WELDED_FITTING_CATEGORY_NAME, 'اتصالات جوشی مانیسمان');
    assert.equal(SEAMLESS_WELDED_FITTING_TYPE_NAMES.length, 9);
    assert.deepEqual([...SEAMLESS_WELDED_FITTING_TYPE_NAMES], [
      'زانو ۹۰ درجه مانیسمان',
      'زانو ۴۵ درجه مانیسمان',
      'زانو ۱۸۰ درجه مانیسمان (U-Bend)',
      'سه راهی مساوی مانیسمان',
      'سه راهی تبدیلی مانیسمان',
      'تبدیل هم‌مرکز مانیسمان',
      'تبدیل غیرهم‌مرکز مانیسمان',
      'کپ مانیسمان (درپوش)',
      'تبدیل لبه‌دار (استب اند)',
    ]);

    const perType = seamlessWeldedFittingIdentityRows(SEAMLESS_WELDED_FITTING_TYPE_NAMES[0]);
    assert.equal(perType.length, 4);
    assert.deepEqual(perType[0], { fitting_material: 'carbon' });
    assert.deepEqual(perType.at(-1), { fitting_material: 'ss316' });
    assert.equal(perType.every((row) => Object.keys(row).join() === 'fitting_material'), true);
    assert.equal(perType.every((row) => row.size_pipe === undefined && row.sch === undefined), true);
    assert.deepEqual(perType.map((row) => row.fitting_material), [...FITTING_MATERIAL_VALUES]);

    const rows = seamlessWeldedFittingCatalogRows();
    assert.equal(rows.length, 36);
    assert.equal(rows.length, 9 * 4);
    assert.equal(rows.every((row) => row.fitting_material && row.typeName), true);
    assert.equal(rows.every((row) => row.size_pipe === undefined && row.sch === undefined), true);
    assert.equal(new Set(rows.map((row) => `${row.typeName}@${row.fitting_material}`)).size, 36);
  });

  it('maps elbow / single-port / reducing-tee / reducer families onto the shared binding plan', () => {
    assert.equal(seamlessWeldedFittingFamily('زانو ۹۰ درجه مانیسمان'), WELDED_FITTING_FAMILY.elbow);
    assert.equal(seamlessWeldedFittingFamily('کپ مانیسمان (درپوش)'), WELDED_FITTING_FAMILY.singlePort);
    assert.equal(seamlessWeldedFittingFamily('سه راهی تبدیلی مانیسمان'), WELDED_FITTING_FAMILY.reducingTee);
    assert.equal(seamlessWeldedFittingFamily('تبدیل هم‌مرکز مانیسمان'), WELDED_FITTING_FAMILY.reducer);
    assert.equal(seamlessWeldedFittingFamily('لوله مانیسمان'), null);

    for (const name of SEAMLESS_WELDED_FITTING_ELBOW_TYPE_NAMES) {
      const codes = seamlessWeldedFittingBindingPlan(name).map((row) => row.code);
      assert.deepEqual(codes, ['fitting_material', 'size_pipe', 'sch', 'elbow_radius']);
    }
    assert.deepEqual(
      seamlessWeldedFittingBindingPlan('سه راهی مساوی مانیسمان').map((row) => row.code),
      ['fitting_material', 'size_pipe', 'sch'],
    );
    assert.deepEqual(
      seamlessWeldedFittingBindingPlan('سه راهی تبدیلی مانیسمان').map((row) => row.code),
      ['fitting_material', 'size_pipe', 'size_branch', 'sch'],
    );
    assert.deepEqual(
      seamlessWeldedFittingBindingPlan('تبدیل غیرهم‌مرکز مانیسمان').map((row) => row.code),
      ['fitting_material', 'size_pipe', 'size_branch', 'sch'],
    );
  });
});
