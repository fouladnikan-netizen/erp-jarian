import { describe, it, expect } from 'vitest';
import {
  countActiveUsers,
  formatRoleLabels,
  formatUserStatus,
} from '../config/usersDisplay.js';

describe('users display helpers', () => {
  it('renders role labels from canonical role objects', () => {
    expect(formatRoleLabels([
      { code: 'admin', labelFa: 'مدیر سیستم' },
      { code: 'sales', labelFa: 'کارشناس فروش' },
    ])).toBe('مدیر سیستم، کارشناس فروش');
  });

  it('renders status from isActive', () => {
    expect(formatUserStatus(true)).toBe('فعال');
    expect(formatUserStatus(false)).toBe('غیرفعال');
  });

  it('counts active users from real list data', () => {
    expect(countActiveUsers([
      { isActive: true },
      { isActive: false },
      { isActive: true },
    ])).toBe(2);
  });
});
