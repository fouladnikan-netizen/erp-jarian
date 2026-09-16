/**
 * Product Type wizard completeness (UI only — no schema change).
 * Order: attributes → allowed values → units. Brands are optional — empty
 * allowedBrandIds means no restriction; not every category uses brands.
 */

export const TYPE_COMPLETION = {
  incomplete: { id: 'incomplete', label: 'ناقص' },
  missingAttributes: { id: 'missing_attributes', label: 'ویژگی‌ها ناقص' },
  missingAllowed: { id: 'missing_allowed', label: 'مقادیر مجاز ناقص' },
  missingUnits: { id: 'missing_units', label: 'واحد تعریف نشده' },
  complete: { id: 'complete', label: 'کامل' },
};

export const TYPE_WIZARD_STEPS = [
  { id: 'classification', label: 'طبقه‌بندی' },
  { id: 'attributes', label: 'ویژگی‌ها' },
  { id: 'allowed-values', label: 'مقادیر مجاز' },
  { id: 'offer', label: 'واحد و عرضه' },
  { id: 'brands', label: 'برندها' },
];

function enumBindings(schema = []) {
  return schema.filter((entry) => entry.definition?.dataType === 'ENUM');
}

export function hasEnumAttributes(schema = []) {
  return enumBindings(schema).length > 0;
}

export function allowedValuesComplete(schema = []) {
  const enums = enumBindings(schema);
  if (!enums.length) return true;
  return enums.every((entry) => {
    const catalog = entry.definition?.allowedValues || [];
    if (!catalog.length) return false;
    const override = entry.binding?.overrideAllowedValues;
    if (!override) return true;
    return override.length > 0;
  });
}

export function resolveTypeCompletion(type, schema) {
  if (!type) return TYPE_COMPLETION.incomplete;
  if (!schema?.length) return TYPE_COMPLETION.missingAttributes;
  if (!allowedValuesComplete(schema)) return TYPE_COMPLETION.missingAllowed;
  if (!type.defaultCountUnitId) return TYPE_COMPLETION.missingUnits;
  return TYPE_COMPLETION.complete;
}

export function firstIncompleteStep(type, schema) {
  const status = resolveTypeCompletion(type, schema);
  if (status.id === TYPE_COMPLETION.missingAttributes.id) return 'attributes';
  if (status.id === TYPE_COMPLETION.missingAllowed.id) return 'allowed-values';
  if (status.id === TYPE_COMPLETION.missingUnits.id) return 'offer';
  return null;
}

export function nextWizardStep(currentStepId, schema) {
  const ids = TYPE_WIZARD_STEPS.map((step) => step.id);
  const start = ids.indexOf(currentStepId);
  for (let index = start + 1; index < ids.length; index += 1) {
    if (ids[index] === 'allowed-values' && !hasEnumAttributes(schema)) continue;
    return ids[index];
  }
  return null;
}

export function prevWizardStep(currentStepId, schema) {
  const ids = TYPE_WIZARD_STEPS.map((step) => step.id);
  const start = ids.indexOf(currentStepId);
  for (let index = start - 1; index >= 0; index -= 1) {
    if (ids[index] === 'allowed-values' && !hasEnumAttributes(schema)) continue;
    return ids[index];
  }
  return null;
}

export function isWizardStepComplete(stepId, type, schema) {
  if (!type) return false;
  if (stepId === 'classification') return true;
  if (stepId === 'attributes') return Boolean(schema?.length);
  if (stepId === 'allowed-values') return allowedValuesComplete(schema);
  if (stepId === 'offer') return Boolean(type.defaultCountUnitId);
  if (stepId === 'brands') return true;
  return false;
}

export function typeBreadcrumb({ group, category, type }) {
  return [group?.name, category?.name, type?.name].filter(Boolean).join(' / ');
}
