/**
 * Presentational helpers for canonical backend roles and user status.
 * Role codes/labels come from GET /api/v1/users/meta/roles — not a local registry.
 */

export function getRoleLabel(role, fallbackRoles = []) {
  if (!role) return '';
  if (typeof role === 'object') {
    return role.labelFa || role.code || '';
  }
  const match = fallbackRoles.find((r) => r.code === role);
  return match?.labelFa || role;
}

export function formatRoleLabels(roles, fallbackRoles = []) {
  if (!Array.isArray(roles) || roles.length === 0) return '—';
  return roles.map((r) => getRoleLabel(r, fallbackRoles)).filter(Boolean).join('، ');
}

export function formatUserStatus(statusOrActive) {
  if (statusOrActive === 'INVITED') return 'دعوت‌شده';
  if (statusOrActive === 'INACTIVE' || statusOrActive === false) return 'غیرفعال';
  if (statusOrActive === 'ACTIVE' || statusOrActive === true) return 'فعال';
  return 'فعال';
}

export function userStatusTone(status) {
  if (status === 'INVITED') return 'invited';
  if (status === 'INACTIVE') return 'inactive';
  return 'active';
}

export function formatUserCreatedAt(iso) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    return '—';
  }
}

export function countActiveUsers(users) {
  if (!Array.isArray(users)) return 0;
  return users.filter((u) => (u?.status || (u?.isActive === false ? 'INACTIVE' : 'ACTIVE')) === 'ACTIVE').length;
}
