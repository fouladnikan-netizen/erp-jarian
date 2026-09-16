/**
 * Supplier capability tags — Kanoon Supplier aggregate facet.
 * Catalog suggestions are read-only projections from Vitrin; custom tags
 * never write back into the product catalog.
 */

import { initialGroups, initialProducts } from '../vitrin/catalogData';

export const CAPABILITY_TAG_TYPES = {
  CATALOG: 'catalog',
  CUSTOM: 'custom',
};

export const CAPABILITY_TAG_SOURCES = {
  CATALOG: 'catalog',
  SUPPLIER_INPUT: 'supplier_input',
};

function slugifyLabel(label) {
  return String(label || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u0600-\u06FF-]+/g, '');
}

/**
 * Flat searchable options from Vitrin catalog (groups, subgroups, product titles).
 * Does not mutate catalog data.
 */
export function buildCatalogCapabilityOptions({
  groups = initialGroups,
  products = initialProducts,
} = {}) {
  const options = [];

  for (const group of groups || []) {
    options.push({
      id: `group-${group.id}`,
      label: group.name,
      kind: 'group',
      type: CAPABILITY_TAG_TYPES.CATALOG,
      source: CAPABILITY_TAG_SOURCES.CATALOG,
      groupId: group.id,
      searchText: group.name,
    });
    for (const subgroup of group.subgroups || []) {
      options.push({
        id: `subgroup-${group.id}-${subgroup.id}`,
        label: subgroup.name,
        kind: 'subgroup',
        type: CAPABILITY_TAG_TYPES.CATALOG,
        source: CAPABILITY_TAG_SOURCES.CATALOG,
        groupId: group.id,
        subgroupId: subgroup.id,
        searchText: `${group.name} ${subgroup.name}`,
      });
    }
  }

  for (const product of products || []) {
    const extras = [
      product.title,
      product.description,
      product.specs?.size,
      ...(product.specs?.standards || []),
    ].filter(Boolean).join(' ');
    options.push({
      id: `product-${product.id}`,
      label: product.title,
      kind: 'product',
      type: CAPABILITY_TAG_TYPES.CATALOG,
      source: CAPABILITY_TAG_SOURCES.CATALOG,
      groupId: product.groupId,
      subgroupId: product.subgroupId,
      productId: product.id,
      searchText: extras,
    });
  }

  return options;
}

export function createCatalogCapabilityTag(option) {
  if (!option?.label) return null;
  return {
    id: option.id || `catalog-${slugifyLabel(option.label)}`,
    label: String(option.label).trim(),
    type: CAPABILITY_TAG_TYPES.CATALOG,
    source: CAPABILITY_TAG_SOURCES.CATALOG,
    kind: option.kind || 'catalog',
    groupId: option.groupId,
    subgroupId: option.subgroupId,
    productId: option.productId,
  };
}

export function createCustomCapabilityTag(label) {
  const trimmed = String(label || '').trim();
  if (!trimmed) return null;
  return {
    id: `custom-${slugifyLabel(trimmed)}-${Date.now().toString(36)}`,
    label: trimmed,
    type: CAPABILITY_TAG_TYPES.CUSTOM,
    source: CAPABILITY_TAG_SOURCES.SUPPLIER_INPUT,
  };
}

/**
 * @param {string} query
 * @param {Array<{ id: string }>} selected
 * @param {Array<object>} [catalogOptions]
 */
export function searchCapabilityOptions(query, selected = [], catalogOptions = buildCatalogCapabilityOptions()) {
  const q = String(query || '').trim().toLowerCase();
  const selectedIds = new Set((selected || []).map((item) => String(item.id)));
  const selectedLabels = new Set(
    (selected || []).map((item) => String(item.label || '').trim().toLowerCase()),
  );

  let pool = (catalogOptions || []).filter((opt) => {
    if (selectedIds.has(String(opt.id))) return false;
    if (selectedLabels.has(String(opt.label || '').trim().toLowerCase())) return false;
    return true;
  });

  if (q) {
    pool = pool.filter((opt) => {
      const hay = `${opt.label || ''} ${opt.searchText || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }

  return pool.slice(0, 12);
}

export function hasExactCapabilityMatch(query, catalogOptions = buildCatalogCapabilityOptions()) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return false;
  return (catalogOptions || []).some((opt) => String(opt.label || '').trim().toLowerCase() === q);
}

/** Migrate legacy productGroups rows → capability tags (display/read fallback). */
export function legacyProductGroupsToCapabilities(productGroups = []) {
  return (productGroups || [])
    .map((row, index) => {
      const label = row.subgroup || row.group;
      if (!label) return null;
      return {
        id: `legacy-${index}-${slugifyLabel(label)}`,
        label: String(label).trim(),
        type: CAPABILITY_TAG_TYPES.CATALOG,
        source: CAPABILITY_TAG_SOURCES.CATALOG,
        kind: row.subgroup ? 'subgroup' : 'group',
        legacyGroup: row.group || null,
        legacySubgroup: row.subgroup || null,
      };
    })
    .filter(Boolean);
}

export function getSupplierCapabilityTags(company) {
  if (!company) return [];
  if (Array.isArray(company.capabilityTags) && company.capabilityTags.length > 0) {
    return company.capabilityTags;
  }
  return legacyProductGroupsToCapabilities(company.productGroups);
}

/**
 * Supplier legal registration required fields.
 * @returns {{ ok: boolean, message?: string, nationalIdMissing?: boolean }}
 */
export function validateSupplierLegalFields(form = {}) {
  if (!String(form.companyName || '').trim()) {
    return { ok: false, message: 'نام شرکت اجباری است.' };
  }
  if (!String(form.nationalId || '').trim()) {
    return { ok: false, message: 'شناسه ملی اجباری است.', nationalIdMissing: true };
  }
  if (!String(form.ownerName || '').trim()) {
    return { ok: false, message: 'نام مدیر/مالک اجباری است.' };
  }
  if (!String(form.landline || '').trim()) {
    return { ok: false, message: 'تلفن ثابت شرکت اجباری است.' };
  }
  return { ok: true };
}
