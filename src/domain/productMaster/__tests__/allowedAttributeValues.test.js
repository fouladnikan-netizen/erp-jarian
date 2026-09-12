import { describe, expect, it } from 'vitest';
import {
  bindingDefaultValue,
  isAllowedSubsetEnum,
  orderEnumOptionsForProduct,
  productAttributeDefaults,
  resolveBindingDefault,
  resolveOrderEnumOptions,
  resolveTypeAllowedValues,
  selectedEnumValuesFromOverride,
  transactionAttributeDefaults,
} from '../allowedAttributeValues.js';

const CATALOG = [
  { value: 'ST37', labelFa: 'ST37' },
  { value: 'A283', labelFa: 'A283' },
  { value: 'A36', labelFa: 'A36' },
];

describe('isAllowedSubsetEnum', () => {
  it('is true only for optional ENUM bindings (DDL-45 compat)', () => {
    expect(isAllowedSubsetEnum({ dataType: 'ENUM' }, { isRequired: false })).toBe(true);
    expect(isAllowedSubsetEnum({ dataType: 'ENUM' }, { isRequired: true })).toBe(false);
    expect(isAllowedSubsetEnum({ dataType: 'DECIMAL' }, { isRequired: false })).toBe(false);
  });
});

describe('resolveOrderEnumOptions', () => {
  it('returns the full catalog when the product has no subset', () => {
    expect(resolveOrderEnumOptions(CATALOG, [])).toEqual(CATALOG);
    expect(resolveOrderEnumOptions(CATALOG, null)).toEqual(CATALOG);
  });

  it('keeps catalog order and drops values not on the product', () => {
    expect(resolveOrderEnumOptions(CATALOG, ['A36', 'ST37'])).toEqual([
      { value: 'ST37', labelFa: 'ST37' },
      { value: 'A36', labelFa: 'A36' },
    ]);
  });

  it('drops stale product values that left the catalog', () => {
    expect(resolveOrderEnumOptions(CATALOG, ['GONE', 'A283'])).toEqual([
      { value: 'A283', labelFa: 'A283' },
    ]);
  });
});

describe('orderEnumOptionsForProduct', () => {
  it('reads allowedAttributeValues by definition id', () => {
    const definition = { id: 'attr_grade', allowedValues: CATALOG };
    const product = { allowedAttributeValues: { attr_grade: ['ST37'] } };
    expect(orderEnumOptionsForProduct(product, definition)).toEqual([
      { value: 'ST37', labelFa: 'ST37' },
    ]);
  });

  it('prefers the type-level effective list when a binding is provided', () => {
    const definition = { id: 'attr_grade', allowedValues: CATALOG };
    const binding = { effectiveAllowedValues: [{ value: 'A36', labelFa: 'A36' }] };
    const product = { allowedAttributeValues: { attr_grade: ['ST37'] } };
    expect(orderEnumOptionsForProduct(product, definition, binding)).toEqual([
      { value: 'A36', labelFa: 'A36' },
    ]);
  });
});

describe('resolveTypeAllowedValues', () => {
  it('returns the full catalog when the type has no subset', () => {
    expect(resolveTypeAllowedValues(CATALOG, [])).toEqual(CATALOG);
    expect(resolveTypeAllowedValues(CATALOG, null)).toEqual(CATALOG);
  });

  it('keeps catalog order and drops values not on the type', () => {
    expect(resolveTypeAllowedValues(CATALOG, ['A36', 'ST37'])).toEqual([
      { value: 'ST37', labelFa: 'ST37' },
      { value: 'A36', labelFa: 'A36' },
    ]);
  });
});

describe('selectedEnumValuesFromOverride', () => {
  it('inherits the catalog when the override no longer intersects', () => {
    expect(selectedEnumValuesFromOverride(['پرسی', 'فابریک', 'معمولی'], ['pressed', 'mill']))
      .toEqual(['پرسی', 'فابریک', 'معمولی']);
  });

  it('keeps the intersecting subset', () => {
    expect(selectedEnumValuesFromOverride(['پرسی', 'فابریک', 'معمولی'], ['فابریک']))
      .toEqual(['فابریک']);
  });
});

