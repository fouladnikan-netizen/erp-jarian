/**
 * Product Type display-name rule (DDL-52). Not SKU.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  annotateDisplayNameTokens,
  bindingKindBadge,
  buildDisplayNameFromRule,
  normalizeDisplayNameRule,
  previewDisplayName,
} from '../domain/productMaster/displayNameRule.js';

const STAINLESS = {
  separator: ' ',
  tokens: [
    { sourceType: 'type', order: 0 },
    { sourceType: 'attribute', attributeId: 'attr_grade', order: 1 },
    { sourceType: 'attribute', attributeId: 'attr_thk', includeLabel: true, order: 2 },
    { sourceType: 'attribute', attributeId: 'attr_dim', order: 3 },
  ],
};

describe('displayNameRule', () => {
  it('builds ورق استیل ۳۰۴L ضخامت ۲ میل ۱۵۰۰×۳۰۰۰', () => {
    const name = buildDisplayNameFromRule(STAINLESS, {
      sources: { type: 'ورق استیل' },
      attributes: {
        attr_grade: { nameFa: 'گرید', displayValue: '304L' },
        attr_thk: { nameFa: 'ضخامت', displayValue: '2', unitLabel: 'میل' },
        attr_dim: { nameFa: 'ابعاد', displayValue: '1500×3000' },
      },
    });
    assert.equal(name, 'ورق استیل ۳۰۴L ضخامت ۲ میل ۱۵۰۰×۳۰۰۰');
    assert.equal(/[0-9]/.test(name), false);
    assert.equal(/[٠-٩]/.test(name), false);
  });

  it('omits empty optional attributes and leftover separators', () => {
    const name = buildDisplayNameFromRule({
      separator: '-',
      tokens: [
        { sourceType: 'type' },
        { sourceType: 'attribute', attributeId: 'attr_grade' },
        { sourceType: 'attribute', attributeId: 'attr_thk' },
        { sourceType: 'attribute', attributeId: 'attr_brand' },
      ],
    }, {
      sources: { type: 'ورق سیاه' },
      attributes: {
        attr_grade: { nameFa: 'گرید', displayValue: '' },
        attr_thk: { nameFa: 'ضخامت', displayValue: '3', unitLabel: 'میل' },
        attr_brand: { nameFa: 'برند', displayValue: null },
      },
    });
    assert.equal(name, 'ورق سیاه - ۳ میل');
    assert.equal(name.includes('--'), false);
    assert.equal(name.includes('undefined'), false);
  });

  it('keeps missing attribute tokens invalid until the user removes them', () => {
    const annotated = annotateDisplayNameTokens({
      tokens: [
        { sourceType: 'type' },
        { sourceType: 'attribute', attributeId: 'gone' },
      ],
    }, {
      schema: [{ definition: { id: 'attr_thk', nameFa: 'ضخامت' }, binding: { isRequired: true, valueScope: 'PRODUCT', isActive: true } }],
    });
    assert.equal(annotated[1].invalid, true);
    assert.equal(annotated[1].badge.label, 'نامعتبر');
    const preview = previewDisplayName({
      tokens: [
        { sourceType: 'type' },
        { sourceType: 'attribute', attributeId: 'gone' },
        { sourceType: 'attribute', attributeId: 'attr_thk', includeLabel: true },
      ],
    }, {
      sources: { type: 'ورق سیاه' },
      attributes: { attr_thk: { nameFa: 'ضخامت', unitLabel: 'میل' } },
    });
    assert.equal(preview, 'ورق سیاه ضخامت {ضخامت} میل');
  });

  it('does not store Persian labels and drops unknown source types', () => {
    const rule = normalizeDisplayNameRule({
      separator: '·',
      tokens: [
        { sourceType: 'type', labelFa: 'نوع' },
        { sourceType: 'nope' },
        { sourceType: 'attribute', attributeId: 'attr_thk', nameFa: 'ضخامت' },
      ],
    });
    assert.deepEqual(rule, {
      separator: '·',
      tokens: [
        { sourceType: 'type', includeLabel: false, order: 0 },
        { sourceType: 'attribute', attributeId: 'attr_thk', includeLabel: false, includeUnit: true, order: 1 },
      ],
    });
  });

  it('prefixes the field title only when includeLabel is on', () => {
    const off = buildDisplayNameFromRule({
      tokens: [
        { sourceType: 'type' },
        { sourceType: 'attribute', attributeId: 'attr_thk' },
      ],
    }, {
      sources: { type: 'ورق سیاه' },
      attributes: { attr_thk: { nameFa: 'ضخامت', displayValue: '3', unitLabel: 'میل' } },
    });
    const on = buildDisplayNameFromRule({
      tokens: [
        { sourceType: 'type', includeLabel: true },
        { sourceType: 'attribute', attributeId: 'attr_thk', includeLabel: true },
      ],
    }, {
      sources: { type: 'ورق سیاه' },
      attributes: { attr_thk: { nameFa: 'ضخامت', displayValue: '3', unitLabel: 'میل' } },
    });
    assert.equal(off, 'ورق سیاه ۳ میل');
    assert.equal(on, 'نوع ورق سیاه ضخامت ۳ میل');
  });

  it('omits the registry unit when includeUnit is off, independently of includeLabel', () => {
    const name = buildDisplayNameFromRule({
      tokens: [
        { sourceType: 'type' },
        { sourceType: 'attribute', attributeId: 'attr_thk', includeLabel: true, includeUnit: false },
      ],
    }, {
      sources: { type: 'ورق سیاه' },
      attributes: { attr_thk: { nameFa: 'ضخامت', displayValue: '3', unitLabel: 'میل' } },
    });
    assert.equal(name, 'ورق سیاه ضخامت ۳');
  });

  it('does not persist unit labels inside the rule JSON', () => {
    const rule = normalizeDisplayNameRule({
      tokens: [
        { sourceType: 'attribute', attributeId: 'attr_size', includeUnit: true, unitLabel: 'اینچ' },
      ],
    });
    assert.equal(rule.tokens[0].includeUnit, true);
    assert.equal(Object.prototype.hasOwnProperty.call(rule.tokens[0], 'unitLabel'), false);
  });

  it('stores catalog literal ids, not Persian glue text', () => {
    const rule = normalizeDisplayNameRule({
      tokens: [
        { sourceType: 'type' },
        { sourceType: 'literal', literalId: 'branch', text: 'شاخه' },
        { sourceType: 'attribute', attributeId: 'attr_len' },
        { sourceType: 'literal', literalId: 'nope' },
      ],
    });
    assert.deepEqual(rule.tokens.map((row) => row.sourceType), ['type', 'literal', 'attribute']);
    assert.equal(rule.tokens[1].literalId, 'branch');
    assert.equal(Object.prototype.hasOwnProperty.call(rule.tokens[1], 'text'), false);
  });

  it('allows the same join literal twice and concatenates width × height', () => {
    const name = buildDisplayNameFromRule({
      tokens: [
        { sourceType: 'attribute', attributeId: 'w' },
        { sourceType: 'literal', literalId: 'times' },
        { sourceType: 'attribute', attributeId: 'h' },
      ],
    }, {
      attributes: {
        w: { nameFa: 'عرض', displayValue: '1500' },
        h: { nameFa: 'ارتفاع', displayValue: '3000' },
      },
    });
    assert.equal(name, '۱۵۰۰×۳۰۰۰');
  });

  it('puts prefix literals before the next value and drops them when that value is empty', () => {
    const filled = buildDisplayNameFromRule({
      tokens: [
        { sourceType: 'type' },
        { sourceType: 'literal', literalId: 'branch' },
        { sourceType: 'attribute', attributeId: 'attr_len' },
      ],
    }, {
      sources: { type: 'میلگرد آجدار' },
      attributes: { attr_len: { nameFa: 'طول', displayValue: '12', unitLabel: 'متر' } },
    });
    const empty = buildDisplayNameFromRule({
      tokens: [
        { sourceType: 'type' },
        { sourceType: 'literal', literalId: 'branch' },
        { sourceType: 'attribute', attributeId: 'attr_len' },
      ],
    }, {
      sources: { type: 'میلگرد آجدار' },
      attributes: { attr_len: { nameFa: 'طول', displayValue: '' } },
    });
    assert.equal(filled, 'میلگرد آجدار شاخه ۱۲ متر');
    assert.equal(empty, 'میلگرد آجدار');
  });

  it('drops a join literal when one side is empty', () => {
    const name = buildDisplayNameFromRule({
      tokens: [
        { sourceType: 'attribute', attributeId: 'w' },
        { sourceType: 'literal', literalId: 'times' },
        { sourceType: 'attribute', attributeId: 'h' },
      ],
    }, {
      attributes: {
        w: { nameFa: 'عرض', displayValue: '1500' },
        h: { nameFa: 'ارتفاع', displayValue: '' },
      },
    });
    assert.equal(name, '۱۵۰۰');
    assert.equal(name.includes('×'), false);
  });

  it('labels binding kinds for the builder badges', () => {
    assert.equal(bindingKindBadge({ isRequired: true, valueScope: 'PRODUCT' }).label, 'الزامی');
    assert.equal(bindingKindBadge({ isRequired: true, valueScope: 'TRANSACTION' }).label, 'کنشی');
    assert.equal(bindingKindBadge({ isRequired: false, valueScope: 'TRANSACTION' }).label, 'اختیاری');
  });
});
