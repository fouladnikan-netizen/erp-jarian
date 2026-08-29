/**
 * Presentational helpers for canonical backend roles.
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

export function formatUserStatus(isActive) {
  return isActive ? 'فعال' : 'غیرفعال';
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
  return users.filter((u) => u?.isActive).length;
}
