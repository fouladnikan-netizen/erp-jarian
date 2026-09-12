/**
 * Presentation grouping for the Shirazeh permission catalog (DDL-36).
 * Consumes structured API rows; does not invent permission codes.
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

export function resourceLabel(resource, category) {
  if (category === 'مالی' && resource === 'orders') return 'قیمت';
  return RESOURCE_LABELS[resource] || resource || '';
}

export function matchesPermissionQuery(permission, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return true;
  const hay = [
    permission.code,
    permission.labelFa,
    permission.resource,
    permission.action,
    permission.category,
    resourceLabel(permission.resource, permission.category),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(q);
}

export function filterPermissionCatalog(permissions, query) {
  const list = Array.isArray(permissions) ? permissions : [];
  return list.filter((item) => (
    item?.code
    && item.isActive !== false
    && matchesPermissionQuery(item, query)
  ));
}

export function groupPermissionCatalog(permissions, query) {
  const list = filterPermissionCatalog(permissions, query);
  const categories = new Map();

  list.forEach((item) => {
    const category = item.category || 'سایر';
    const resource = item.resource || 'other';
    if (!categories.has(category)) {
      categories.set(category, { category, resources: new Map() });
    }
    const cat = categories.get(category);
    if (!cat.resources.has(resource)) {
      cat.resources.set(resource, {
        resourceId: `${category}:${resource}`,
        resource,
        resourceName: resourceLabel(resource, category),
        permissions: [],
      });
    }
    cat.resources.get(resource).permissions.push({
      id: item.id || item.code,
      code: item.code,
      resource,
      action: item.action || '',
      labelFa: item.labelFa || item.label_fa || item.code,
      category,
      isSensitive: item.isSensitive === true,
    });
  });

  const orderedCategories = [
    ...CATEGORY_ORDER.filter((name) => categories.has(name)),
    ...[...categories.keys()].filter((name) => !CATEGORY_ORDER.includes(name)).sort(),
  ];

  return orderedCategories.map((name) => {
    const cat = categories.get(name);
    return {
      category: name,
      resources: [...cat.resources.values()],
    };
  });
}

/** @deprecated Use groupPermissionCatalog — kept for prefix helpers in tests. */
export function resourcePrefix(code) {
  const text = String(code || '');
  const colon = text.indexOf(':');
  const dot = text.indexOf('.');
  if (colon === -1 && dot === -1) return text;
  if (colon === -1) return text.slice(0, dot);
  if (dot === -1) return text.slice(0, colon);
  return text.slice(0, Math.min(colon, dot));
}

export function groupPermissionsByResource(permissions) {
  return groupPermissionCatalog(permissions).flatMap((category) => category.resources);
}
