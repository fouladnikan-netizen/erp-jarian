/**
 * Pure unit tests for Product Master normalization/identity helpers (DDL-24c).
 * No DB required.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  toAsciiDigits, normalizeNumericValue, normalizeTextValue, normalizeAttributeValue,
  buildCanonicalIdentityKey, normalizeBrandName, tokenOverlapSimilarity,
} from '../domain/productMaster/normalize.js';
import { pad2 } from '../domain/productMaster/taxonomyCode.js';
import { buildGeneratedName } from '../domain/productMaster/nameGenerator.js';
import { validateWeightProfile } from '../domain/productMaster/weightProfile.js';

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
    assert.equal(name, 'ورق سیاه | ضخامت: 6 mm | عرض: 1250 mm');
  });
  it('falls back to bare Type name when no display attributes', () => {
    assert.equal(buildGeneratedName('ورق سیاه', []), 'ورق سیاه');
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
