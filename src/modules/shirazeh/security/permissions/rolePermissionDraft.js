/**
 * Matrix grant draft helpers. Grouping lives in src/domain/rbac/permissionCatalog.js.
 */
export {
  groupPermissionCatalog,
  groupPermissionsByResource,
  resourcePrefix,
  resourceLabel,
} from '../../../../domain/rbac/permissionCatalog.js';

export function isPermissionEnabled(code, committedCodes, pendingChanges) {
  if (Object.prototype.hasOwnProperty.call(pendingChanges || {}, code)) {
    return Boolean(pendingChanges[code]);
  }
  return Array.isArray(committedCodes) && committedCodes.includes(code);
}

export function applyPendingToCommitted(committedCodes, pendingChanges) {
  const next = new Set(Array.isArray(committedCodes) ? committedCodes : []);
  Object.entries(pendingChanges || {}).forEach(([code, enabled]) => {
    if (enabled) next.add(code);
    else next.delete(code);
  });
  return [...next].sort();
}
