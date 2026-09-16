import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isAllowedSubsetEnum, resolveOrderEnumOptions, resolveTypeAllowedValues } from '../domain/productMaster/allowedAttributeValues.js';
import { normalizeOverrideAllowedValues } from '../domain/productMaster/attributeBindingPolicy.js';

const CATALOG = [
  { value: 'ST37', labelFa: 'ST37' },
  { value: 'A36', labelFa: 'A36' },
  { value: 'A283', labelFa: 'A283' },
];

describe('resolveTypeAllowedValues (DDL-46)', () => {
  it('inherits the catalog when override is empty', () => {
    assert.deepEqual(resolveTypeAllowedValues(CATALOG, []), CATALOG);
    assert.deepEqual(resolveTypeAllowedValues(CATALOG, null), CATALOG);
  });

  it('keeps catalog order for a type subset', () => {
    assert.deepEqual(resolveTypeAllowedValues(CATALOG, ['A36', 'ST37']), [
      { value: 'ST37', labelFa: 'ST37' },
      { value: 'A36', labelFa: 'A36' },
    ]);
  });
});

describe('normalizeOverrideAllowedValues', () => {
  const definition = { dataType: 'ENUM', allowedValues: CATALOG };

  it('stores null when the full catalog is selected', () => {
    assert.equal(normalizeOverrideAllowedValues(definition, ['ST37', 'A36', 'A283']), null);
  });

  it('keeps a real subset', () => {
    assert.deepEqual(normalizeOverrideAllowedValues(definition, ['A36', 'ST37']), ['A36', 'ST37']);
  });

  it('rejects a value outside the catalog', () => {
    assert.throws(
      () => normalizeOverrideAllowedValues(definition, ['X70']),
      (err) => err.code === 'ATTRIBUTE_ENUM_INVALID',
    );
  });
});

describe('allowedAttributeValues (DDL-45 compat)', () => {
  it('treats only optional ENUM bindings as product-level allowed-subset', () => {
    assert.equal(isAllowedSubsetEnum({ dataType: 'ENUM' }, { isRequired: false }), true);
    assert.equal(isAllowedSubsetEnum({ dataType: 'ENUM' }, { isRequired: true }), false);
  });

  it('falls back to the catalog when the product subset is empty', () => {
    assert.deepEqual(resolveOrderEnumOptions(CATALOG, []), CATALOG);
  });

  it('filters the catalog to the product subset', () => {
    assert.deepEqual(resolveOrderEnumOptions(CATALOG, ['A36']), [{ value: 'A36', labelFa: 'A36' }]);
  });
});
