import { describe, expect, it } from 'vitest';
import {
  LETTER_ORG_LINE,
  LETTER_ROLE_DISPLAY_TITLES,
  getLetterSignatory,
  resolveLetterOrganization,
  resolveLetterRoleTitle,
} from '../letterDocument';

describe('resolveLetterRoleTitle', () => {
  it('maps Persian internal roles to letter titles only', () => {
    expect(resolveLetterRoleTitle('شوالیه')).toBe('کارشناس فروش');
    expect(resolveLetterRoleTitle('کاشف')).toBe('مدیر بازرگانی');
    expect(resolveLetterRoleTitle('دیده‌بان')).toBe('مدیر حسابداری');
    expect(resolveLetterRoleTitle('راهبر')).toBe('مدیر فروش');
    expect(resolveLetterRoleTitle('بازو')).toBe('مدیر عملیات');
  });

  it('maps system role keys', () => {
    expect(resolveLetterRoleTitle('knight')).toBe('کارشناس فروش');
    expect(resolveLetterRoleTitle('explorer')).toBe('مدیر بازرگانی');
    expect(resolveLetterRoleTitle('watcher')).toBe('مدیر حسابداری');
    expect(resolveLetterRoleTitle('leader')).toBe('مدیر فروش');
    expect(resolveLetterRoleTitle('branch')).toBe('مدیر عملیات');
  });

  it('passes through already-mapped letter titles', () => {
    expect(resolveLetterRoleTitle('مدیر فروش')).toBe('مدیر فروش');
  });

  it('returns empty for unknown roles', () => {
    expect(resolveLetterRoleTitle('مدیرعامل')).toBe('');
    expect(resolveLetterRoleTitle('')).toBe('');
  });

  it('exposes the five letter titles', () => {
    expect(Object.keys(LETTER_ROLE_DISPLAY_TITLES)).toHaveLength(5);
  });
});

describe('getLetterSignatory', () => {
  it('uses letter display title for current leader role', () => {
    expect(getLetterSignatory('leader').title).toBe('مدیر فروش');
    expect(getLetterSignatory('راهبر').title).toBe('مدیر فروش');
  });
});

describe('resolveLetterOrganization', () => {
  const live = { tradeName: 'Live Co', phone: 'TEST-B' };

  it('uses live identity for unlocked drafts', () => {
    expect(resolveLetterOrganization({ isLocked: false }, live).phone).toBe('TEST-B');
  });

  it('uses first structured phone for unlocked drafts', () => {
    const withPhones = {
      tradeName: 'Live Co',
      phone: 'ignored',
      phones: [
        { id: 'orgph_1', number: '021-11111111' },
        { id: 'orgph_2', number: '021-22222222' },
      ],
    };
    expect(resolveLetterOrganization({ isLocked: false }, withPhones).phone).toBe('021-11111111');
  });

  it('freezes snapshot on locked letters after identity changes', () => {
    const locked = {
      isLocked: true,
      organizationSnapshot: { tradeName: 'Org Snap Co', phone: 'TEST-A' },
    };
    expect(resolveLetterOrganization(locked, live).phone).toBe('TEST-A');
    expect(resolveLetterOrganization(locked, live).tradeName).toBe('Org Snap Co');
  });

  it('uses LETTER_ORG_LINE for locked letters without snapshot (never live)', () => {
    const org = resolveLetterOrganization({ isLocked: true }, live);
    expect(org.tradeName).toBe(LETTER_ORG_LINE);
    expect(org.phone).not.toBe('TEST-B');
  });
});
