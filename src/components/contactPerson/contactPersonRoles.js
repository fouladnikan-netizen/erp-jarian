/**
 * Shared job-position options for ContactPerson (Company 1:N child).
 */

export const CONTACT_PERSON_JOB_POSITIONS = [
  { id: 'ceo', label: 'مدیرعامل' },
  { id: 'purchase_manager', label: 'مدیر خرید' },
  { id: 'sales_manager', label: 'مدیر فروش' },
  { id: 'finance_manager', label: 'مدیر مالی' },
  { id: 'purchase_expert', label: 'کارشناس خرید' },
  { id: 'technical_expert', label: 'کارشناس فنی' },
  { id: 'company_owner', label: 'مالک شرکت' },
  { id: 'warehouse', label: 'انباردار' },
  { id: 'sales', label: 'کارشناس فروش' },
  { id: 'ops', label: 'کارشناس عملیات' },
  { id: 'other', label: 'غیره' },
];

/** Relation of person to company (audience / profile). */
export const CONTACT_PERSON_RELATION_TYPES = [
  { id: 'owner', label: 'مالک' },
  { id: 'ceo', label: 'مدیرعامل' },
  { id: 'purchase_manager', label: 'مدیر خرید' },
  { id: 'finance_manager', label: 'مدیر مالی' },
  { id: 'purchase_expert', label: 'کارشناس خرید' },
  { id: 'technical_expert', label: 'کارشناس فنی' },
  { id: 'other', label: 'سایر' },
];

export const CONTACT_PERSON_STATUSES = [
  { id: 'active', label: 'فعال' },
  { id: 'inactive', label: 'غیرفعال' },
];

export const CONTACT_PERSON_GENDERS = [
  { id: '', label: '—' },
  { id: 'male', label: 'مرد' },
  { id: 'female', label: 'زن' },
  { id: 'unspecified', label: 'ترجیح می‌دهم نگویم' },
];

export function getContactPersonJobLabel(jobPosition) {
  if (!jobPosition) return '—';
  const match = CONTACT_PERSON_JOB_POSITIONS.find(
    (item) => item.id === jobPosition || item.label === jobPosition,
  );
  return match?.label || jobPosition;
}

/** @deprecated Use CONTACT_PERSON_JOB_POSITIONS */
export const CONTACT_PERSON_ROLES = CONTACT_PERSON_JOB_POSITIONS;

/** @deprecated Use getContactPersonJobLabel */
export function getContactPersonRoleLabel(role) {
  return getContactPersonJobLabel(role);
}
