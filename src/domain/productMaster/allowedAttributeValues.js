/**
 * Type-level ENUM option lists (DDL-46).
 * Definition.allowedValues is the global catalog; the Product Type binding
 * may narrow it. Product-level multi-select (DDL-45 form) is withdrawn.
 */

import { isSheetLengthApplicable, isSheetLengthAttribute, isSheetLengthPhrase, sheetMillLengthDefault } from './sheetMillLength';

export function isTransactionScope(binding = {}) {
  if (binding.valueScope) return binding.valueScope === 'TRANSACTION';
  return binding.attributeRole === 'TRANSACTION_ONLY';
}

export function isProductScope(binding = {}) {
  return !isTransactionScope(binding);
}

export { isRollSupplyForm, isSheetLengthApplicable } from './sheetMillLength';

/**
 * Effective ENUM options for a Product Type binding.
 * Null/empty override inherits the definition catalog. Catalog order is kept.
 */
export function resolveTypeAllowedValues(catalog, overrideValues) {
  const items = Array.isArray(catalog) ? catalog : [];
  if (!Array.isArray(overrideValues) || overrideValues.length === 0) return items;
  const allowed = new Set(overrideValues.map((v) => String(v)));
  return items.filter((item) => allowed.has(item.value));
}

/**
 * Draft ticks for a Type ENUM subset. An override that no longer intersects
 * the catalog (latin leftovers after a Persian rewrite) inherits the catalog
 * instead of an empty selection — empty would block compact bind save.
 */
export function selectedEnumValuesFromOverride(catalogValues, overrideValues) {
  const items = Array.isArray(catalogValues) ? catalogValues.map((value) => String(value)) : [];
  if (!Array.isArray(overrideValues) || overrideValues.length === 0) return items;
  const allowed = new Set(overrideValues.map((value) => String(value)));
  const selected = items.filter((value) => allowed.has(value));
  return selected.length ? selected : items;
}

export function effectiveEnumOptions(definition, binding) {
  if (binding?.effectiveAllowedValues) return binding.effectiveAllowedValues;
  return resolveTypeAllowedValues(definition?.allowedValues, binding?.overrideAllowedValues);
}

/** Type-binding پیش‌فرض only (DDL-55). Definition.defaultValue is not a display default. */
export function bindingDefaultValue(definition, binding) {
  const value = binding?.overrideDefaultValue;
  if (value === undefined || value === null || value === '') return '';
  return String(value);
}

export function liveAttributeValuesByCode(schema, valuesByDefinitionId = {}) {
  const byCode = {};
  for (const entry of schema || []) {
    const code = entry?.definition?.code;
    const id = entry?.definition?.id;
    if (!code || !id) continue;
    const raw = valuesByDefinitionId instanceof Map
      ? valuesByDefinitionId.get(id)
      : valuesByDefinitionId[id];
    if (raw === undefined || raw === null || raw === '') continue;
    byCode[code] = raw;
  }
  return byCode;
}

/** Empty-slot default: mill-sheet catalog (DDL-56) then scalar پیش‌فرض (DDL-55). */
export function resolveBindingDefault(definition, binding, { liveByCode } = {}) {
  if (isSheetLengthAttribute(definition)) {
    if (!isSheetLengthApplicable(liveByCode)) return '';
    const fromRule = sheetMillLengthDefault({
      width: liveByCode?.width,
      thickness: liveByCode?.thickness,
      supplyForm: liveByCode?.supply_form,
    });
    if (fromRule) return fromRule;
  }
  return bindingDefaultValue(definition, binding);
}

/** PRODUCT-scoped defaults keyed by attribute definition id. */
export function productAttributeDefaults(schema) {
  const next = {};
  for (const entry of schema || []) {
    if (!isProductScope(entry.binding)) continue;
    const value = bindingDefaultValue(entry.definition, entry.binding);
    if (value) next[entry.definition.id] = value;
  }
  return next;
}

/** TRANSACTION defaults for order-line preselect (DDL-55 / DDL-56). Not Product identity. */
export function transactionAttributeDefaults(schema, productValues = {}) {
  const liveByCode = liveAttributeValuesByCode(schema, productValues);
  const next = {};
  for (const entry of schema || []) {
    if (!isTransactionScope(entry.binding)) continue;
    if (isSheetLengthAttribute(entry.definition) && !isSheetLengthApplicable(liveByCode)) continue;
    const value = resolveBindingDefault(entry.definition, entry.binding, { liveByCode });
    if (value && !isSheetLengthPhrase(value)) next[entry.definition.id] = value;
  }
  return next;
}

/** @deprecated DDL-45 product-form multi-select — kept for tests/compat. */
export function isAllowedSubsetEnum(definition, binding = {}) {
  if (definition?.dataType !== 'ENUM') return false;
  if (binding.isRequired) return false;
  return true;
}

/** @deprecated DDL-46 — order-time lists are type-level, not product-level. */
export function resolveOrderEnumOptions(catalog, selectedValues) {
  return resolveTypeAllowedValues(catalog, selectedValues);
}

/** Prefer type-level list (DDL-46); fall back to a leftover product subset (DDL-45). */
export function orderEnumOptionsForProduct(product, definition, binding) {
  if (binding) return effectiveEnumOptions(definition, binding);
  const selected = product?.allowedAttributeValues?.[definition?.id];
  return resolveTypeAllowedValues(definition?.allowedValues, selected);
}
