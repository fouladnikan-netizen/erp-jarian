import { describe, expect, it } from 'vitest';
import {
  LETTER_ROLE_DISPLAY_TITLES,
  getLetterSignatory,
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
