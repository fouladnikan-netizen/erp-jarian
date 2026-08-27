/**
 * Backend permission codes — FE catalog must match seed RBAC.
 * Do not invent codes here; extend backend seed first.
 */
export const PERMISSIONS = Object.freeze({
  COMPANIES_READ: 'companies:read',
  COMPANIES_WRITE: 'companies:write',
  ORDERS_READ: 'orders:read',
  ORDERS_WRITE: 'orders:write',
  LEADS_READ: 'leads:read',
  LEADS_WRITE: 'leads:write',
  LEADS_CONVERT: 'leads:convert',
  ACTIVITIES_READ: 'activities:read',
  ACTIVITIES_WRITE: 'activities:write',
  TASKS_READ: 'tasks:read',
  TASKS_WRITE: 'tasks:write',
  USERS_ADMIN: 'users:admin',
});

/** All known codes (for mock admin fixture / docs). */
export const ALL_PERMISSION_CODES = Object.freeze(Object.values(PERMISSIONS));

export default PERMISSIONS;
