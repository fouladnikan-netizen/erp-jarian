/**
 * Presentation-level permission helpers.
 * UI only — Backend requirePermission remains security SoR.
 */
import { getAuthPermissions } from '../modules/auth/authSession.js';

export function can(permission, permissions = getAuthPermissions()) {
  if (!permission) return false;
  const list = Array.isArray(permissions) ? permissions : [];
  return list.includes(permission);
}

export function hasAnyPermission(required = [], permissions = getAuthPermissions()) {
  if (!required.length) return true;
  return required.some((p) => can(p, permissions));
}

export function hasAllPermissions(required = [], permissions = getAuthPermissions()) {
  if (!required.length) return true;
  return required.every((p) => can(p, permissions));
}

export function listPermissions(permissions = getAuthPermissions()) {
  return [...(Array.isArray(permissions) ? permissions : [])];
}

export default {
  can,
  hasAnyPermission,
  hasAllPermissions,
  listPermissions,
};
