import { describe, expect, it } from 'vitest';
import { formatProductSizeDisplay, getProductSizeNumber } from '../productSize';

describe('productSize', () => {
  it('reads numeric size and formats with Persian digits, smallest first', () => {
    const small = { attributeValues: [{ attributeCode: 'size', valueNumber: 8 }] };
    const large = { attributeValues: [{ attributeCode: 'size', valueNumber: 40 }] };
    const none = { attributeValues: [{ attributeCode: 'thickness', valueNumber: 2 }] };

    expect(getProductSizeNumber(small)).toBe(8);
    expect(getProductSizeNumber(large)).toBe(40);
    expect(getProductSizeNumber(none)).toBeNull();
    expect(formatProductSizeDisplay(small)).toBe((8).toLocaleString('fa-IR', { maximumFractionDigits: 4 }));
    expect(formatProductSizeDisplay(none)).toBe('—');

    const ordered = [large, none, small].sort((a, b) => {
      const left = getProductSizeNumber(a);
      const right = getProductSizeNumber(b);
      if (left == null && right == null) return 0;
      if (left == null) return 1;
      if (right == null) return -1;
      return left - right;
    });
    expect(ordered.map(getProductSizeNumber)).toEqual([8, 40, null]);
  });
});
