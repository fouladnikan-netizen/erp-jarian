/** SQL fragments for soft-delete (archive) policy */

export const ACTIVE_ONLY = 'deleted_at IS NULL';

export function activeCompanyWhere(alias = '') {
  const prefix = alias ? `${alias}.` : '';
  return `${prefix}${ACTIVE_ONLY}`;
}

export function activeOrderWhere(alias = '') {
  const prefix = alias ? `${alias}.` : '';
  return `${prefix}${ACTIVE_ONLY}`;
}

export function activeLeadWhere(alias = '') {
  const prefix = alias ? `${alias}.` : '';
  return `${prefix}${ACTIVE_ONLY}`;
}

export function activeActivityWhere(alias = '') {
  const prefix = alias ? `${alias}.` : '';
  return `${prefix}${ACTIVE_ONLY}`;
}

export function activeTaskWhere(alias = '') {
  const prefix = alias ? `${alias}.` : '';
  return `${prefix}${ACTIVE_ONLY}`;
}
