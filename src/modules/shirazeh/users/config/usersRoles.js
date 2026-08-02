/**
 * Role options for Shirazeh Users management (mock / UI registry).
 */

export const USER_ROLES = [
  { id: 'ceo', label: 'مدیرعامل' },
  { id: 'sales', label: 'کارشناس فروش' },
  { id: 'supply', label: 'کارشناس تامین' },
  { id: 'ops', label: 'کارشناس عملیات' },
  { id: 'admin', label: 'مدیر سیستم' },
];

export function getRoleLabel(roleId) {
  return USER_ROLES.find((role) => role.id === roleId)?.label || roleId;
}
