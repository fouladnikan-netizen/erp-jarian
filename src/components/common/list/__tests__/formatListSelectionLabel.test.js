import { describe, expect, it } from 'vitest';
import { formatListSelectionLabel } from '../formatListSelectionLabel';

describe('formatListSelectionLabel', () => {
  it('returns empty when nothing is selected', () => {
    expect(formatListSelectionLabel(0, 100)).toBe('');
    expect(formatListSelectionLabel(null, 100)).toBe('');
  });

  it('formats partial selection', () => {
    expect(formatListSelectionLabel(3, 500)).toBe('۳ سطر انتخاب شده');
  });

  it('formats full selection', () => {
    expect(formatListSelectionLabel(500, 500)).toBe('تمام ۵۰۰ سطر انتخاب شده');
  });
});
