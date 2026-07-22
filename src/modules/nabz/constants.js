/** کاربر فعال سامانه — پیش‌فرض راهبر (مدیر) برای تست دسترسی کامل */
export const CURRENT_USER = 'علی رضایی';
export const CURRENT_USER_ROLE = 'leader';

export const USER_ROLES = {
  KNIGHT: 'knight',
  EXPLORER: 'explorer',
  LEADER: 'leader',
  BRANCH: 'branch',
  WATCHER: 'watcher',
  /** @deprecated use LEADER — راهبر */
  MANAGER: 'manager',
};

const SUPPLIER_VISIBLE_ROLES = new Set([
  USER_ROLES.EXPLORER,
  USER_ROLES.LEADER,
  USER_ROLES.BRANCH,
  USER_ROLES.WATCHER,
  USER_ROLES.MANAGER,
]);

/** شوالیه نام تامین‌کننده را نمی‌بیند؛ سایر نقش‌ها می‌بینند. */
export function canViewSupplierIdentity(role = CURRENT_USER_ROLE) {
  return SUPPLIER_VISIBLE_ROLES.has(role);
}

export const UNPRICED_LABEL = 'هنوز قیمت‌گذاری نشده';

export const ORDER_TYPES = ['فوری', 'خرید', 'استعلام قیمت'];

export const CREATE_ORDER_TYPES = ['استعلام قیمت', 'خرید'];

export const DEFAULT_ORDER_TYPE = 'خرید';

export const SALES_TYPES = ['رسمی', 'غیر رسمی'];

export const DEFAULT_SALE_TYPE = 'رسمی';
