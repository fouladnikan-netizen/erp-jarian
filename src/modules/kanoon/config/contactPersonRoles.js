/**
 * Organizational roles for associated contact persons (رابطین).
 */

export const CONTACT_PERSON_ROLES = [
  { id: 'purchase_manager', label: 'مدیر خرید' },
  { id: 'finance_manager', label: 'مدیر مالی' },
  { id: 'warehouse', label: 'انباردار' },
  { id: 'ceo', label: 'مدیرعامل' },
  { id: 'sales', label: 'کارشناس فروش' },
  { id: 'ops', label: 'کارشناس عملیات' },
  { id: 'other', label: 'غیره' },
];

export function getContactPersonRoleLabel(role) {
  if (!role) return '—';
  const match = CONTACT_PERSON_ROLES.find((item) => item.id === role || item.label === role);
  return match?.label || role;
}
