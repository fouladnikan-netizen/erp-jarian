import { describe, expect, it } from 'vitest';
import {
  formatProductCatalogName,
  formatProductDisplayText,
  presentCatalogProduct,
  toPersianDigits,
} from '../productDisplayText';

describe('productDisplayText (DDL-67)', () => {
  it('converts Latin and Arabic-Indic digits to Persian without mixing scripts', () => {
    expect(toPersianDigits('ورق استیل 304L ضخامت 2 میل 1500×3000')).toBe('ورق استیل ۳۰۴L ضخامت ۲ میل ۱۵۰۰×۳۰۰۰');
    expect(formatProductDisplayText('ضخامت ٢.٥ میل')).toBe('ضخامت ۲.۵ میل');
    expect(formatProductDisplayText('ضخامت ۲ میل')).toBe('ضخامت ۲ میل');
    expect(formatProductDisplayText('Schedule 40')).toBe('Schedule ۴۰');
    expect(formatProductDisplayText(null)).toBe('');
    expect(formatProductDisplayText('ورق استیل 304L ضخامت ۲ میل')).not.toMatch(/[0-9]/);
  });

  it('folds leftover ASCII thickness next to an already-Persian NPS overlay', () => {
    expect(formatProductDisplayText('۱/۲ اینچ ضخامت 2 میل 1500×3000'))
      .toBe('۱/۲ اینچ ضخامت ۲ میل ۱۵۰۰×۳۰۰۰');
    expect(formatProductDisplayText('۱/۲ اینچ ضخامت 2 میل')).not.toMatch(/[0-9]/);
  });

  it('formatProductCatalogName prefers override and always emits Persian digits', () => {
    expect(formatProductCatalogName({
      generatedName: '۱/۲ اینچ ضخامت 2 میل',
      displayNameOverride: null,
    })).toBe('۱/۲ اینچ ضخامت ۲ میل');
    expect(formatProductCatalogName({
      generatedName: 'ضخامت 3 میل',
      displayNameOverride: 'ورق 304L',
    })).toBe('ورق ۳۰۴L');
    expect(formatProductCatalogName(null)).toBe('');
  });

  it('presentCatalogProduct normalizes generatedName and override without touching SKU', () => {
    const presented = presentCatalogProduct({
      id: 'p1',
      sku: 'JR01020304',
      generatedName: '۱/۲ اینچ ضخامت 2 میل',
      displayNameOverride: 'Schedule 40',
    });
    expect(presented.generatedName).toBe('۱/۲ اینچ ضخامت ۲ میل');
    expect(presented.displayNameOverride).toBe('Schedule ۴۰');
    expect(presented.sku).toBe('JR01020304');
    expect(presented.generatedName).not.toMatch(/[0-9]/);
    expect(presentCatalogProduct(null)).toBeNull();
  });
});
