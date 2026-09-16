import { describe, expect, it } from 'vitest';
import {
  applyPendingToCommitted,
  groupPermissionCatalog,
  groupPermissionsByResource,
  isPermissionEnabled,
  resourcePrefix,
} from '../rolePermissionDraft.js';

const SAMPLE = [
  { code: 'orders:read', labelFa: 'مشاهده سفارش‌ها', resource: 'orders', action: 'read', category: 'نبض', isSensitive: false },
  { code: 'orders:write', labelFa: 'ثبت/ویرایش سفارش', resource: 'orders', action: 'write', category: 'نبض', isSensitive: false },
  { code: 'orders:view_cost', labelFa: 'مشاهده قیمت خرید', resource: 'orders', action: 'view_cost', category: 'مالی', isSensitive: true },
  { code: 'users:admin', labelFa: 'مدیریت کاربران', resource: 'users', action: 'admin', category: 'شیرازه', isSensitive: true },
];

describe('rolePermissionDraft', () => {
  it('groups catalog rows by category then resource', () => {
    const groups = groupPermissionCatalog(SAMPLE);
    expect(groups.map((g) => g.category)).toEqual(['نبض', 'مالی', 'شیرازه']);
    expect(groups[0].resources[0].resourceName).toBe('سفارش‌ها');
    expect(groups[0].resources[0].permissions).toHaveLength(2);
    expect(groups[1].resources[0].resourceName).toBe('قیمت');
    expect(groups[1].resources[0].permissions[0].isSensitive).toBe(true);
  });

  it('filters by search query', () => {
    const groups = groupPermissionCatalog(SAMPLE, 'قیمت خرید');
    expect(groups).toHaveLength(1);
    expect(groups[0].category).toBe('مالی');
  });

  it('still flattens resource groups for the legacy helper', () => {
    const flat = groupPermissionsByResource(SAMPLE);
    expect(flat.map((g) => g.resourceId)).toContain('نبض:orders');
    expect(resourcePrefix('products:manage-taxonomy')).toBe('products');
  });

  it('treats pending overrides as the effective grant', () => {
    expect(isPermissionEnabled('orders:write', ['orders:read'], { 'orders:write': true })).toBe(true);
    expect(isPermissionEnabled('orders:read', ['orders:read'], { 'orders:read': false })).toBe(false);
  });

  it('applies pending toggles onto the committed set', () => {
    expect(applyPendingToCommitted(
      ['orders:read', 'orders:write'],
      { 'orders:write': false, 'users:admin': true },
    )).toEqual(['orders:read', 'users:admin']);
  });
});
