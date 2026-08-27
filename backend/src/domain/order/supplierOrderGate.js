/**
 * Reject supplier-only Company on Order create/attach.
 * Customer and BOTH are allowed. Ownership remains Kanoon.
 */
import { appError } from '../../lib/errors.js';

export function assertCompanyAllowedForOrder(company) {
  if (!company) {
    throw appError('ORDER_COMPANY_REQUIRED', 'شرکت سفارش الزامی است.', 400);
  }
  const entityType = String(company.entityType || company.entity_type || '').toUpperCase();
  if (entityType === 'SUPPLIER') {
    throw appError(
      'ORDER_SUPPLIER_ONLY_FORBIDDEN',
      'ایجاد سفارش برای شرکت صرفاً تأمین‌کننده مجاز نیست. مشتری یا مشتری+تأمین‌کننده لازم است.',
      409,
      { entityType },
    );
  }
  return true;
}

export default { assertCompanyAllowedForOrder };
