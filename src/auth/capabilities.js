/**
 * Entity capability helpers — UI mirrors of Backend permission codes.
 */
import { PERMISSIONS } from './permissions.catalog.js';
import { can, hasAllPermissions } from './permissions.js';

export function companyCapabilities(permissions) {
  return {
    canView: can(PERMISSIONS.COMPANIES_READ, permissions),
    canWrite: can(PERMISSIONS.COMPANIES_WRITE, permissions),
  };
}

export function orderCapabilities(permissions) {
  return {
    canView: can(PERMISSIONS.ORDERS_READ, permissions),
    canWrite: can(PERMISSIONS.ORDERS_WRITE, permissions),
  };
}

export function leadCapabilities(permissions) {
  return {
    canView: can(PERMISSIONS.LEADS_READ, permissions),
    canWrite: can(PERMISSIONS.LEADS_WRITE, permissions),
    canConvert: can(PERMISSIONS.LEADS_CONVERT, permissions),
  };
}

export function activityCapabilities(permissions) {
  return {
    canView: can(PERMISSIONS.ACTIVITIES_READ, permissions),
    canWrite: can(PERMISSIONS.ACTIVITIES_WRITE, permissions),
  };
}

export function taskCapabilities(permissions) {
  return {
    canView: can(PERMISSIONS.TASKS_READ, permissions),
    canWrite: can(PERMISSIONS.TASKS_WRITE, permissions),
  };
}

export function canAccessModule(moduleId, permissions) {
  const map = {
    kanoon: PERMISSIONS.COMPANIES_READ,
    nabz: PERMISSIONS.ORDERS_READ,
    ofogh: PERMISSIONS.LEADS_READ,
    pooyesh: [PERMISSIONS.ACTIVITIES_READ, PERMISSIONS.TASKS_READ],
  };
  const required = map[moduleId];
  if (!required) return true;
  if (Array.isArray(required)) {
    return required.some((p) => can(p, permissions));
  }
  return can(required, permissions);
}

export { hasAllPermissions };
