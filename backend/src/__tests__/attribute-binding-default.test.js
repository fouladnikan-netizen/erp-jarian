/**
 * Binding display default (DDL-55). Not Product identity.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeOverrideAllowedValues,
  normalizeOverrideDefaultValue,
  reconcileOverrideAllowedValues,
  reconcileOverrideDefaultValue,
  remapOrphanEnumValue,
  shouldPersistMissingBindingValue,
} from '../domain/productMaster/attributeBindingPolicy.js';

describe('normalizeOverrideDefaultValue', () => {
  it('clears empty values and keeps a numeric mill length', () => {
    assert.equal(normalizeOverrideDefaultValue({ dataType: 'DECIMAL' }, ''), null);
    assert.equal(normalizeOverrideDefaultValue({ dataType: 'DECIMAL' }, ' 12 '), '12');
  });

  it('rejects an ENUM default outside the type list', () => {
    assert.throws(() => normalizeOverrideDefaultValue(
      { dataType: 'ENUM', allowedValues: [{ value: 'A3', labelFa: 'A3' }] },
      'A4',
    ), (err) => err.code === 'ATTRIBUTE_DEFAULT_INVALID');
    assert.equal(normalizeOverrideDefaultValue(
      { dataType: 'ENUM', allowedValues: [{ value: 'A3', labelFa: 'A3' }] },
      'A3',
    ), 'A3');
  });
});

describe('reconcileOverrideDefaultValue', () => {
  const kind = {
    dataType: 'ENUM',
    allowedValues: [
      { value: 'سبک', labelFa: 'سبک' },
      { value: 'سنگین', labelFa: 'سنگین' },
      { value: 'معمولی', labelFa: 'معمولی' },
    ],
  };

  it('remaps a known latin default onto the Persian catalog', () => {
    assert.equal(reconcileOverrideDefaultValue(kind, 'heavy', ['سبک', 'سنگین']), 'سنگین');
    assert.equal(reconcileOverrideDefaultValue(kind, 'light', ['سبک', 'سنگین']), 'سبک');
  });

  it('drops an unknown latin default that has no catalog alias', () => {
    assert.equal(reconcileOverrideDefaultValue(kind, 'orphan_kind', ['سبک', 'سنگین']), null);
  });

  it('keeps a catalog default that is still in the subset', () => {
    assert.equal(reconcileOverrideDefaultValue(kind, 'سنگین', ['سبک', 'سنگین']), 'سنگین');
  });

  it('rejects a catalog default that is outside the new subset', () => {
    assert.throws(
      () => reconcileOverrideDefaultValue(kind, 'معمولی', ['سبک', 'سنگین']),
      (err) => err.code === 'ATTRIBUTE_DEFAULT_INVALID',
    );
  });
});

describe('reconcileOverrideAllowedValues', () => {
  const kind = {
    dataType: 'ENUM',
    allowedValues: [
      { value: 'پرسی', labelFa: 'پرسی' },
      { value: 'فابریک', labelFa: 'فابریک' },
      { value: 'معمولی', labelFa: 'معمولی' },
      { value: 'سختی ۴۰۰', labelFa: 'سختی ۴۰۰' },
      { value: 'سختی ۴۵۰', labelFa: 'سختی ۴۵۰' },
      { value: 'سختی ۵۰۰', labelFa: 'سختی ۵۰۰' },
    ],
  };

  it('remaps a stale latin subset onto the Persian catalog', () => {
    assert.deepEqual(reconcileOverrideAllowedValues(kind, ['pressed', 'mill']), ['پرسی', 'فابریک']);
    assert.deepEqual(
      reconcileOverrideAllowedValues(kind, ['hardness_400', 'hardness_450', 'hardness_500']),
      ['سختی ۴۰۰', 'سختی ۴۵۰', 'سختی ۵۰۰'],
    );
  });

  it('inherits the catalog when every override value is an unknown leftover', () => {
    assert.equal(reconcileOverrideAllowedValues(kind, ['gone', 'missing']), null);
  });

  it('does not remap mill when mill is still a catalog value', () => {
    const supply = {
      dataType: 'ENUM',
      allowedValues: [
        { value: 'mill', labelFa: 'شیت فابریک' },
        { value: 'roll', labelFa: 'رول' },
      ],
    };
    assert.equal(remapOrphanEnumValue(supply, 'mill'), 'mill');
    assert.deepEqual(reconcileOverrideAllowedValues(supply, ['mill']), ['mill']);
  });
});

describe('normalizeOverrideAllowedValues', () => {
  const kind = {
    dataType: 'ENUM',
    allowedValues: [
      { value: 'پرسی', labelFa: 'پرسی' },
      { value: 'فابریک', labelFa: 'فابریک' },
      { value: 'معمولی', labelFa: 'معمولی' },
    ],
  };

  it('accepts a latin leftover PATCH by remapping onto the catalog', () => {
    assert.deepEqual(normalizeOverrideAllowedValues(kind, ['pressed', 'mill']), ['پرسی', 'فابریک']);
  });
});

describe('shouldPersistMissingBindingValue', () => {
  it('persists only required PRODUCT fallbacks, not optional or TRANSACTION defaults', () => {
    assert.equal(shouldPersistMissingBindingValue({ valueScope: 'PRODUCT', isRequired: true }), true);
    assert.equal(shouldPersistMissingBindingValue({ valueScope: 'PRODUCT', isRequired: false }), false);
    assert.equal(shouldPersistMissingBindingValue({ valueScope: 'TRANSACTION', isRequired: true }), false);
  });
});
