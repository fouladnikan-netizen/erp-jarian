import { describe, expect, it } from 'vitest';
import { MAX_LOGO_BYTES, validateLogoFile } from '../logoFile.js';
import { toDocumentOrganization } from '../organizationIdentityFacade.js';

describe('validateLogoFile', () => {
  it('accepts png/jpeg/webp under 2MB', () => {
    expect(validateLogoFile({ name: 'a.png', type: 'image/png', size: 1200 }).ok).toBe(true);
    expect(validateLogoFile({ name: 'a.jpg', type: 'image/jpeg', size: 1200 }).ok).toBe(true);
    expect(validateLogoFile({ name: 'a.webp', type: 'image/webp', size: 1200 }).ok).toBe(true);
  });

  it('rejects svg and non-images', () => {
    expect(validateLogoFile({ name: 'a.svg', type: 'image/svg+xml', size: 100 }).ok).toBe(false);
    expect(validateLogoFile({ name: 'a.pdf', type: 'application/pdf', size: 100 }).ok).toBe(false);
  });

  it('rejects oversized files', () => {
    expect(validateLogoFile({ name: 'a.png', type: 'image/png', size: MAX_LOGO_BYTES + 1 }).ok).toBe(false);
  });
});

describe('toDocumentOrganization ignores logo', () => {
  it('does not copy logoFileId into document snapshots', () => {
    const snap = toDocumentOrganization({
      tradeName: 'آزمایش',
      phone: 'TEST-A',
      logoFileId: 'orglogo_1',
    });
    expect(snap.tradeName).toBe('آزمایش');
    expect(snap.logoFileId).toBeUndefined();
  });
});
