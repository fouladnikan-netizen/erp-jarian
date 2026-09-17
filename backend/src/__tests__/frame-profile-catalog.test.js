/**
 * Door-frame profile identity matrix (operator catalog, not a second SoR).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildDisplayNameFromRule } from '../domain/productMaster/displayNameRule.js';
import {
  FRAME_PROFILE_MODELS,
  FRAME_PROFILE_MODEL_OPTIONS,
  frameProfileDisplayNameRule,
  frameProfileIdentityRows,
} from '../domain/productMaster/frameProfileCatalog.js';

describe('frameProfileCatalog', () => {
  it('pairs mill models with thickness and mill bar length', () => {
    assert.equal(FRAME_PROFILE_MODELS.length, 7);
    assert.equal(FRAME_PROFILE_MODEL_OPTIONS.length, 7);
    const rows = frameProfileIdentityRows();
    assert.equal(rows.length, 17);
    assert.equal(rows.filter((row) => row.millLength === 6).length, 9);
    assert.equal(rows.filter((row) => row.millLength === 6.6).length, 8);
    assert.deepEqual(rows[0], { model: 'سپری 507', thickness: 1.5, millLength: 6 });
    assert.deepEqual(rows.at(-1), { model: 'چهارچوب مکزیکی', thickness: 2.5, millLength: 6.6 });
    assert.equal(rows.some((row) => row.model === 'چهارچوب فرانسوی' && row.thickness === 1.5), false);
    assert.equal(rows.some((row) => row.model === 'سپری 507' && row.thickness === 2.5 && row.millLength === 6), true);
    assert.equal(FRAME_PROFILE_MODELS.some((item) => item.value === 'plain' || item.value === 'roman'), false);
  });

  it('does not prefix names with the Product Type title پروفیل چهارچوب', () => {
    const rule = frameProfileDisplayNameRule({
      modelId: 'model',
      thicknessId: 'thk',
      lengthId: 'len',
    });
    assert.equal(rule.tokens.some((token) => token.sourceType === 'type'), false);
    const roman = buildDisplayNameFromRule(rule, {
      sources: { type: 'پروفیل چهارچوب' },
      attributes: {
        model: { nameFa: 'مدل', displayValue: 'چهارچوب رومی' },
        thk: { nameFa: 'ضخامت', displayValue: '2', unitLabel: 'میل' },
        len: { nameFa: 'طول', displayValue: '6.6', unitLabel: 'متری' },
      },
    });
    const tee = buildDisplayNameFromRule(rule, {
      sources: { type: 'پروفیل چهارچوب' },
      attributes: {
        model: { nameFa: 'مدل', displayValue: 'سپری 507' },
        thk: { nameFa: 'ضخامت', displayValue: '1.5', unitLabel: 'میل' },
        len: { nameFa: 'طول', displayValue: '6', unitLabel: 'متری' },
      },
    });
    assert.equal(roman, 'چهارچوب رومی ضخامت ۲ میل شاخه ۶.۶ متری');
    assert.equal(tee, 'سپری ۵۰۷ ضخامت ۱.۵ میل شاخه ۶ متری');
    assert.equal(roman.includes('پروفیل'), false);
    assert.equal(tee.includes('پروفیل'), false);
  });
});

