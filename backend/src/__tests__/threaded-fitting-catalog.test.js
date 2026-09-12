/**
 * General threaded fittings identity catalog (Type + fitting_material).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FITTING_MATERIAL_VALUES } from '../domain/productMaster/weldedFittingCatalog.js';
import { validateReducerSizes, validateReducingTeeSizes } from '../domain/productMaster/weldedFittingCatalog.js';
import {
  ELBOW_ANGLE_DEFAULT,
  THREADED_CLASS_CODE,
  THREADED_FITTING_CATEGORY_NAME,
  THREADED_FITTING_EXCLUDED_TYPE_NAMES,
  THREADED_FITTING_FAMILY,
  THREADED_FITTING_TYPE_NAMES,
  threadedFittingBindingPlan,
  threadedFittingCatalogRows,
  threadedFittingFamily,
  threadedFittingIdentityRows,
} from '../domain/productMaster/threadedFittingCatalog.js';

describe('threadedFittingCatalog', () => {
  it('lists 36 identity rows of fitting_material only (9 Types × 4 materials)', () => {
    assert.equal(THREADED_FITTING_CATEGORY_NAME, 'اتصالات دنده‌ای');
    assert.equal(THREADED_FITTING_TYPE_NAMES.length, 9);
    assert.deepEqual([...THREADED_FITTING_TYPE_NAMES], [
      'زانو دنده‌ای',
      'سه راهی مساوی دنده‌ای',
      'سه راهی تبدیلی دنده‌ای',
      'چپقی دنده‌ای (زانو مغزی)',
      'مغزی دنده‌ای',
      'بوشن دنده‌ای',
      'تبدیل دنده‌ای (روپیچ توپیچ)',
      'مهره ماسوره دنده‌ای',
      'درپوش دنده‌ای (چهارگوش/شش‌گوش)',
    ]);
    for (const name of THREADED_FITTING_EXCLUDED_TYPE_NAMES) {
      assert.equal(THREADED_FITTING_TYPE_NAMES.includes(name), false);
      assert.equal(threadedFittingFamily(name), null);
    }

    const perType = threadedFittingIdentityRows(THREADED_FITTING_TYPE_NAMES[0]);
    assert.equal(perType.length, 4);
    assert.equal(perType.every((row) => Object.keys(row).join() === 'fitting_material'), true);
    assert.equal(perType.every((row) => (
      row.size_pipe === undefined
      && row.threaded_class === undefined
      && row.sch === undefined
      && row.forged_class === undefined
    )), true);
    assert.deepEqual(perType.map((row) => row.fitting_material), [...FITTING_MATERIAL_VALUES]);

    const rows = threadedFittingCatalogRows();
    assert.equal(rows.length, 36);
    assert.equal(rows.length, 9 * 4);
    assert.equal(new Set(rows.map((row) => `${row.typeName}@${row.fitting_material}`)).size, 36);
  });

  it('keeps Iranian class as optional Offer Variant; size is the only required dimension', () => {
    assert.equal(threadedFittingFamily('زانو دنده‌ای'), THREADED_FITTING_FAMILY.elbow);
    assert.equal(threadedFittingFamily('چپقی دنده‌ای (زانو مغزی)'), THREADED_FITTING_FAMILY.elbow);
    assert.equal(threadedFittingFamily('سه راهی تبدیلی دنده‌ای'), THREADED_FITTING_FAMILY.reducingTee);
    assert.equal(threadedFittingFamily('تبدیل دنده‌ای (روپیچ توپیچ)'), THREADED_FITTING_FAMILY.bushing);

    const elbow = new Map(threadedFittingBindingPlan('زانو دنده‌ای').map((row) => [row.code, row]));
    assert.equal(elbow.get('fitting_material').valueScope, 'PRODUCT');
    assert.equal(elbow.get('size_pipe').valueScope, 'TRANSACTION');
    assert.equal(elbow.get('size_pipe').isRequired, true);
    assert.equal(elbow.get(THREADED_CLASS_CODE).valueScope, 'TRANSACTION');
    assert.equal(elbow.get(THREADED_CLASS_CODE).isRequired, false);
    assert.equal(THREADED_CLASS_CODE, 'class');
    assert.equal(elbow.get('supply_form').overrideDefaultValue, ELBOW_ANGLE_DEFAULT);
    assert.equal(elbow.has('sch'), false);
    assert.equal(elbow.has('forged_class'), false);
    assert.equal(elbow.has('elbow_angle'), false);

    const tee = new Map(threadedFittingBindingPlan('سه راهی تبدیلی دنده‌ای').map((row) => [row.code, row]));
    assert.equal(tee.get('size_pipe').isRequired, true);
    assert.equal(tee.get('size_branch').valueScope, 'TRANSACTION');
    assert.equal(tee.get(THREADED_CLASS_CODE).isRequired, false);
    assert.equal(tee.has('size_run'), false);

    const bushing = new Map(threadedFittingBindingPlan('تبدیل دنده‌ای (روپیچ توپیچ)').map((row) => [row.code, row]));
    assert.equal(bushing.get('size_pipe').isRequired, true);
    assert.equal(bushing.get('size_branch').isRequired, true);
    assert.equal(bushing.has('size_large'), false);
    assert.equal(bushing.has('size_small'), false);

    assert.deepEqual(validateReducingTeeSizes({ sizeRun: 3, sizeBranch: 1 }), { ok: true });
    assert.equal(validateReducingTeeSizes({ sizeRun: 1, sizeBranch: 1 }).ok, false);
    assert.deepEqual(validateReducerSizes({ sizeLarge: 2, sizeSmall: 1 }), { ok: true });
    assert.equal(validateReducerSizes({ sizeLarge: 1, sizeSmall: 1 }).ok, false);
  });
});
