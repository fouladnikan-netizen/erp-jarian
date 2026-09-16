/**
 * Forged high-pressure fittings identity catalog (Type + fitting_material).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SEAMLESS_PIPE_SCH_VALUES } from '../domain/productMaster/seamlessPipeCatalog.js';
import { FITTING_MATERIAL_VALUES } from '../domain/productMaster/weldedFittingCatalog.js';
import { validateReducingTeeSizes } from '../domain/productMaster/weldedFittingCatalog.js';
import {
  ELBOW_ANGLE_DEFAULT,
  FORGED_CLASS_VALUES,
  FORGED_FITTING_CATEGORY_NAME,
  FORGED_FITTING_FAMILY,
  FORGED_FITTING_TYPE_NAMES,
  forgedClassIsNotPipeSch,
  forgedFittingBindingPlan,
  forgedFittingCatalogRows,
  forgedFittingFamily,
  forgedFittingIdentityRows,
  validateOletSizes,
} from '../domain/productMaster/forgedFittingCatalog.js';

describe('forgedFittingCatalog', () => {
  it('lists 44 identity rows of fitting_material only (11 Types × 4 materials)', () => {
    assert.equal(FORGED_FITTING_CATEGORY_NAME, 'اتصالات فشار قوی و فورج');
    assert.equal(FORGED_FITTING_TYPE_NAMES.length, 11);
    assert.deepEqual([...FORGED_FITTING_TYPE_NAMES], [
      'زانو ساکت‌ولد',
      'سه راهی مساوی ساکت‌ولد',
      'سه راهی تبدیلی ساکت‌ولد',
      'کاپلینگ ساکت‌ولد (بوشن)',
      'نیم‌بوشن ساکت‌ولد',
      'مهره ماسوره ساکت‌ولد',
      'کپ ساکت‌ولد',
      'تردوولت / ساکوولت (اتصالات انشعابی)',
      'زانو دنده‌ای فشار قوی',
      'سه راهی دنده‌ای فشار قوی',
      'مغزی فشار قوی',
    ]);

    const perType = forgedFittingIdentityRows(FORGED_FITTING_TYPE_NAMES[0]);
    assert.equal(perType.length, 4);
    assert.deepEqual(perType[0], { fitting_material: 'carbon' });
    assert.deepEqual(perType.at(-1), { fitting_material: 'ss316' });
    assert.equal(perType.every((row) => Object.keys(row).join() === 'fitting_material'), true);
    assert.equal(perType.every((row) => (
      row.size_pipe === undefined
      && row.forged_class === undefined
      && row.sch === undefined
      && row.elbow_angle === undefined
      && row.olet_style === undefined
    )), true);
    assert.deepEqual(perType.map((row) => row.fitting_material), [...FITTING_MATERIAL_VALUES]);

    const rows = forgedFittingCatalogRows();
    assert.equal(rows.length, 44);
    assert.equal(rows.length, 11 * 4);
    assert.equal(rows.every((row) => row.fitting_material && row.typeName), true);
    assert.equal(new Set(rows.map((row) => `${row.typeName}@${row.fitting_material}`)).size, 44);
  });

  it('keeps forged_class as 3000/6000/9000, not seamless pipe sch', () => {
    assert.deepEqual([...FORGED_CLASS_VALUES], ['3000', '6000', '9000']);
    assert.notDeepEqual([...FORGED_CLASS_VALUES], [...SEAMLESS_PIPE_SCH_VALUES]);
    assert.equal(FORGED_CLASS_VALUES, FORGED_CLASS_VALUES);
    assert.equal(forgedClassIsNotPipeSch(), true);
    assert.equal(SEAMLESS_PIPE_SCH_VALUES.includes('3000'), false);
    assert.equal(SEAMLESS_PIPE_SCH_VALUES.length, 17);
  });

  it('binds material PRODUCT; size+forged_class TRANSACTION; olet ≤ and reducing <', () => {
    assert.equal(forgedFittingFamily('زانو ساکت‌ولد'), FORGED_FITTING_FAMILY.swElbow);
    assert.equal(forgedFittingFamily('سه راهی تبدیلی ساکت‌ولد'), FORGED_FITTING_FAMILY.reducingTee);
    assert.equal(forgedFittingFamily('تردوولت / ساکوولت (اتصالات انشعابی)'), FORGED_FITTING_FAMILY.olet);
    assert.equal(forgedFittingFamily('مغزی فشار قوی'), FORGED_FITTING_FAMILY.singlePort);
    assert.equal(forgedFittingFamily('زانو دنده‌ای'), null);

    const elbow = new Map(forgedFittingBindingPlan('زانو ساکت‌ولد').map((row) => [row.code, row]));
    assert.equal(elbow.get('fitting_material').valueScope, 'PRODUCT');
    assert.equal(elbow.get('fitting_material').isRequired, true);
    assert.equal(elbow.get('size_pipe').valueScope, 'TRANSACTION');
    assert.equal(elbow.get('size_pipe').isRequired, true);
    assert.equal(elbow.get('class').valueScope, 'TRANSACTION');
    assert.equal(elbow.get('class').isRequired, true);
    assert.equal(elbow.get('supply_form').isRequired, false);
    assert.equal(elbow.get('supply_form').overrideDefaultValue, ELBOW_ANGLE_DEFAULT);
    assert.equal(elbow.has('sch'), false);
    assert.equal(elbow.has('forged_class'), false);
    assert.equal(elbow.has('elbow_angle'), false);

    const tee = new Map(forgedFittingBindingPlan('سه راهی تبدیلی ساکت‌ولد').map((row) => [row.code, row]));
    assert.equal(tee.get('size_pipe').valueScope, 'TRANSACTION');
    assert.equal(tee.get('size_branch').isRequired, true);
    assert.equal(tee.has('size_run'), false);

    const olet = new Map(forgedFittingBindingPlan('تردوولت / ساکوولت (اتصالات انشعابی)').map((row) => [row.code, row]));
    assert.equal(olet.get('kind').valueScope, 'TRANSACTION');
    assert.equal(olet.get('kind').isRequired, false);
    assert.equal(olet.has('olet_style'), false);

    assert.deepEqual(validateReducingTeeSizes({ sizeRun: 4, sizeBranch: 2 }), { ok: true });
    assert.equal(validateReducingTeeSizes({ sizeRun: 2, sizeBranch: 2 }).ok, false);
    assert.equal(validateReducingTeeSizes({ sizeRun: 2, sizeBranch: 4 }).ok, false);

    assert.deepEqual(validateOletSizes({ sizeRun: 4, sizeBranch: 2 }), { ok: true });
    assert.deepEqual(validateOletSizes({ sizeRun: 2, sizeBranch: 2 }), { ok: true });
    assert.equal(validateOletSizes({ sizeRun: 2, sizeBranch: 4 }).ok, false);
    assert.equal(validateOletSizes({ sizeRun: 4, sizeBranch: 0.25 }).error, 'size_out_of_range');
  });
});