describe('productAttributeDefaults', () => {
  it('seeds PRODUCT defaults and skips TRANSACTION attributes', () => {
    expect(productAttributeDefaults([
      {
        definition: { id: 'kind', defaultValue: null },
        binding: { valueScope: 'PRODUCT', overrideDefaultValue: 'heavy' },
      },
      {
        definition: { id: 'ral', defaultValue: '9016' },
        binding: { valueScope: 'PRODUCT', overrideDefaultValue: '5015' },
      },
      {
        definition: { id: 'supply_form', defaultValue: 'cut' },
        binding: { valueScope: 'TRANSACTION', overrideDefaultValue: 'cut' },
      },
    ])).toEqual({ kind: 'heavy', ral: '5015' });
  });

  it('does not fill empty supply_form from the definition catalog default', () => {
    const definition = { id: 'supply_form', code: 'supply_form', defaultValue: 'cut' };
    expect(bindingDefaultValue(definition, { valueScope: 'TRANSACTION' })).toBe('');
    expect(resolveBindingDefault(definition, { valueScope: 'TRANSACTION' })).toBe('');
    expect(bindingDefaultValue(definition, {
      valueScope: 'TRANSACTION',
      overrideDefaultValue: 'cut',
    })).toBe('cut');
  });
});

describe('transactionAttributeDefaults', () => {
  it('seeds TRANSACTION defaults only, for order-line preselect', () => {
    expect(transactionAttributeDefaults([
      {
        definition: { id: 'kind', defaultValue: null },
        binding: { valueScope: 'PRODUCT', overrideDefaultValue: 'heavy' },
      },
      {
        definition: { id: 'length' },
        binding: { valueScope: 'TRANSACTION', overrideDefaultValue: '12' },
      },
    ])).toEqual({ length: '12' });
  });

  it('resolves mill-sheet length from stored width and thickness', () => {
    expect(transactionAttributeDefaults([
      {
        definition: { id: 'w', code: 'width' },
        binding: { valueScope: 'PRODUCT' },
      },
      {
        definition: { id: 't', code: 'thickness' },
        binding: { valueScope: 'PRODUCT' },
      },
      {
        definition: { id: 'sl', code: 'sheet_length' },
        binding: { valueScope: 'TRANSACTION' },
      },
    ], { w: 1000, t: 0.5 })).toEqual({ sl: '2000' });
  });

  it('does not prefill a millimetre when thickness is above 40', () => {
    expect(transactionAttributeDefaults([
      {
        definition: { id: 'w', code: 'width' },
        binding: { valueScope: 'PRODUCT' },
      },
      {
        definition: { id: 't', code: 'thickness' },
        binding: { valueScope: 'PRODUCT' },
      },
      {
        definition: { id: 'sl', code: 'sheet_length' },
        binding: { valueScope: 'TRANSACTION' },
      },
    ], { w: 2000, t: 45 })).toEqual({});
  });

  it('does not prefill mill-sheet length when عرضه is رول', () => {
    expect(transactionAttributeDefaults([
      {
        definition: { id: 'w', code: 'width' },
        binding: { valueScope: 'PRODUCT' },
      },
      {
        definition: { id: 't', code: 'thickness' },
        binding: { valueScope: 'PRODUCT' },
      },
      {
        definition: { id: 'sl', code: 'sheet_length' },
        binding: { valueScope: 'TRANSACTION' },
      },
      {
        definition: { id: 'sf', code: 'supply_form' },
        binding: { valueScope: 'TRANSACTION' },
      },
    ], { w: 1000, t: 0.5, sf: 'roll' })).toEqual({});
  });
});
