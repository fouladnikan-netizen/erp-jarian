import { describe, expect, it } from 'vitest';
import { formatProductDisplayText, toPersianDigits } from '../productDisplayText';

describe('productDisplayText (DDL-67)', () => {
  it('converts Latin and Arabic-Indic digits to Persian without mixing scripts', () => {
    expect(toPersianDigits('ورق استیل 304L ضخامت 2 میل 1500×3000')).toBe('ورق استیل ۳۰۴L ضخامت ۲ میل ۱۵۰۰×۳۰۰۰');
    expect(formatProductDisplayText('ضخامت ٢.٥ میل')).toBe('ضخامت ۲.۵ میل');
    expect(formatProductDisplayText('ضخامت ۲ میل')).toBe('ضخامت ۲ میل');
    expect(formatProductDisplayText('Schedule 40')).toBe('Schedule ۴۰');
    expect(formatProductDisplayText(null)).toBe('');
    expect(formatProductDisplayText('ورق استیل 304L ضخامت ۲ میل')).not.toMatch(/[0-9]/);
  });
});
