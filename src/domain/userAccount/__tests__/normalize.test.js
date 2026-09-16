import { describe, expect, it } from 'vitest';
import { normalizeUserEmail, normalizeUserMobile } from '../normalize.js';

describe('user account normalize (DDL-39)', () => {
  it('canonicalizes Iranian mobiles to 09xxxxxxxxx', () => {
    expect(normalizeUserMobile('+989121234567').mobile).toBe('09121234567');
    expect(normalizeUserMobile('00989121234567').mobile).toBe('09121234567');
    expect(normalizeUserMobile('۰۹۱۲۱۲۳۴۵۶۷').mobile).toBe('09121234567');
    expect(normalizeUserMobile('0912-123-4567').mobile).toBe('09121234567');
  });

  it('rejects invalid mobiles', () => {
    expect(normalizeUserMobile('02188776655').ok).toBe(false);
    expect(normalizeUserMobile('').ok).toBe(false);
  });

  it('lowercases email and treats empty as null', () => {
    expect(normalizeUserEmail('  Test@Example.COM ').email).toBe('test@example.com');
    expect(normalizeUserEmail('   ').email).toBe(null);
    expect(normalizeUserEmail('not-an-email').ok).toBe(false);
  });
});
