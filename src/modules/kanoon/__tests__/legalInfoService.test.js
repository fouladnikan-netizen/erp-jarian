import { beforeEach, describe, expect, it } from 'vitest';
import { useContactsStore } from '../../../stores/useContactsStore.js';
import { updateCompanyLegalInfo } from '../legalInfoService.js';

const COMPANY_ID = 99011;

describe('Kanoon legalInfoService', () => {
  beforeEach(() => {
    useContactsStore.setState({
      contacts: [
        {
          id: COMPANY_ID,
          name: 'شرکت حقوقی تست',
          nationalId: '10101010101',
          officialSpecs: {
            registrationNumber: '111',
            economicCode: '222',
            address: 'تهران',
            keepMe: 'preserved',
          },
          governance: {
            ceo: { name: 'قدیم', nationalId: '001', validUntil: '1403/01/01' },
            boardMembers: [{ role: 'عضو', name: 'الف', nationalId: '002' }],
            boardValidUntil: '1403/06/01',
            signatureRight: 'قدیم',
            keepGov: 'preserved',
          },
        },
      ],
    });
  });

  it('updateCompanyLegalInfo persists legal fields via contacts store', () => {
    const ok = updateCompanyLegalInfo(COMPANY_ID, {
      nationalId: ' 99999999999 ',
      registrationNumber: '555',
      establishmentDate: '1390/01/01',
      economicCode: '333',
      postalCode: '1234567890',
      latestCapital: '۱۰۰۰',
      website: 'https://example.com',
      phone: '02111111111',
      latestGazette: 'آگهی',
      address: 'اصفهان',
      ceoName: 'مدیر جدید',
      ceoNationalId: '1234567890',
      ceoValidUntil: '1405/01/01',
      boardMembers: [
        { role: 'رئیس', name: 'ب', nationalId: '003' },
        { role: 'خالی', name: '  ', nationalId: '  ' },
      ],
      boardValidUntil: '1405/06/01',
      signatureRight: 'حق امضای جدید',
    });

    expect(ok).toBe(true);

    const company = useContactsStore.getState().contacts.find((c) => c.id === COMPANY_ID);
    expect(company.nationalId).toBe('99999999999');
    expect(company.officialSpecs.registrationNumber).toBe('555');
    expect(company.officialSpecs.address).toBe('اصفهان');
    expect(company.officialSpecs.keepMe).toBe('preserved');
    expect(company.governance.ceo.name).toBe('مدیر جدید');
    expect(company.governance.boardMembers).toHaveLength(1);
    expect(company.governance.boardMembers[0].name).toBe('ب');
    expect(company.governance.signatureRight).toBe('حق امضای جدید');
    expect(company.governance.keepGov).toBe('preserved');
  });

  it('updateCompanyLegalInfo returns false for unknown company', () => {
    expect(updateCompanyLegalInfo(404, { nationalId: '1' })).toBe(false);
  });
});
