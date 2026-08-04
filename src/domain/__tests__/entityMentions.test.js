import { describe, expect, it } from 'vitest';
import {
  normalizeOrderCode,
  orderDeepLinkPath,
  tokenizeEntityMentions,
} from '../../components/navigation/entityMentions.js';

describe('entityMentions', () => {
  it('normalizes Persian digits in order codes', () => {
    expect(normalizeOrderCode('JR۰۵۰۱۱۱۰۰۲')).toBe('JR050111002');
  });

  it('builds nabz order deep link', () => {
    expect(orderDeepLinkPath('JR050111002')).toBe('/nabz/order/JR050111002');
  });

  it('tokenizes order codes inside free text', () => {
    const tokens = tokenizeEntityMentions('پرداخت مرتبط با سفارش JR050112001 انجام شد');
    const link = tokens.find((t) => t.type === 'link');
    expect(link?.value).toBe('JR050112001');
    expect(link?.path).toBe('/nabz/order/JR050112001');
    expect(link?.kind).toBe('order');
  });

  it('tokenizes company names when provided', () => {
    const tokens = tokenizeEntityMentions('جلسه با فولاد پارس', {
      companies: [{ id: 1, name: 'فولاد پارس' }],
    });
    const link = tokens.find((t) => t.type === 'link');
    expect(link?.value).toBe('فولاد پارس');
    expect(link?.path).toBe('/kanoon/contact/1');
    expect(link?.kind).toBe('company');
  });
});
