/**
 * Shared welded-fitting domain (seamed + seamless contract).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SEAMLESS_PIPE_SCH_VALUES } from '../domain/productMaster/seamlessPipeCatalog.js';
import {
  ELBOW_RADIUS_ATTRIBUTE,
  FITTING_MATERIAL_ATTRIBUTE,
  FITTING_MATERIAL_VALUES,
  WELDED_FITTING_FAMILY,
  WELDED_FITTING_FORBIDDEN_MASTER_CODES,
  WELDED_FITTING_SCH_VALUES,
  WELDED_FITTING_SIZE_MAX,
  WELDED_FITTING_SIZE_MIN,
  isValidWeldedFittingSize,
  validateReducerSizes,
  validateReducingTeeSizes,
  weldedFittingBindingPlan,
  weldedFittingDisplayNameRule,
} from '../domain/productMaster/weldedFittingCatalog.js';
import { buildDisplayNameFromRule } from '../domain/productMaster/displayNameRule.js';

function planByCode(family) {
  return new Map(weldedFittingBindingPlan(family).map((row) => [row.code, row]));
}

describe('weldedFittingCatalog', () => {
  it('reuses the seamless pipe schedule list by reference', () => {
    assert.equal(WELDED_FITTING_SCH_VALUES, SEAMLESS_PIPE_SCH_VALUES);
    assert.deepEqual([...WELDED_FITTING_SCH_VALUES], [...SEAMLESS_PIPE_SCH_VALUES]);
    assert.equal(WELDED_FITTING_SCH_VALUES.length, 17);
  });

  it('lists four fitting materials and does not put millimetre size/grade/length on the plan', () => {
    assert.deepEqual([...FITTING_MATERIAL_VALUES], ['carbon', 'galvanized', 'ss304', 'ss316']);
    assert.equal(FITTING_MATERIAL_ATTRIBUTE.nameFa, 'جنس');
    assert.deepEqual([...WELDED_FITTING_FORBIDDEN_MASTER_CODES], ['size', 'grade', 'length']);
    for (const family of Object.values(WELDED_FITTING_FAMILY)) {
      const codes = weldedFittingBindingPlan(family).map((row) => row.code);
      for (const forbidden of WELDED_FITTING_FORBIDDEN_MASTER_CODES) {
        assert.equal(codes.includes(forbidden), false, `${family} bound ${forbidden}`);
      }
    }
  });

  it('binds material as PRODUCT required; sizes+sch TRANSACTION required; elbow_radius Offer Variant on elbows only', () => {
    const elbow = planByCode(WELDED_FITTING_FAMILY.elbow);
    const single = planByCode(WELDED_FITTING_FAMILY.singlePort);
    const tee = planByCode(WELDED_FITTING_FAMILY.reducingTee);
    const reducer = planByCode(WELDED_FITTING_FAMILY.reducer);

    for (const plan of [elbow, single, tee, reducer]) {
      const material = plan.get('fitting_material');
      assert.equal(material.isRequired, true);
      assert.equal(material.valueScope, 'PRODUCT');
      const sch = plan.get('sch');
      assert.equal(sch.isRequired, true);
      assert.equal(sch.valueScope, 'TRANSACTION');
      assert.equal(sch.overrideAllowedValues, WELDED_FITTING_SCH_VALUES);
    }

    assert.equal(elbow.get('size_pipe').valueScope, 'TRANSACTION');
    assert.equal(elbow.get('size_pipe').isRequired, true);
    assert.equal(elbow.get('size_pipe').overrideMin, WELDED_FITTING_SIZE_MIN);
    assert.equal(elbow.get('size_pipe').overrideMax, WELDED_FITTING_SIZE_MAX);
    assert.equal(elbow.get('elbow_radius').valueScope, 'TRANSACTION');
    assert.equal(elbow.get('elbow_radius').isRequired, false);
    assert.equal(elbow.get('elbow_radius').overrideDefaultValue, 'LR');
    assert.equal(single.has('elbow_radius'), false);
    assert.equal(tee.has('elbow_radius'), false);
    assert.equal(reducer.has('elbow_radius'), false);

    assert.equal(single.get('size_pipe').isRequired, true);
    assert.equal(tee.get('size_pipe').valueScope, 'TRANSACTION');
    assert.equal(tee.get('size_branch').isRequired, true);
    assert.equal(tee.has('size_run'), false);
    assert.equal(reducer.get('size_pipe').valueScope, 'TRANSACTION');
    assert.equal(reducer.get('size_branch').isRequired, true);
    assert.equal(reducer.has('size_large'), false);
    assert.equal(reducer.has('size_small'), false);
    assert.equal(ELBOW_RADIUS_ATTRIBUTE.allowedValues.map((row) => row.value).join(), 'LR,SR');
  });

  it('rejects sizes outside 0.5–48 and reducing/reducer inversions', () => {
    assert.equal(isValidWeldedFittingSize(0.5), true);
    assert.equal(isValidWeldedFittingSize(48), true);
    assert.equal(isValidWeldedFittingSize(0.49), false);
    assert.equal(isValidWeldedFittingSize(48.01), false);
    assert.equal(isValidWeldedFittingSize('x'), false);

    assert.deepEqual(validateReducingTeeSizes({ sizeRun: 4, sizeBranch: 2 }), { ok: true });
    assert.equal(validateReducingTeeSizes({ sizeRun: 2, sizeBranch: 4 }).ok, false);
    assert.equal(validateReducingTeeSizes({ sizeRun: 2, sizeBranch: 2 }).ok, false);
    assert.equal(validateReducingTeeSizes({ sizeRun: 4, sizeBranch: 0.25 }).error, 'size_out_of_range');

    assert.deepEqual(validateReducerSizes({ sizeLarge: 6, sizeSmall: 3 }), { ok: true });
    assert.equal(validateReducerSizes({ sizeLarge: 3, sizeSmall: 6 }).ok, false);
    assert.equal(validateReducerSizes({ sizeLarge: 3, sizeSmall: 3 }).ok, false);
    assert.equal(validateReducerSizes({ sizeLarge: 60, sizeSmall: 3 }).error, 'size_out_of_range');
  });

  it('builds display names from type + material label, without size or sch', () => {
    const rule = weldedFittingDisplayNameRule({ materialId: 'mat' });
    const name = buildDisplayNameFromRule(rule, {
      sources: { type: 'زانو ۹۰ درجه مانیسمان' },
      attributes: {
        mat: { nameFa: 'جنس', displayValue: 'فولادی' },
      },
    });
    assert.equal(name, 'زانو ۹۰ درجه مانیسمان فولادی');
    assert.equal(name.includes('جنس'), false);
  });
});
