import { toPersianDigits } from '../dateUtils';

/** شماره ویرایش قابل نمایش — فقط بعد از اولین به‌روزرسانی (revision > 1) */
export function getProformaRevisionNumber(order) {
  const revision = Number(order?.proforma?.revision || 0);
  if (revision <= 1) return null;
  return revision - 1;
}

export function getProformaRevisionLabel(order) {
  const n = getProformaRevisionNumber(order);
  if (n == null) return null;
  return `ویرایش ${toPersianDigits(n)}`;
}

/** بج قرمز براق صاف — فقط عدد ویرایش، کنار شماره سفارش */
export default function ProformaRevisionTag({ order, className = '' }) {
  const number = getProformaRevisionNumber(order);
  if (number == null) return null;

  const label = getProformaRevisionLabel(order);

  return (
    <span
      className={`proforma-revision-tag ${className}`.trim()}
      title={label}
      aria-label={label}
    >
      {toPersianDigits(number)}
    </span>
  );
}
