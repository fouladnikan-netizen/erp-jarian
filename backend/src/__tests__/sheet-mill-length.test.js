/**
 * Mill-sheet millimetre length catalog (DDL-56). Not Product identity.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SHEET_LENGTH_ATTRIBUTE,
  SHEET_LENGTH_BINDING,
  SHEET_LENGTH_CODE,
  SHEET_LENGTH_PHRASE,
  applySheetLengthDisplay,
  millSheetTypeNames,
  sheetMillLengthDefault,
} from '../domain/productMaster/sheetMillLength.js';
import { liveAttributeValuesByCode, resolveBindingDefault } from '../domain/productMaster/allowedAttributeValues.js';
import {
  ensureDisplayNameAttributeToken,
  replaceDisplayNameAttributeToken,
} from '../domain/productMaster/displayNameRule.js';

describe('sheet mill length catalog', () => {
  it('is TRANSACTION millimetre length, never identity', () => {
    assert.equal(SHEET_LENGTH_ATTRIBUTE.code, SHEET_LENGTH_CODE);
    assert.equal(SHEET_LENGTH_ATTRIBUTE.nameFa, 'طول ورق');
    assert.equal(SHEET_LENGTH_ATTRIBUTE.dataType, 'DECIMAL');
    assert.equal(SHEET_LENGTH_BINDING.valueScope, 'TRANSACTION');
    assert.equal(SHEET_LENGTH_BINDING.isRequired, false);
  });

  it('covers mill-sheet Types that count by برگ', () => {
    const names = millSheetTypeNames();
    assert.ok(names.includes('ورق گالوانیزه'));
    assert.ok(names.includes('ورق روغنی'));
    assert.ok(names.includes('ورق گالوانیزه رنگی'));
    assert.ok(names.includes('ورق ساده فولادی'));
    assert.ok(names.includes('ورق استیل ۳۰۴L'));
    assert.ok(names.includes('ورق استیل دابلکس ۲۲۰۵'));
    for (const name of names) {
      assert.match(name, /^ورق/);
    }
  });
});

describe('sheetMillLengthDefault', () => {
  it('applies more-specific width×thickness rules first', () => {
    assert.equal(sheetMillLengthDefault({ width: 2000, thickness: 41 }), 'طول');
    assert.equal(sheetMillLengthDefault({ width: 1500, thickness: 45 }), 'طول');
    assert.equal(sheetMillLengthDefault({ width: 2000, thickness: 40 }), '6000');
    assert.equal(sheetMillLengthDefault({ width: 1250, thickness: 8.1 }), '6000');
    assert.equal(sheetMillLengthDefault({ width: 1250, thickness: 8 }), '2500');
    assert.equal(sheetMillLengthDefault({ width: 1250, thickness: 10 }), '6000');
    assert.equal(sheetMillLengthDefault({ width: 1250, thickness: 0.5 }), '2500');
    assert.equal(sheetMillLengthDefault({ width: 1000, thickness: 0.5 }), '2000');
    assert.equal(sheetMillLengthDefault({ width: 1200 }), '6000');
    assert.equal(sheetMillLengthDefault({ width: 1500, thickness: 8 }), '6000');
    assert.equal(sheetMillLengthDefault({ width: 2000 }), '6000');
  });

  it('returns empty when width is missing or unmatched', () => {
    assert.equal(sheetMillLengthDefault({}), '');
    assert.equal(sheetMillLengthDefault({ width: 1100, thickness: 3 }), '');
  });
});

describe('resolveBindingDefault for sheet_length', () => {
  const definition = { id: 'sl', code: SHEET_LENGTH_CODE, defaultValue: null };
  const binding = { valueScope: 'TRANSACTION', overrideDefaultValue: '3000' };

  it('prefers the catalog over a scalar Type default', () => {
    assert.equal(resolveBindingDefault(definition, binding, {
      liveByCode: { width: 1000, thickness: 0.5 },
    }), '2000');
  });

  it('falls back to the scalar default when no rule matches', () => {
    assert.equal(resolveBindingDefault(definition, binding, {
      liveByCode: { width: 1100, thickness: 3 },
    }), '3000');
  });

  it('uses the phrase طول when thickness is above 40', () => {
    assert.equal(resolveBindingDefault(definition, binding, {
      liveByCode: { width: 2000, thickness: 45 },
    }), SHEET_LENGTH_PHRASE);
    assert.deepEqual(applySheetLengthDisplay({
      code: SHEET_LENGTH_CODE,
      displayValue: SHEET_LENGTH_PHRASE,
      unitLabel: 'میل',
    }), { displayValue: 'طول', unitLabel: null });
  });

  it('returns no mill-sheet length when عرضه is رول', () => {
    assert.equal(resolveBindingDefault(definition, binding, {
      liveByCode: { width: 1000, thickness: 0.5, supply_form: 'roll' },
    }), '');
    assert.equal(sheetMillLengthDefault({
      width: 1000,
      thickness: 0.5,
      supplyForm: 'رول',
    }), '');
  });
});

describe('liveAttributeValuesByCode', () => {
  it('reads stored PRODUCT width and thickness', () => {
    const schema = [
      { definition: { id: 'w', code: 'width' } },
      { definition: { id: 't', code: 'thickness' } },
    ];
    assert.deepEqual(liveAttributeValuesByCode(schema, { w: 1250, t: 12 }), {
      width: 1250,
      thickness: 12,
    });
  });
});

describe('display-name token swap', () => {
  it('replaces meter length with طول ورق and keeps includeUnit', () => {
    const rule = {
      separator: ' ',
      tokens: [
        { sourceType: 'type' },
        { sourceType: 'attribute', attributeId: 'th', includeLabel: true, includeUnit: true },
        { sourceType: 'attribute', attributeId: 'len', includeUnit: true },
      ],
    };
    const next = replaceDisplayNameAttributeToken(rule, 'len', 'sheet');
    assert.equal(next.tokens.find((token) => token.attributeId === 'sheet').includeUnit, true);
    assert.equal(next.tokens.some((token) => token.attributeId === 'len'), false);
  });

  it('inserts طول ورق after width when the rule had no length token', () => {
    const rule = {
      separator: ' ',
      tokens: [
        { sourceType: 'type' },
        { sourceType: 'attribute', attributeId: 'w' },
      ],
    };
    const next = ensureDisplayNameAttributeToken(rule, 'sheet', { afterAttributeId: 'w' });
    assert.deepEqual(next.tokens.map((token) => token.attributeId || token.sourceType), [
      'type', 'w', 'sheet',
    ]);
  });
});
