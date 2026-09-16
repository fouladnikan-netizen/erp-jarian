/**
 * User account status (DDL-39).
 * INVITED → ACTIVE via Faraz invitation SMS + set-password (DDL-41).
 */

export const ACCOUNT_STATUSES = ['INVITED', 'ACTIVE', 'INACTIVE'];

export function resolveCreateStatus({ hasPassword, isActive }) {
  if (!hasPassword) return 'INVITED';
  if (isActive === false) return 'INACTIVE';
  return 'ACTIVE';
}

export function isActiveFlag(status) {
  return status !== 'INACTIVE';
}

export function canAuthenticate({ isActive, accountStatus, hasPassword }) {
  return Boolean(isActive)
    && accountStatus === 'ACTIVE'
    && hasPassword === true;
}

export function resolveToggleStatus(currentStatus, hasPassword) {
  if (currentStatus === 'INACTIVE') {
    return hasPassword ? 'ACTIVE' : 'INVITED';
  }
  return 'INACTIVE';
}
