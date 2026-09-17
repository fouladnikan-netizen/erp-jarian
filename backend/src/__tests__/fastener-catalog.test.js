/**
 * Fasteners identity catalog (Type shape + fastener_grade).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  FASTENER_ATTRIBUTE_SPECS,
  FASTENER_BOLT_TYPE_NAMES,
  FASTENER_CATALOG_PRODUCT_COUNT,
  FASTENER_COATING_CODE,
  FASTENER_FAMILY,
  FASTENER_FORBIDDEN_MASTER_CODES,
  FASTENER_GENERAL_GRADES,
  FASTENER_GRADE_CODE,
  FASTENER_GRADE_VALUES,
  FASTENER_GROUP_NAME,
  FASTENER_LENGTH_CODE,
  FASTENER_LENGTH_MAX_MM,
  FASTENER_LENGTH_MIN_MM,
  FASTENER_NUT_TYPE_NAMES,
  FASTENER_SELF_DRILL_GRADES,
  FASTENER_SELF_DRILL_TYPE_NAMES,
  FASTENER_SIZE_CODE,
  FASTENER_SIZE_VALUES,
  FASTENER_STAR_WASHER_TYPE_NAME,
  FASTENER_TOOTH_STYLE_CODE,
  FASTENER_TYPE_NAMES,
  FASTENER_WASHER_GRADES,
  FASTENER_WASHER_TYPE_NAMES,
  fastenerBindingPlan,
  fastenerCatalogRows,
  fastenerDisplayNameRule,
  fastenerFamily,
  fastenerGradesForType,
  fastenerIdentityRows,
  sameFastenerName,
} from '../domain/productMaster/fastenerCatalog.js';
import { buildDisplayNameFromRule } from '../domain/productMaster/displayNameRule.js';

function planByCode(typeName) {
  return new Map(fastenerBindingPlan(typeName).map((row) => [row.code, row]));
}

describe('fastenerCatalog', () => {
  it('keeps 28 Types and 179 grade-only identity rows (no size/length cartesian)', () => {
    assert.equal(FASTENER_GROUP_NAME, 'پیچ و مهره');
    assert.equal(FASTENER_TYPE_NAMES.length, 28);
    assert.equal(FASTENER_BOLT_TYPE_NAMES.length, 7);
    assert.equal(FASTENER_NUT_TYPE_NAMES.length, 7);
    assert.equal(FASTENER_WASHER_TYPE_NAMES.length, 5);
    assert.equal(FASTENER_SELF_DRILL_TYPE_NAMES.length, 4);
    assert.equal(new Set(FASTENER_TYPE_NAMES).size, 28);

    const hex = fastenerIdentityRows('پیچ شش‌گوش آچاری');
    assert.equal(hex.length, 8);
    assert.deepEqual(hex[0], { fastener_grade: '4.8' });
    assert.deepEqual(hex.at(-1), { fastener_grade: 'A4-80' });
    assert.equal(hex.every((row) => Object.keys(row).join() === 'fastener_grade'), true);
    assert.equal(hex.every((row) => row.size === undefined && row.length === undefined), true);
    assert.equal(hex.every((row) => row.coating === undefined && row.head_style === undefined), true);

    const washer = fastenerIdentityRows('واشر تخت معمولی');
    assert.equal(washer.length, 3);
    assert.deepEqual(washer.map((row) => row.fastener_grade), [...FASTENER_WASHER_GRADES]);

    const drill = fastenerIdentityRows('پیچ سرمته‌ای واشردار (شیروانی)');
    assert.equal(drill.length, 3);
    assert.deepEqual(drill.map((row) => row.fastener_grade), [...FASTENER_SELF_DRILL_GRADES]);

    const rows = fastenerCatalogRows();
    assert.equal(rows.length, 179);
    assert.equal(rows.length, FASTENER_CATALOG_PRODUCT_COUNT);
    assert.equal(7 * 8 + 7 * 8 + 5 * 3 + 5 * 8 + 4 * 3, 179);
    assert.equal(rows.every((row) => row.fastener_grade && row.typeName), true);
    assert.equal(rows.every((row) => row.size === undefined && row.fastener_size === undefined), true);
    assert.equal(rows.every((row) => row.length === undefined && row.coating === undefined), true);
    assert.equal(new Set(rows.map((row) => `${row.typeName}@${row.fastener_grade}`)).size, 179);
  });

  it('uses dedicated fastener_grade (not mill grade) with washer vs self-drill subsets', () => {
    assert.deepEqual([...FASTENER_GRADE_VALUES], [
      '4.8', '5.6', '8.8', '10.9', '12.9', 'A2-70', 'A4-70', 'A4-80',
    ]);
    assert.equal(FASTENER_GENERAL_GRADES, FASTENER_GRADE_VALUES);
    assert.deepEqual([...FASTENER_WASHER_GRADES], ['4.8', 'A2-70', 'A4-80']);
    assert.deepEqual([...FASTENER_SELF_DRILL_GRADES], ['8.8', 'A2-70', 'A4-80']);
    assert.deepEqual([...fastenerGradesForType('مهره پروانه‌ای (خروسکی)')], [...FASTENER_GRADE_VALUES]);
    assert.deepEqual([...fastenerGradesForType('مهره کاسه‌دار (گنبدی)')], [...FASTENER_GRADE_VALUES]);
    assert.equal(FASTENER_ATTRIBUTE_SPECS.some((row) => row.code === 'grade'), false);
    assert.equal(FASTENER_ATTRIBUTE_SPECS.some((row) => row.dataType === 'STRING'), false);
  });

  it('binds grade PRODUCT required; size/length TRANSACTION required; coating Offer Variant', () => {
    const bolt = planByCode('پیچ شش‌گوش آچاری');
    const nut = planByCode('مهره شش‌گوش معمولی');
    const washer = planByCode('واشر تخت معمولی');
    const star = planByCode(FASTENER_STAR_WASHER_TYPE_NAME);
    const drill = planByCode('پیچ سرمته‌ای سرتخت (خزینه)');

    for (const plan of [bolt, nut, washer, star, drill]) {
      const grade = plan.get(FASTENER_GRADE_CODE);
      assert.equal(grade.isRequired, true);
      assert.equal(grade.valueScope, 'PRODUCT');
      const size = plan.get(FASTENER_SIZE_CODE);
      assert.equal(size.isRequired, true);
      assert.equal(size.valueScope, 'TRANSACTION');
      for (const forbidden of FASTENER_FORBIDDEN_MASTER_CODES) {
        assert.equal(plan.has(forbidden), false, `plan bound ${forbidden}`);
      }
      assert.equal(plan.has('head_style'), false);
      assert.equal(plan.has('alloy'), false);
    }

    assert.equal(FASTENER_LENGTH_CODE, 'length_mm');
    assert.equal(FASTENER_ATTRIBUTE_SPECS.find((row) => row.code === FASTENER_LENGTH_CODE)?.nameFa, 'طول');
    assert.equal(bolt.get(FASTENER_LENGTH_CODE).valueScope, 'TRANSACTION');
    assert.equal(bolt.get(FASTENER_LENGTH_CODE).isRequired, true);
    assert.equal(bolt.get(FASTENER_LENGTH_CODE).overrideMin, FASTENER_LENGTH_MIN_MM);
    assert.equal(bolt.get(FASTENER_LENGTH_CODE).overrideMax, FASTENER_LENGTH_MAX_MM);
    assert.equal(bolt.has('sheet_length'), false);
    assert.equal(bolt.has('fastener_length'), false);
    assert.equal(bolt.get(FASTENER_COATING_CODE).valueScope, 'TRANSACTION');
    assert.equal(bolt.get(FASTENER_COATING_CODE).isRequired, false);

    assert.equal(nut.has(FASTENER_LENGTH_CODE), false);
    assert.equal(nut.get(FASTENER_COATING_CODE).isRequired, false);

    assert.equal(washer.has(FASTENER_LENGTH_CODE), false);
    assert.equal(washer.has(FASTENER_COATING_CODE), false);
    assert.equal(washer.get(FASTENER_GRADE_CODE).overrideAllowedValues, FASTENER_WASHER_GRADES);

    assert.equal(star.get(FASTENER_TOOTH_STYLE_CODE).valueScope, 'TRANSACTION');
    assert.equal(star.get(FASTENER_TOOTH_STYLE_CODE).isRequired, false);
    assert.equal(washer.has(FASTENER_TOOTH_STYLE_CODE), false);

    assert.equal(drill.get(FASTENER_LENGTH_CODE).isRequired, true);
    assert.equal(drill.get(FASTENER_GRADE_CODE).overrideAllowedValues, FASTENER_SELF_DRILL_GRADES);
    assert.equal(drill.has('head_style'), false);

    assert.equal(FASTENER_SIZE_VALUES[0], 'M3');
    assert.equal(FASTENER_SIZE_VALUES.at(-1), 'M36');
    assert.equal(FASTENER_SIZE_VALUES.length, 17);
    assert.equal(fastenerFamily('پیچ متری'), FASTENER_FAMILY.bolt);
    assert.equal(fastenerFamily('لوله مانیسمان'), null);
    assert.equal(sameFastenerName('پیچ شش‌گوش آچاری', 'پیچ شش‌گوش آچاری'), true);
  });

  it('display name is type + grade only (size/length/coating omitted)', () => {
    const rule = fastenerDisplayNameRule({ gradeId: 'attr_fgrd' });
    const name = buildDisplayNameFromRule(rule, {
      sources: { type: 'پیچ شش‌گوش آچاری' },
      attributes: {
        attr_fgrd: { nameFa: 'کلاس مقاومت', displayValue: '8.8' },
      },
    });
    assert.equal(name, 'پیچ شش‌گوش آچاری ۸.۸');
    assert.equal(rule.tokens.every((token) => token.includeLabel === false), true);
    assert.equal(rule.tokens.some((token) => token.attributeId && token.attributeId !== 'attr_fgrd'), false);
  });
});
