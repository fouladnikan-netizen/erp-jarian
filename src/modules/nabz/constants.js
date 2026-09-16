import { getSessionDisplayName, useMockAuth, getAuthPermissions } from '../auth/authSession.js';
import { can } from '../../auth/permissions.js';
import { PERMISSIONS } from '../../auth/permissions.catalog.js';

/** نقش‌های نبض — presentation / fine-grained UX (NOT Backend RBAC). */
export const USER_ROLES = {
  KNIGHT: 'knight',
  EXPLORER: 'explorer',
  LEADER: 'leader',
  BRANCH: 'branch',
  WATCHER: 'watcher',
  /** @deprecated use LEADER — راهبر */
  MANAGER: 'manager',
};

/**
 * Session display name for UI stamps.
 * Audit authority remains Backend JWT actor — never trust this for security.
 */
export function getCurrentUser() {
  const name = getSessionDisplayName();
  if (name) return name;
  if (useMockAuth()) return 'علی رضایی';
  // Unit tests / pre-hydrate: stable display fallback (not a security actor)
  return 'علی رضایی';
}

/** @deprecated Use getCurrentUser() */
export const CURRENT_USER = 'علی رضایی';

/**
 * Nabz nickname role — presentation convenience only.
 * Security gate for order mutations = Backend `orders:write` (see orderEditPermissions).
 */
export const CURRENT_USER_ROLE = USER_ROLES.LEADER;

const SUPPLIER_VISIBLE_ROLES = new Set([
  USER_ROLES.EXPLORER,
  USER_ROLES.LEADER,
  USER_ROLES.BRANCH,
  USER_ROLES.WATCHER,
  USER_ROLES.MANAGER,
]);

/** شوالیه نام تامین‌کننده را نمی‌بیند؛ سایر نقش‌ها می‌بینند. Requires orders:read. */
export function canViewSupplierIdentity(role = CURRENT_USER_ROLE) {
  const perms = getAuthPermissions();
  if (perms.length && !can(PERMISSIONS.ORDERS_READ)) return false;
  return SUPPLIER_VISIBLE_ROLES.has(role);
}

export const UNPRICED_LABEL = 'هنوز قیمت‌گذاری نشده';

export const ORDER_TYPES = ['فوری', 'خرید', 'استعلام قیمت'];

export const CREATE_ORDER_TYPES = ['استعلام قیمت', 'خرید'];

export const DEFAULT_ORDER_TYPE = 'خرید';

export const SALES_TYPES = ['رسمی', 'غیر رسمی'];

export const DEFAULT_SALE_TYPE = 'رسمی';
