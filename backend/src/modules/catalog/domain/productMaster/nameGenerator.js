/**
 * Generated Product display name (product contract §"GENERATED PRODUCT NAME").
 * Product Type name + ordered filled attribute values, e.g.
 * "ورق سیاه | ضخامت: ۶ | عرض: ۱۲۵۰". Empty optional attributes are omitted
 * (DDL-24p). Pure formatting — never used for identity/duplicate comparisons
 * (canonical_identity_key from required attributes is the source of truth).
 *
 * `plain` / `معمولی` (ناودانی معمولی) is stored as identity but omitted from the name.
 * `kind` / `ral` entries pass omitName so the label stands alone:
 * «سبک» not «نوع: سبک»؛ «سفید رال ۹۰۱۶» not «رال: سفید رال ۹۰۱۶».
 *
 * The joined string is Persian-digit-only (DDL-67). Identity/SKU stay ASCII.
 */

import { formatProductDisplayText } from './normalize.js';

const SILENT_ENUM_VALUES = new Set(['plain', 'معمولی']);

/** ENUM label for generated names; silent values (e.g. ناودانی معمولی) are omitted. */
export function resolveEnumDisplayValue(allowedItems, rawValue) {
  const value = rawValue === null || rawValue === undefined ? '' : String(rawValue);
  if (!value || SILENT_ENUM_VALUES.has(value)) return '';
  const opt = (allowedItems || []).find((item) => String(item.value) === value);
  const label = opt?.labelFa;
  if (label && label !== '—') return label;
  return value;
}

export function buildGeneratedName(productTypeName, displayAttributeEntries) {
  const attrPart = [...displayAttributeEntries]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter((e) => e.displayValue !== null && e.displayValue !== undefined && e.displayValue !== '')
    .map((e) => {
      if (e.omitName) return String(e.displayValue);
      return e.unitLabel ? `${e.nameFa}: ${e.displayValue} ${e.unitLabel}` : `${e.nameFa}: ${e.displayValue}`;
    })
    .join(' | ');
  return formatProductDisplayText(attrPart ? `${productTypeName} | ${attrPart}` : productTypeName);
}
