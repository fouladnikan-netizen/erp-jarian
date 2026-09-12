/**
 * Backend permission codes — FE catalog must match seed RBAC canonical codes.
 * Structured metadata (resource/action/category/isSensitive) lives in
 * GET /api/v1/rbac/permissions (DDL-36). Do not invent codes here.
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
  CORRESPONDENCE_READ: 'correspondence:read',
  CORRESPONDENCE_WRITE: 'correspondence:write',
  CORRESPONDENCE_FINALIZE: 'correspondence:finalize',
  PRODUCTS_READ: 'products:read',
  PRODUCTS_WRITE: 'products:write',
  PRODUCTS_LIFECYCLE: 'products:lifecycle',
  PRODUCTS_MANAGE_TAXONOMY: 'products:manage-taxonomy',
  PRODUCTS_MANAGE_BRANDS: 'products:manage-brands',
  PRODUCTS_BULK_IMPORT: 'products:bulk-import',
  USERS_ADMIN: 'users:admin',
});

/** All known codes (for mock admin fixture / docs). */
export const ALL_PERMISSION_CODES = Object.freeze(Object.values(PERMISSIONS));

export default PERMISSIONS;
