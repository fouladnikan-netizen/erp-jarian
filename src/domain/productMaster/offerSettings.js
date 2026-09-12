/**
 * Product offer settings (DDL-47). Count = Product.baseUomId; sales = salesUomId.
 * Order forms consume these; they are not defined per line.
 */

export function seedOfferSettingsFromType(type = {}) {
  return {
    countUnitId: type.defaultCountUnitId || '',
    salesUnitId: type.defaultSalesUnitId || '',
    unitWeight: type.defaultUnitWeight == null ? '' : String(type.defaultUnitWeight),
    customLengthAllowed: Boolean(type.customLengthAllowed),
  };
}

export function resolveProductOfferSettings(product = {}, uoms = []) {
  const countUnitId = product.countUnitId || product.baseUomId || null;
  const salesUnitId = product.salesUnitId || product.salesUomId || countUnitId;
  const countUnit = uoms.find((u) => u.id === countUnitId);
  const salesUnit = uoms.find((u) => u.id === salesUnitId);
  return {
    countUnitId,
    salesUnitId,
    unitWeight: product.unitWeight ?? null,
    customLengthAllowed: Boolean(product.customLengthAllowed),
    countUnitLabel: countUnit?.nameFa || null,
    salesUnitLabel: salesUnit?.nameFa || product.unit || null,
  };
}

export function isCustomLengthAllowed(product) {
  return Boolean(resolveProductOfferSettings(product).customLengthAllowed);
}
