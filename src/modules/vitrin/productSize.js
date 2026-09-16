/**
 * Size is a PRODUCT DECIMAL identity attribute (code `size`).
 * Display uses Persian digits; missing size sorts last.
 */

export function getProductSizeNumber(product) {
  const values = product?.attributeValues;
  if (!Array.isArray(values)) return null;
  const row = values.find((item) => item?.attributeCode === 'size');
  if (!row) return null;
  if (row.valueNumber != null && Number.isFinite(Number(row.valueNumber))) {
    return Number(row.valueNumber);
  }
  const parsed = Number(String(row.valueText ?? '').trim().replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatProductSizeDisplay(product) {
  const size = getProductSizeNumber(product);
  if (size == null) return '—';
  return size.toLocaleString('fa-IR', { maximumFractionDigits: 4 });
}
