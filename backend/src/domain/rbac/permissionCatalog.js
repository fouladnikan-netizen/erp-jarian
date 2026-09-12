/**
 * Structured permission catalog + compatibility aliases (DDL-36).
 * Canonical codes remain colon-form (`orders:read`) for JWT / requirePermission.
 */

export const CATEGORY_ORDER = Object.freeze([
  'نبض',
  'کانون',
  'افق',
  'پویش',
  'گاه‌شمار',
  'ویترین',
  'تدارکات',
  'مالی',
  'شیرازه',
]);

export const RESOURCE_LABELS = Object.freeze({
  activities: 'فعالیت‌ها',
  companies: 'شرکت‌ها',
  correspondence: 'مکاتبات',
  leads: 'سرنخ‌های خام',
  orders: 'سفارش‌ها',
  products: 'کالاها',
  tasks: 'وظایف',
  users: 'کاربران',
});

export const PERMISSION_CATALOG = Object.freeze([
  { code: 'companies:read', labelFa: 'مشاهده شرکت‌ها', resource: 'companies', action: 'read', category: 'کانون', isSensitive: false },
  { code: 'companies:write', labelFa: 'ثبت/ویرایش شرکت', resource: 'companies', action: 'write', category: 'کانون', isSensitive: false },
  { code: 'orders:read', labelFa: 'مشاهده سفارش‌ها', resource: 'orders', action: 'read', category: 'نبض', isSensitive: false },
  { code: 'orders:write', labelFa: 'ثبت/ویرایش سفارش', resource: 'orders', action: 'write', category: 'نبض', isSensitive: false },
  { code: 'leads:read', labelFa: 'مشاهده سرنخ‌های خام', resource: 'leads', action: 'read', category: 'افق', isSensitive: false },
  { code: 'leads:write', labelFa: 'ثبت/ویرایش سرنخ خام', resource: 'leads', action: 'write', category: 'افق', isSensitive: false },
  { code: 'leads:convert', labelFa: 'تبدیل سرنخ به شرکت', resource: 'leads', action: 'convert', category: 'افق', isSensitive: false },
  { code: 'activities:read', labelFa: 'مشاهده فعالیت‌های پویش', resource: 'activities', action: 'read', category: 'پویش', isSensitive: false },
  { code: 'activities:write', labelFa: 'ثبت/ویرایش فعالیت پویش', resource: 'activities', action: 'write', category: 'پویش', isSensitive: false },
  { code: 'tasks:read', labelFa: 'مشاهده وظایف پویش', resource: 'tasks', action: 'read', category: 'پویش', isSensitive: false },
  { code: 'tasks:write', labelFa: 'ثبت/ویرایش وظایف پویش', resource: 'tasks', action: 'write', category: 'پویش', isSensitive: false },
  { code: 'correspondence:read', labelFa: 'مشاهده مکاتبات (گاه‌شمار)', resource: 'correspondence', action: 'read', category: 'گاه‌شمار', isSensitive: false },
  { code: 'correspondence:write', labelFa: 'ثبت/ویرایش پیش‌نویس مکاتبه', resource: 'correspondence', action: 'write', category: 'گاه‌شمار', isSensitive: false },
  { code: 'correspondence:finalize', labelFa: 'نهایی‌سازی و صدور شماره مکاتبه', resource: 'correspondence', action: 'finalize', category: 'گاه‌شمار', isSensitive: false },
  { code: 'users:admin', labelFa: 'مدیریت کاربران', resource: 'users', action: 'admin', category: 'شیرازه', isSensitive: true },
  { code: 'products:read', labelFa: 'مشاهده کالاها (ویترین)', resource: 'products', action: 'read', category: 'ویترین', isSensitive: false },
  { code: 'products:write', labelFa: 'ثبت/ویرایش کالا (ویترین)', resource: 'products', action: 'write', category: 'ویترین', isSensitive: false },
  { code: 'products:lifecycle', labelFa: 'فعال/غیرفعال‌سازی کالا', resource: 'products', action: 'lifecycle', category: 'ویترین', isSensitive: false },
  { code: 'products:manage-taxonomy', labelFa: 'مدیریت طبقه‌بندی/ویژگی/واحد کالا (شیرازه)', resource: 'products', action: 'manage-taxonomy', category: 'شیرازه', isSensitive: false },
  { code: 'products:manage-brands', labelFa: 'مدیریت رجیستری برند', resource: 'products', action: 'manage-brands', category: 'شیرازه', isSensitive: false },
  { code: 'products:bulk-import', labelFa: 'ورود دسته‌ای کالا', resource: 'products', action: 'bulk-import', category: 'ویترین', isSensitive: false },
  { code: 'orders:view_cost', labelFa: 'مشاهده قیمت خرید', resource: 'orders', action: 'view_cost', category: 'مالی', isSensitive: true },
  { code: 'orders:edit_sale_price', labelFa: 'تغییر قیمت فروش', resource: 'orders', action: 'edit_sale_price', category: 'مالی', isSensitive: true },
  { code: 'orders:view_profit', labelFa: 'مشاهده سود', resource: 'orders', action: 'view_profit', category: 'مالی', isSensitive: true },
]);

