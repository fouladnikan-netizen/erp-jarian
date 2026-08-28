/**
 * Generated Product display name (product contract §"GENERATED PRODUCT NAME").
 * Product Type name + ordered display-relevant attribute values, e.g.
 * "ورق سیاه | ضخامت: 6 | عرض: 1250". Pure formatting — never used for
 * identity/duplicate comparisons (canonical_identity_key is the source of
 * truth for that).
 */
export function buildGeneratedName(productTypeName, displayAttributeEntries) {
  const attrPart = [...displayAttributeEntries]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter((e) => e.displayValue !== null && e.displayValue !== undefined && e.displayValue !== '')
    .map((e) => (e.unitLabel ? `${e.nameFa}: ${e.displayValue} ${e.unitLabel}` : `${e.nameFa}: ${e.displayValue}`))
    .join(' | ');
  return attrPart ? `${productTypeName} | ${attrPart}` : productTypeName;
}
