/**
 * Type-level ENUM option lists (DDL-46). Product-level subset (DDL-45) remains
 * for backward-compatible API writes only.
 */
import { resolveTypeAllowedValues } from './attributeBindingPolicy.js';
import { isSheetLengthApplicable, isSheetLengthAttribute, sheetMillLengthDefault } from './sheetMillLength.js';

export { resolveTypeAllowedValues, isProductScope, isTransactionScope } from './attributeBindingPolicy.js';
export { isRollSupplyForm, isSheetLengthApplicable } from './sheetMillLength.js';

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

/** @deprecated DDL-45 product-form multi-select — kept for API compatibility. */
export function isAllowedSubsetEnum(definition, binding = {}) {
  if (definition?.dataType !== 'ENUM') return false;
  if (binding.isRequired) return false;
  return true;
}

/** @deprecated DDL-46 — order-time lists are type-level. */
export function resolveOrderEnumOptions(catalog, selectedValues) {
  return resolveTypeAllowedValues(catalog, selectedValues);
}

/** Type-binding پیش‌فرض only (DDL-55). Definition.defaultValue is not a display default. */
export function bindingDefaultValue(definition, binding) {
  const value = binding?.overrideDefaultValue;
  if (value === undefined || value === null || value === '') return '';
  return String(value);
}
