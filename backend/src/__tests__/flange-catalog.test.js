/**
 * Flange identity catalog (Type + fitting_material). Facing is not identity.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SEAMLESS_PIPE_SCH_VALUES } from '../domain/productMaster/seamlessPipeCatalog.js';
import { FITTING_MATERIAL_VALUES } from '../domain/productMaster/weldedFittingCatalog.js';
import { FORGED_CLASS_VALUES } from '../domain/productMaster/forgedFittingCatalog.js';
import {
  FLANGE_CATEGORY_NAME,
  FLANGE_CLASS_VALUES,
  FLANGE_FACING_DEFAULT,
  FLANGE_TYPE_NAMES,
  flangeBindingPlan,
  flangeCatalogRows,
  flangeClassIsDistinct,
  flangeIdentityRows,
} from '../domain/productMaster/flangeCatalog.js';

describe('flangeCatalog', () => {
  it('lists 24 identity rows of fitting_material only (6 Types × 4 materials)', () => {
    assert.equal(FLANGE_CATEGORY_NAME, 'فلنج‌ها');
    assert.equal(FLANGE_TYPE_NAMES.length, 6);
    assert.deepEqual([...FLANGE_TYPE_NAMES], [
      'فلنج گلودار جوشی',
      'فلنج اسلیپون (روکار)',
      'فلنج کور',
      'فلنج ساکت‌ولد',
      'فلنج دنده‌ای',
      'فلنج لبه‌دار',
    ]);

    const perType = flangeIdentityRows(FLANGE_TYPE_NAMES[0]);
    assert.equal(perType.length, 4);
    assert.equal(perType.every((row) => Object.keys(row).join() === 'fitting_material'), true);
    assert.equal(perType.every((row) => (
      row.size_pipe === undefined
      && row.flange_class === undefined
      && row.flange_facing === undefined
      && row.sch === undefined
      && row.forged_class === undefined
    )), true);
    assert.deepEqual(perType.map((row) => row.fitting_material), [...FITTING_MATERIAL_VALUES]);

    const rows = flangeCatalogRows();
    assert.equal(rows.length, 24);
    assert.equal(rows.length, 6 * 4);
    assert.equal(rows.every((row) => row.flange_facing === undefined), true);
    assert.equal(new Set(rows.map((row) => `${row.typeName}@${row.fitting_material}`)).size, 24);
  });

  it('keeps flange_class distinct from pipe sch and forged_class; facing is Offer Variant', () => {
    assert.deepEqual([...FLANGE_CLASS_VALUES], ['150', '300', '600', '900', '1500', '2500']);
    assert.notDeepEqual([...FLANGE_CLASS_VALUES], [...SEAMLESS_PIPE_SCH_VALUES]);
    assert.notDeepEqual([...FLANGE_CLASS_VALUES], [...FORGED_CLASS_VALUES]);
    assert.equal(flangeClassIsDistinct(), true);
    assert.equal(SEAMLESS_PIPE_SCH_VALUES.length, 17);

    const plan = new Map(flangeBindingPlan('فلنج کور').map((row) => [row.code, row]));
    assert.equal(plan.get('fitting_material').valueScope, 'PRODUCT');
    assert.equal(plan.get('fitting_material').isRequired, true);
    assert.equal(plan.get('size_pipe').valueScope, 'TRANSACTION');
    assert.equal(plan.get('size_pipe').isRequired, true);
    assert.equal(plan.get('class').valueScope, 'TRANSACTION');
    assert.equal(plan.get('class').isRequired, true);
    assert.equal(plan.get('supply_form').valueScope, 'TRANSACTION');
    assert.equal(plan.get('supply_form').isRequired, false);
    assert.equal(plan.get('supply_form').overrideDefaultValue, FLANGE_FACING_DEFAULT);
    assert.equal(plan.has('sch'), false);
    assert.equal(plan.has('forged_class'), false);
    assert.equal(plan.has('flange_class'), false);
    assert.equal(plan.has('flange_facing'), false);
  });
});
