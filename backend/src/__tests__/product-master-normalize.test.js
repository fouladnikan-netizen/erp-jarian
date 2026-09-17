/**
 * Pure unit tests for Product Master normalization/identity helpers (DDL-24c).
 * No DB required.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  toAsciiDigits, toPersianDigits, formatProductDisplayText, normalizeNumericValue, normalizeTextValue, normalizeAttributeValue,
  buildCanonicalIdentityKey, normalizeBrandName, tokenOverlapSimilarity,
  prepareAttributeDefinitionInput, prepareAttributeDefinitionPatch, slugAttributeCode, isNumericAttributeType,
} from '../domain/productMaster/normalize.js';
import { pad2 } from '../domain/productMaster/taxonomyCode.js';
import { buildGeneratedName, resolveEnumDisplayValue } from '../domain/productMaster/nameGenerator.js';
import { validateWeightProfile } from '../domain/productMaster/weightProfile.js';
import { applyAttributeBindingPolicy } from '../domain/productMaster/attributeBindingPolicy.js';

describe('toPersianDigits / formatProductDisplayText (DDL-67)', () => {
  it('converts Latin digits and leaves letters/units intact', () => {
    assert.equal(toPersianDigits('304L'), '۳۰۴L');
    assert.equal(toPersianDigits('2.5 میل'), '۲.۵ میل');
    assert.equal(toPersianDigits('1500×3000'), '۱۵۰۰×۳۰۰۰');
  });
  it('converts Arabic-Indic digits and is idempotent for Persian', () => {
    assert.equal(toPersianDigits('١٢٣'), '۱۲۳');
    assert.equal(toPersianDigits('ضخامت ۲ میل'), 'ضخامت ۲ میل');
  });
  it('formatProductDisplayText folds mixed digit scripts to Persian only', () => {
    assert.equal(formatProductDisplayText('ورق استیل 304L ضخامت ۲ میل 1500×3000'), 'ورق استیل ۳۰۴L ضخامت ۲ میل ۱۵۰۰×۳۰۰۰');
    assert.equal(formatProductDisplayText(null), '');
    assert.match(formatProductDisplayText('ضخامت 6 میل'), /^[^0-9]*$/);
  });
});

describe('toAsciiDigits', () => {
  it('converts Persian digits', () => assert.equal(toAsciiDigits('۱۲۳'), '123'));
  it('converts Arabic-Indic digits', () => assert.equal(toAsciiDigits('١٢٣'), '123'));
  it('leaves non-digit text untouched', () => assert.equal(toAsciiDigits('ورق ۶ میل'), 'ورق 6 میل'));
});

describe('normalizeNumericValue — Persian/Latin numeric variants must be equal (P0)', () => {
  it('2, 2.0, 2.00 all normalize the same', () => {
    const a = normalizeNumericValue('2');
    const b = normalizeNumericValue('2.0');
    const c = normalizeNumericValue('2.00');
    assert.equal(a, b);
    assert.equal(b, c);
  });
  it('۲ (Persian) and 2 (Latin) normalize the same', () => {
    assert.equal(normalizeNumericValue('۲'), normalizeNumericValue('2'));
  });
  it('۲.۰ (Persian decimal) equals 2', () => {
    assert.equal(normalizeNumericValue('۲.۰'), normalizeNumericValue('2'));
  });
  it('different numbers normalize differently', () => {
    assert.notEqual(normalizeNumericValue('6'), normalizeNumericValue('8'));
  });
  it('non-numeric input returns null', () => {
    assert.equal(normalizeNumericValue('abc'), null);
    assert.equal(normalizeNumericValue(''), null);
    assert.equal(normalizeNumericValue(null), null);
  });
});

describe('normalizeAttributeValue by dataType', () => {
  it('DECIMAL normalizes numeric text', () => {
    const { normalized, storage } = normalizeAttributeValue('DECIMAL', '6.00');
    assert.equal(normalized, '6');
    assert.equal(storage.valueNumber, 6);
  });
  it('BOOLEAN normalizes true/false variants', () => {
    assert.equal(normalizeAttributeValue('BOOLEAN', true).normalized, '1');
    assert.equal(normalizeAttributeValue('BOOLEAN', 'بله').normalized, '1');
    assert.equal(normalizeAttributeValue('BOOLEAN', 'خیر').normalized, '0');
  });
  it('STRING/ENUM normalizes case+whitespace', () => {
    assert.equal(normalizeAttributeValue('STRING', '  Foo  Bar ').normalized, 'foo bar');
  });
});

describe('buildCanonicalIdentityKey — identity depends only on Type + identity-relevant attrs', () => {
  it('order of entries does not change the key', () => {
    const k1 = buildCanonicalIdentityKey('typeA', [
      { code: 'width', normalized: '1250' },
      { code: 'thickness', normalized: '6' },
    ]);
    const k2 = buildCanonicalIdentityKey('typeA', [
      { code: 'thickness', normalized: '6' },
      { code: 'width', normalized: '1250' },
    ]);
    assert.equal(k1, k2);
  });
  it('different Product Type never collides even with identical attribute values', () => {
    const k1 = buildCanonicalIdentityKey('typeA', [{ code: 'thickness', normalized: '6' }]);
    const k2 = buildCanonicalIdentityKey('typeB', [{ code: 'thickness', normalized: '6' }]);
    assert.notEqual(k1, k2);
  });
  it('empty/null normalized entries are excluded (do not pollute the key)', () => {
    const k1 = buildCanonicalIdentityKey('typeA', [{ code: 'thickness', normalized: '6' }, { code: 'width', normalized: null }]);
    const k2 = buildCanonicalIdentityKey('typeA', [{ code: 'thickness', normalized: '6' }]);
    assert.equal(k1, k2);
  });
});

describe('buildGeneratedName', () => {
  it('formats Type + ordered display attributes with unit labels', () => {
    const name = buildGeneratedName('ورق سیاه', [
      { nameFa: 'عرض', sortOrder: 2, displayValue: 1250, unitLabel: 'mm' },
      { nameFa: 'ضخامت', sortOrder: 1, displayValue: 6, unitLabel: 'mm' },
    ]);
    assert.equal(name, 'ورق سیاه | ضخامت: ۶ mm | عرض: ۱۲۵۰ mm');
  });
  it('falls back to bare Type name when no display attributes', () => {
    assert.equal(buildGeneratedName('ورق سیاه', []), 'ورق سیاه');
  });
  it('omits kind name prefix and silent معمولی', () => {
    const light = buildGeneratedName('ناودانی', [
      { nameFa: 'سایز', sortOrder: 20, displayValue: 8, unitLabel: null },
      { nameFa: 'نوع', sortOrder: 10, displayValue: 'سبک', omitName: true },
    ]);
    assert.equal(light, 'ناودانی | سبک | سایز: ۸');
    const plain = buildGeneratedName('ناودانی', [
      { nameFa: 'سایز', sortOrder: 20, displayValue: 8, unitLabel: null },
      { nameFa: 'نوع', sortOrder: 10, displayValue: '', omitName: true },
    ]);
    assert.equal(plain, 'ناودانی | سایز: ۸');
  });
  it('omits ral name prefix so the color label stands alone', () => {
    const name = buildGeneratedName('ورق گالوانیزه رنگی', [
      { nameFa: 'ضخامت', sortOrder: 10, displayValue: '0.5', unitLabel: null },
      { nameFa: 'رال', sortOrder: 30, displayValue: 'سفید رال ۹۰۱۶', omitName: true },
    ]);
    assert.equal(name, 'ورق گالوانیزه رنگی | ضخامت: ۰.۵ | سفید رال ۹۰۱۶');
  });
});

describe('resolveEnumDisplayValue', () => {
  const catalog = [
    { value: 'plain', labelFa: 'معمولی' },
    { value: 'light', labelFa: 'سبک' },
    { value: 'europe', labelFa: 'هم وزن اروپا' },
  ];
  it('uses Persian labels and omits معمولی from the display name', () => {
    assert.equal(resolveEnumDisplayValue(catalog, 'plain'), '');
    assert.equal(resolveEnumDisplayValue(catalog, 'light'), 'سبک');
    assert.equal(resolveEnumDisplayValue(catalog, 'europe'), 'هم وزن اروپا');
    assert.equal(resolveEnumDisplayValue(
      [{ value: 'معمولی', labelFa: 'معمولی' }, { value: 'سبک', labelFa: 'سبک' }],
      'معمولی',
    ), '');
    assert.equal(resolveEnumDisplayValue(
      [{ value: 'معمولی', labelFa: 'معمولی' }, { value: 'سبک', labelFa: 'سبک' }],
      'سبک',
    ), 'سبک');
  });
});

describe('pad2 (taxonomy/SKU code formatting)', () => {
  it('pads single digits', () => assert.equal(pad2(1), '01'));
  it('leaves two digits untouched', () => assert.equal(pad2(42), '42'));
});

describe('normalizeBrandName + tokenOverlapSimilarity (Brand duplicate detection)', () => {
  it('normalizes case/whitespace/punctuation', () => {
    assert.equal(normalizeBrandName('  فولاد   مبارکه!  '), 'فولاد مبارکه');
  });
  it('detects high overlap for a superset name (مبارکه vs فولاد مبارکه اصفهان)', () => {
    const score = tokenOverlapSimilarity('مبارکه', 'فولاد مبارکه اصفهان');
    assert.ok(score > 0, `expected positive overlap, got ${score}`);
  });
  it('unrelated names score low', () => {
    const score = tokenOverlapSimilarity('فولاد مبارکه', 'ذوب آهن اصفهان');
    assert.ok(score < 0.3, `expected low overlap, got ${score}`);
  });
});

describe('validateWeightProfile', () => {
  it('accepts FIXED with positive weightPerUnit', () => {
    assert.doesNotThrow(() => validateWeightProfile('FIXED', { weightPerUnit: 12.5 }));
  });
  it('rejects FIXED with missing weightPerUnit', () => {
    assert.throws(() => validateWeightProfile('FIXED', {}));
  });
  it('accepts PER_LENGTH with weightPerMeter', () => {
    assert.doesNotThrow(() => validateWeightProfile('PER_LENGTH', { weightPerMeter: 15.8 }));
  });
  it('accepts DIMENSIONAL with density', () => {
    assert.doesNotThrow(() => validateWeightProfile('DIMENSIONAL', { densityKgPerM3: 7850 }));
  });
  it('accepts MANUAL_ACTUAL with empty coefficients', () => {
    assert.doesNotThrow(() => validateWeightProfile('MANUAL_ACTUAL', {}));
  });
  it('rejects unknown profile type', () => {
    assert.throws(() => validateWeightProfile('UNKNOWN', {}));
  });
});

describe('normalizeTextValue', () => {
  it('collapses internal whitespace and trims', () => {
    assert.equal(normalizeTextValue('  ورق   سیاه  '), 'ورق سیاه');
  });
});

describe('prepareAttributeDefinitionInput — RTL name/code mix-up', () => {
  it('slugs Size to size', () => {
    assert.equal(slugAttributeCode('Size'), 'size');
    const out = prepareAttributeDefinitionInput({ code: 'Size', nameFa: 'سایز', dataType: 'INTEGER' });
    assert.equal(out.code, 'size');
    assert.equal(out.nameFa, 'سایز');
    assert.equal(out.dataType, 'DECIMAL');
  });
  it('swaps when Persian was typed into the code field', () => {
    const out = prepareAttributeDefinitionInput({ code: 'سایز', nameFa: 'size', dataType: 'INTEGER' });
    assert.equal(out.code, 'size');
    assert.equal(out.nameFa, 'سایز');
    assert.equal(out.dataType, 'DECIMAL');
  });
});

describe('prepareAttributeDefinitionPatch', () => {
  it('slugs code and coerces INTEGER without touching omitted fields', () => {
    const out = prepareAttributeDefinitionPatch({ code: 'Weight_Class', dataType: 'INTEGER' });
    assert.equal(out.code, 'weight_class');
    assert.equal(out.dataType, 'DECIMAL');
    assert.equal(Object.prototype.hasOwnProperty.call(out, 'nameFa'), false);
  });
});

describe('INTEGER is an alias of DECIMAL (DDL-24o)', () => {
  it('isNumericAttributeType covers DECIMAL and legacy INTEGER', () => {
    assert.equal(isNumericAttributeType('DECIMAL'), true);
    assert.equal(isNumericAttributeType('INTEGER'), true);
    assert.equal(isNumericAttributeType('STRING'), false);
  });
  it('fractional values normalize for both DECIMAL and INTEGER', () => {
    assert.equal(normalizeAttributeValue('DECIMAL', '6.5').normalized, '6.5');
    assert.equal(normalizeAttributeValue('INTEGER', '6.5').normalized, '6.5');
  });
});

describe('applyAttributeBindingPolicy (DDL-46 / DDL-49)', () => {
  it('does not derive identity from required', () => {
    const requiredNumeric = applyAttributeBindingPolicy({ isRequired: true, dataType: 'DECIMAL' });
    assert.equal(requiredNumeric.isRequired, true);
    assert.equal(requiredNumeric.isIdentityRelevant, true);
    assert.equal(requiredNumeric.valueScope, 'PRODUCT');
    assert.equal(requiredNumeric.isDisplayRelevant, true);

    const optionalNumeric = applyAttributeBindingPolicy({ isRequired: false, dataType: 'DECIMAL' });
    assert.equal(optionalNumeric.isRequired, false);
    assert.equal(optionalNumeric.isIdentityRelevant, true);

    const requiredEnum = applyAttributeBindingPolicy({ isRequired: true, dataType: 'ENUM' });
    assert.equal(requiredEnum.isRequired, true);
    assert.equal(requiredEnum.isIdentityRelevant, true);

    const optionalEnum = applyAttributeBindingPolicy({ isRequired: false, dataType: 'ENUM' });
    assert.equal(optionalEnum.isIdentityRelevant, false);
  });
  it('rejects required STRING on an active PRODUCT binding', () => {
    assert.throws(
      () => applyAttributeBindingPolicy({ isRequired: true, dataType: 'STRING' }),
      (err) => err.code === 'ATTRIBUTE_REQUIRED_TYPE_INVALID',
    );
  });
  it('allows deactivating a legacy required STRING binding', () => {
    const row = applyAttributeBindingPolicy({ isActive: false }, { isRequired: true, dataType: 'STRING', valueScope: 'PRODUCT' });
    assert.equal(row.isActive, false);
  });
  it('ignores client isIdentityRelevant and uses the numeric PRODUCT rule', () => {
    const forced = applyAttributeBindingPolicy({ dataType: 'STRING', isIdentityRelevant: true });
    assert.equal(forced.isIdentityRelevant, false);
    const denied = applyAttributeBindingPolicy({ dataType: 'DECIMAL', isIdentityRelevant: false });
    assert.equal(denied.isIdentityRelevant, true);
  });
  it('allows TRANSACTION that is required, but never identity', () => {
    const row = applyAttributeBindingPolicy({ valueScope: 'TRANSACTION', isRequired: true, dataType: 'DECIMAL' });
    assert.equal(row.valueScope, 'TRANSACTION');
    assert.equal(row.attributeRole, 'TRANSACTION_ONLY');
    assert.equal(row.isRequired, true);
    assert.equal(row.isIdentityRelevant, false);
  });
  it('coerces TRANSACTION identity requests to false instead of rejecting', () => {
    const row = applyAttributeBindingPolicy({ valueScope: 'TRANSACTION', isIdentityRelevant: true, dataType: 'DECIMAL' });
    assert.equal(row.isIdentityRelevant, false);
    assert.equal(row.valueScope, 'TRANSACTION');
  });
  it('maps legacy attributeRole to valueScope', () => {
    const row = applyAttributeBindingPolicy({ attributeRole: 'TRANSACTION_ONLY', isRequired: false });
    assert.equal(row.valueScope, 'TRANSACTION');
    assert.equal(row.attributeRole, 'TRANSACTION_ONLY');
  });
});