const CANONICAL = new Set(PERMISSION_CATALOG.map((row) => row.code));

/** Extra dotted aliases that do not equal resource.action (legacy target names). */
const EXTRA_ALIASES = Object.freeze({
  'orders.view': 'orders:read',
  'orders.create': 'orders:write',
  'orders.edit': 'orders:write',
  'users.admin': 'users:admin',
});

function dottedForm(code) {
  const colon = String(code).indexOf(':');
  if (colon === -1) return null;
  return `${code.slice(0, colon)}.${code.slice(colon + 1)}`;
}

const ALIAS_TO_CANONICAL = (() => {
  const map = new Map();
  PERMISSION_CATALOG.forEach((row) => {
    map.set(row.code, row.code);
    const dotted = dottedForm(row.code);
    if (dotted) map.set(dotted, row.code);
  });
  Object.entries(EXTRA_ALIASES).forEach(([alias, canonical]) => {
    map.set(alias, canonical);
  });
  return map;
})();

export function isCanonicalPermissionCode(code) {
  return CANONICAL.has(String(code || '').trim());
}

/**
 * Map old colon codes, dotted aliases, or already-canonical codes
 * onto the stored permission PK. Unknown input → null.
 */
export function resolveCanonicalPermissionCode(code) {
  const text = String(code || '').trim();
  if (!text) return null;
  if (ALIAS_TO_CANONICAL.has(text)) return ALIAS_TO_CANONICAL.get(text);
  if (text.includes('.') && !text.includes(':')) {
    const idx = text.indexOf('.');
    const candidate = `${text.slice(0, idx)}:${text.slice(idx + 1)}`;
    if (CANONICAL.has(candidate)) return candidate;
  }
  return null;
}

export function resolveCanonicalPermissionCodes(codes) {
  const resolved = [];
  const missing = [];
  const seen = new Set();
  (Array.isArray(codes) ? codes : []).forEach((code) => {
    const canonical = resolveCanonicalPermissionCode(code);
    if (!canonical) {
      missing.push(String(code || '').trim());
      return;
    }
    if (seen.has(canonical)) return;
    seen.add(canonical);
    resolved.push(canonical);
  });
  return { resolved, missing: missing.filter(Boolean) };
}

export function resourceLabel(resource, category) {
  if (category === 'مالی' && resource === 'orders') return 'قیمت';
  return RESOURCE_LABELS[resource] || resource;
}

export function parsePermissionCode(code) {
  const canonical = resolveCanonicalPermissionCode(code) || String(code || '');
  const colon = canonical.indexOf(':');
  if (colon === -1) {
    return { resource: canonical, action: '' };
  }
  return {
    resource: canonical.slice(0, colon),
    action: canonical.slice(colon + 1),
  };
}
