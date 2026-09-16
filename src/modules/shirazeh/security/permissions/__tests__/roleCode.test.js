import { describe, expect, it } from 'vitest';
import { activeUserWarning, isValidRoleCode, normalizeRoleCode, roleCreateBlockReason, roleNameConflictMessage } from '../roleCode.js';

describe('roleCode', () => {
  it('accepts seed-style codes and rejects invalid ones', () => {
    expect(isValidRoleCode('sales_manager')).toBe(true);
    expect(isValidRoleCode('QA_Role')).toBe(true);
    expect(normalizeRoleCode('QA_Role')).toBe('qa_role');
    expect(isValidRoleCode('1bad')).toBe(false);
    expect(isValidRoleCode('has-dash')).toBe(false);
  });

  it('explains why create stays disabled until the Persian name exists', () => {
    expect(roleCreateBlockReason('')).toMatch(/نام نقش/);
    expect(roleCreateBlockReason('مدیر انبار')).toBe('');
  });

  it('builds the in-use warning only when count > 0', () => {
    expect(activeUserWarning(0)).toBe('');
    expect(activeUserWarning(5)).toBe('این نقش به 5 کاربر فعال اختصاص دارد.');
  });

  it('explains active vs inactive duplicate names', () => {
    expect(roleNameConflictMessage('مدیر فروش', true)).toBe('نقش «مدیر فروش» قبلاً وجود دارد.');
    expect(roleNameConflictMessage('مدیر فروش', false)).toBe(
      'نقش «مدیر فروش» قبلاً ایجاد شده اما غیرفعال است.',
    );
  });
});
