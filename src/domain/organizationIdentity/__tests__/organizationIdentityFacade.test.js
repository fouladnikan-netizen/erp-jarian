import { describe, expect, it } from 'vitest';
import {
  isDocumentOrganizationPopulated,
  toDocumentOrganization,
} from '../organizationIdentityFacade.js';

describe('toDocumentOrganization', () => {
  it('maps identity fields and never returns undefined', () => {
    const snap = toDocumentOrganization({
      tradeName: 'آزمایش',
      phone: 'TEST-A',
      extra: 'ignored',
    });
    expect(snap.tradeName).toBe('آزمایش');
    expect(snap.phone).toBe('TEST-A');
    expect(snap.nationalId).toBe('');
    expect(snap.officialAddress).toBe('');
  });

  it('uses first phone/address from collections as snapshot values', () => {
    const snap = toDocumentOrganization({
      tradeName: 'آزمایش',
      phone: 'OLD',
      phones: ['021-11111111', '021-22222222'],
      addresses: [
        { province: 'تهران', city: 'تهران', officialAddress: 'میرداماد' },
        { province: 'اصفهان', city: 'اصفهان', officialAddress: 'چهارباغ' },
      ],
    });
    expect(snap.phone).toBe('021-11111111');
    expect(snap.officialAddress).toBe('میرداماد');
    expect(snap.province).toBe('تهران');

    const structured = toDocumentOrganization({
      tradeName: 'آزمایش',
      phone: 'OLD',
      phones: [
        { id: 'orgph_1', sortOrder: 0, type: 'landline', number: '021-33333333' },
        { id: 'orgph_2', sortOrder: 1, type: 'mobile', number: '021-22222222' },
      ],
      addresses: [
        {
          id: 'orgad_1',
          sortOrder: 0,
          provinceCode: 'TEH',
          provinceName: 'تهران',
          cityCode: 'TEH-TEH',
          cityName: 'تهران',
          address: 'TEST ADDRESS A',
        },
      ],
    });
    expect(structured.phone).toBe('021-33333333');
    expect(structured.officialAddress).toBe('TEST ADDRESS A');
  });

  it('uses explicit isPrimary over first item', () => {
    const snap = toDocumentOrganization({
      tradeName: 'آزمایش',
      phones: [
        { id: 'orgph_1', sortOrder: 0, number: '021-11111111' },
        { id: 'orgph_2', sortOrder: 1, number: '021-22222222', isPrimary: true },
      ],
      addresses: [
        { provinceName: 'تهران', cityName: 'تهران', address: 'A' },
        { provinceName: 'اصفهان', cityName: 'اصفهان', address: 'B', isPrimary: true },
      ],
    });
    expect(snap.phone).toBe('021-22222222');
    expect(snap.officialAddress).toBe('B');
    expect(snap.province).toBe('اصفهان');
  });

  it('treats empty identity as unpopulated', () => {
    expect(isDocumentOrganizationPopulated(toDocumentOrganization(null))).toBe(false);
    expect(isDocumentOrganizationPopulated({ phone: 'TEST-A' })).toBe(true);
  });
});
