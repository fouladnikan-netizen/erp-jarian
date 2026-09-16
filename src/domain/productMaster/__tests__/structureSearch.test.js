import { describe, expect, it } from 'vitest';
import { findStructureSelection, filterByQuery } from '../structureSearch.js';

const groups = [{ id: 'g1', name: 'مقاطع فولادی', nameLatin: 'Carbon Steel', skuCode: 'CS' }];
const categories = [{ id: 'c1', groupId: 'g1', name: 'میلگرد', skuCode: 'Re' }];
const types = [{
  id: 't1',
  categoryId: 'c1',
  name: 'میلگرد آجدار',
  nameLatin: 'Deformed Rebar',
  allowedBrandIds: ['b1'],
  defaultCountUnitId: 'u1',
}];
const brands = [{ id: 'b1', brandName: 'فولاد مبارکه' }];
const uoms = [{ id: 'u1', nameFa: 'شاخه', code: 'BRANCH' }];
const definitions = [{ id: 'a1', nameFa: 'ضخامت', code: 'thickness' }];
const schemaByType = { t1: [{ definition: { id: 'a1' } }] };

describe('findStructureSelection', () => {
  it('activates Group / Category / Type for a type name', () => {
    expect(findStructureSelection('میلگرد آجدار', { groups, categories, types }))
      .toEqual({ groupId: 'g1', categoryId: 'c1', typeId: 't1' });
  });

  it('selects a category path when only the category matches', () => {
    expect(findStructureSelection('میلگرد', { groups, categories, types: [] }))
      .toEqual({ groupId: 'g1', categoryId: 'c1', typeId: null });
  });

  it('resolves a type via a connected brand', () => {
    expect(findStructureSelection('مبارکه', { groups, categories, types, brands }))
      .toEqual({ groupId: 'g1', categoryId: 'c1', typeId: 't1' });
  });

  it('resolves a type via a bound attribute', () => {
    expect(findStructureSelection('ضخامت', { groups, categories, types, definitions, schemaByType }))
      .toEqual({ groupId: 'g1', categoryId: 'c1', typeId: 't1' });
  });
});

describe('filterByQuery', () => {
  it('filters master rows by Persian or Latin text', () => {
    const rows = filterByQuery(brands, 'مبارکه', (item) => [item.brandName]);
    expect(rows).toHaveLength(1);
  });
});
