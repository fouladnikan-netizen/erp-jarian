/**
 * Shared job-position options for ContactPerson (Company 1:N child).
 */

export const CONTACT_PERSON_JOB_POSITIONS = [
  { id: 'purchase_manager', label: 'مدیر خرید' },
  { id: 'finance_manager', label: 'مدیر مالی' },
  { id: 'warehouse', label: 'انباردار' },
  { id: 'ceo', label: 'مدیرعامل' },
  { id: 'sales', label: 'کارشناس فروش' },
  { id: 'ops', label: 'کارشناس عملیات' },
  { id: 'other', label: 'غیره' },
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
