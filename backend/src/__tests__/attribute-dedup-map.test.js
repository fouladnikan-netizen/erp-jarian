/**
 * Shared Attribute Definition vocabulary map (DDL-66).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ATTRIBUTE_DEDUP_MAP,
  CLASS_CODE,
  DEACTIVATE_AFTER_MIGRATE,
  JUSTIFIED_NEW_OR_KEPT,
  KIND_CODE,
  LENGTH_MM_CODE,
  LENGTH_M_CODE,
  SIZE_BRANCH_CODE,
  SIZE_PIPE_CODE,
  SUPPLY_FORM_CODE,
  THICKNESS_MM_CODE,
} from '../domain/productMaster/attributeDedupMap.js';
import { SHEET_LENGTH_CODE } from '../domain/productMaster/sheetMillLength.js';
import { FASTENER_TYPE_NAMES, fastenerBindingPlan } from '../domain/productMaster/fastenerCatalog.js';
import {
  FORGED_FITTING_TYPE_NAMES,
  forgedFittingBindingPlan,
} from '../domain/productMaster/forgedFittingCatalog.js';
import {
  THREADED_FITTING_TYPE_NAMES,
  threadedFittingBindingPlan,
} from '../domain/productMaster/threadedFittingCatalog.js';
import { FLANGE_TYPE_NAMES, flangeBindingPlan } from '../domain/productMaster/flangeCatalog.js';
import {
  SEAMLESS_WELDED_FITTING_TYPE_NAMES,
  seamlessWeldedFittingBindingPlan,
} from '../domain/productMaster/seamlessWeldedFittingCatalog.js';
import {
  WELDED_FITTING_FAMILY,
  weldedFittingBindingPlan,
} from '../domain/productMaster/weldedFittingCatalog.js';

describe('attributeDedupMap', () => {
  it('maps wave duplicates onto shared vocabulary and never uses sheet_length for fasteners', () => {
    const byFrom = Object.fromEntries(ATTRIBUTE_DEDUP_MAP.map((row) => [row.from, row.to]));
    assert.equal(byFrom.threaded_class, CLASS_CODE);
    assert.equal(byFrom.flange_class, CLASS_CODE);
    assert.equal(byFrom.forged_class, CLASS_CODE);
    assert.equal(CLASS_CODE, 'class');
    assert.equal(byFrom.fastener_length, LENGTH_MM_CODE);
    assert.equal(LENGTH_MM_CODE, 'length_mm');
    assert.notEqual(byFrom.fastener_length, SHEET_LENGTH_CODE);
    assert.notEqual(LENGTH_MM_CODE, SHEET_LENGTH_CODE);
    assert.equal(byFrom.board_length_m, LENGTH_M_CODE);
    assert.equal(byFrom.plywood_thickness_mm, THICKNESS_MM_CODE);
    assert.equal(byFrom.plywood_width_mm, 'width');
    assert.equal(byFrom.plywood_height_mm, 'height');
    assert.equal(byFrom.elbow_angle, SUPPLY_FORM_CODE);
    assert.equal(byFrom.surface_alloy, SUPPLY_FORM_CODE);
    assert.equal(byFrom.flange_facing, SUPPLY_FORM_CODE);
    assert.equal(byFrom.olet_style, KIND_CODE);
    assert.equal(byFrom.tooth_style, KIND_CODE);
    assert.equal(byFrom.coating, KIND_CODE);
    assert.equal(byFrom.frame_model, KIND_CODE);
    assert.equal(byFrom.size_run, SIZE_PIPE_CODE);
    assert.equal(byFrom.size_large, SIZE_PIPE_CODE);
    assert.equal(byFrom.size_small, SIZE_BRANCH_CODE);
    assert.equal(DEACTIVATE_AFTER_MIGRATE.includes('size_branch'), false);
    assert.equal(DEACTIVATE_AFTER_MIGRATE.includes('board_thickness_cm'), false);
    assert.equal(JUSTIFIED_NEW_OR_KEPT.some((row) => row.code === LENGTH_MM_CODE), true);
    assert.equal(JUSTIFIED_NEW_OR_KEPT.some((row) => row.code === CLASS_CODE), true);
  });

  it('no Type binding plan still uses threaded_class+flange_class+forged_class together', () => {
    const plans = [
      ...FORGED_FITTING_TYPE_NAMES.map((name) => forgedFittingBindingPlan(name)),
      ...THREADED_FITTING_TYPE_NAMES.map((name) => threadedFittingBindingPlan(name)),
      ...FLANGE_TYPE_NAMES.map((name) => flangeBindingPlan(name)),
      ...SEAMLESS_WELDED_FITTING_TYPE_NAMES.map((name) => seamlessWeldedFittingBindingPlan(name)),
      ...Object.values(WELDED_FITTING_FAMILY).map((family) => weldedFittingBindingPlan(family)),
      ...FASTENER_TYPE_NAMES.map((name) => fastenerBindingPlan(name)),
    ];
    for (const plan of plans) {
      const codes = new Set(plan.map((row) => row.code));
      const classForks = ['threaded_class', 'flange_class', 'forged_class'].filter((code) => codes.has(code));
      assert.equal(classForks.length, 0, `forked class codes still bound: ${classForks.join(',')}`);
      assert.equal(codes.has('threaded_class') && codes.has('flange_class') && codes.has('forged_class'), false);
    }
  });

  it('reducing tee plans bind size_pipe + size_branch, not size_run', () => {
    const reducing = [
      forgedFittingBindingPlan('سه راهی تبدیلی ساکت‌ولد'),
      threadedFittingBindingPlan('سه راهی تبدیلی دنده‌ای'),
      seamlessWeldedFittingBindingPlan('سه راهی تبدیلی مانیسمان'),
      weldedFittingBindingPlan(WELDED_FITTING_FAMILY.reducingTee),
    ];
    for (const plan of reducing) {
      const codes = plan.map((row) => row.code);
      assert.equal(codes.includes(SIZE_PIPE_CODE), true);
      assert.equal(codes.includes(SIZE_BRANCH_CODE), true);
      assert.equal(codes.includes('size_run'), false);
      assert.equal(codes.includes('size_large'), false);
      assert.equal(codes.includes('size_small'), false);
    }

    const bolt = fastenerBindingPlan('پیچ شش‌گوش آچاری').map((row) => row.code);
    assert.equal(bolt.includes(LENGTH_MM_CODE), true);
    assert.equal(bolt.includes(SHEET_LENGTH_CODE), false);
    assert.equal(bolt.includes('fastener_length'), false);
  });
});
