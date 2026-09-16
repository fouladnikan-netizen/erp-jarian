import { describe, expect, it } from 'vitest';
import {
  buildCatalogCapabilityOptions,
  createCatalogCapabilityTag,
  createCustomCapabilityTag,
  getSupplierCapabilityTags,
  searchCapabilityOptions,
  validateSupplierLegalFields,
} from '../supplierCapabilities.js';
import { ENTITY_TYPES, PERSON_TYPES } from '../config.js';

describe('supplier capability tags', () => {
  it('selects an existing catalog capability from typed search', () => {
    const options = buildCatalogCapabilityOptions();
    const hits = searchCapabilityOptions('ورق سیاه', [], options);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((item) => item.label.includes('ورق سیاه'))).toBe(true);

    const selected = createCatalogCapabilityTag(hits[0]);
    expect(selected.type).toBe('catalog');
    expect(selected.source).toBe('catalog');
    expect(selected.label).toBeTruthy();
  });

  it('creates a custom capability without writing to catalog', () => {
    const optionsBefore = buildCatalogCapabilityOptions().length;
    const custom = createCustomCapabilityTag('ST52');

    expect(custom).toMatchObject({
      label: 'ST52',
      type: 'custom',
      source: 'supplier_input',
    });
    expect(buildCatalogCapabilityOptions()).toHaveLength(optionsBefore);
  });

  it('persists supplier tags on the company aggregate shape', () => {
    const catalog = createCatalogCapabilityTag({
      id: 'subgroup-2-1',
      label: 'ورق سیاه',
      kind: 'subgroup',
      groupId: 2,
      subgroupId: 1,
    });
    const custom = createCustomCapabilityTag('ST52');
    const company = {
      id: 501,
      entityType: ENTITY_TYPES.SUPPLIER,
      personType: PERSON_TYPES.LEGAL,
      companyName: 'تامین تست',
      capabilityTags: [catalog, custom],
    };

    const tags = getSupplierCapabilityTags(company);
    expect(tags).toHaveLength(2);
    expect(tags.map((tag) => tag.label)).toEqual(['ورق سیاه', 'ST52']);
    expect(tags.find((tag) => tag.label === 'ST52')?.source).toBe('supplier_input');
  });

  it('renders tags for supplier profile identity via getSupplierCapabilityTags', () => {
    const company = {
      entityType: ENTITY_TYPES.SUPPLIER,
      companyName: 'ذوب آهن اصفهان',
      capabilityTags: [
        { id: 'a', label: 'ورق سیاه', type: 'catalog', source: 'catalog' },
        { id: 'b', label: 'ST52', type: 'custom', source: 'supplier_input' },
      ],
    };

    const tags = getSupplierCapabilityTags(company);
    expect(tags.map((tag) => tag.label)).toEqual(['ورق سیاه', 'ST52']);
  });

  it('falls back to legacy productGroups when capabilityTags missing', () => {
    const tags = getSupplierCapabilityTags({
      productGroups: [{ group: 'لوله', subgroup: 'لوله مانیسمان' }],
    });
    expect(tags).toHaveLength(1);
    expect(tags[0].label).toBe('لوله مانیسمان');
  });

  it('validates required supplier legal fields', () => {
    expect(validateSupplierLegalFields({}).ok).toBe(false);
    expect(validateSupplierLegalFields({
      companyName: 'شرکت الف',
      nationalId: '',
      ownerName: 'مالک',
      landline: '021111',
    }).nationalIdMissing).toBe(true);

    expect(validateSupplierLegalFields({
      companyName: 'شرکت الف',
      nationalId: '10101010101',
      ownerName: 'مالک',
      landline: '02111112222',
    })).toEqual({ ok: true });
  });
});
