import { describe, expect, it } from 'vitest';
import {
  TYPE_COMPLETION,
  firstIncompleteStep,
  nextWizardStep,
  resolveTypeCompletion,
} from '../typeCompletion.js';

const type = {
  id: 'pt_1',
  defaultCountUnitId: 'uom_kg',
  allowedBrandIds: ['br_1'],
};

function schema(enums = []) {
  return [
    { definition: { dataType: 'DECIMAL' }, binding: {} },
    ...enums.map((overrideAllowedValues) => ({
      definition: { dataType: 'ENUM', allowedValues: [{ value: 'A2' }, { value: 'A3' }] },
      binding: { overrideAllowedValues },
    })),
  ];
}

describe('resolveTypeCompletion', () => {
  it('reports missing attributes when schema is empty', () => {
    expect(resolveTypeCompletion(type, []).id).toBe(TYPE_COMPLETION.missingAttributes.id);
  });

  it('reports missing allowed values for empty ENUM override', () => {
    expect(resolveTypeCompletion(type, schema([])).id).toBe(TYPE_COMPLETION.complete.id);
    expect(resolveTypeCompletion(type, schema([[]])).id).toBe(TYPE_COMPLETION.missingAllowed.id);
  });

  it('treats null ENUM override as all catalog values', () => {
    expect(resolveTypeCompletion(type, schema([null])).id).toBe(TYPE_COMPLETION.complete.id);
  });

  it('treats units as required and brands as optional', () => {
    expect(resolveTypeCompletion({ ...type, defaultCountUnitId: null }, schema()).id)
      .toBe(TYPE_COMPLETION.missingUnits.id);
    expect(resolveTypeCompletion({ ...type, allowedBrandIds: [] }, schema()).id)
      .toBe(TYPE_COMPLETION.complete.id);
  });

  it('returns the first incomplete wizard step', () => {
    expect(firstIncompleteStep({ ...type, defaultCountUnitId: null }, schema())).toBe('offer');
    expect(firstIncompleteStep(type, [])).toBe('attributes');
    expect(firstIncompleteStep(type, schema())).toBe(null);
  });

  it('skips allowed-values when the type has no ENUM attributes', () => {
    expect(nextWizardStep('attributes', schema())).toBe('offer');
    expect(nextWizardStep('attributes', schema([null]))).toBe('allowed-values');
  });
});
