import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeIdentityCollections,
  hydrateIdentityCollections,
  validateAccountNumber,
  validateIranIban,
  validateOrganizationPhone,
  iranIbanBankCode,
  primaryPhone,
  primaryAddress,
  primaryBankAccount,
} from '../domain/organizationIdentity/collections.js';

describe('organization identity collections', () => {
  it('validates Iranian IBAN structure and checksum', () => {
    assert.equal(validateIranIban('IR82 0550 0181 0020 7595 4370 01').ok, true);
    assert.equal(validateIranIban('IR820550018100207595437001').iban, 'IR820550018100207595437001');
    assert.equal(validateIranIban('IR000000000000000000000000').ok, false);
    assert.equal(validateIranIban('').ok, true);
  });

  it('extracts IBAN bank code', () => {
    assert.equal(iranIbanBankCode('IR820550018100207595437001'), '055');
  });

  it('keeps account-number separators and leading zeros', () => {
    assert.equal(validateAccountNumber('010.20-30').accountNumber, '010.20-30');
    assert.equal(validateAccountNumber('181-2-7595437-1').ok, true);
    assert.equal(validateAccountNumber('۰۱۰.۲۰-۳۰').accountNumber, '010.20-30');
    assert.equal(validateAccountNumber('abc').ok, false);
    assert.equal(validateAccountNumber('12--34').ok, false);
    assert.equal(validateAccountNumber('').ok, false);
  });

  it('validates organization phones and preserves leading zero', () => {
    assert.equal(validateOrganizationPhone('02171683000').ok, true);
    assert.equal(validateOrganizationPhone('۰۲۱-۷۱۶۸۳۰۰۰').number, '021-71683000');
    assert.equal(validateOrganizationPhone('abc').ok, false);
    assert.equal(validateOrganizationPhone('123').ok, false);
    assert.equal(validateOrganizationPhone('021-11111111').ok, true);
  });

  it('explicit isPrimary wins; otherwise first item; legacy scalars wrap', () => {
    const fromLegacy = normalizeIdentityCollections({
      legalName: 'شرکت پترو فولاد نیکان تست',
      phone: '021-11111111',
      province: 'تهران',
      city: 'تهران',
      officialAddress: 'میرداماد',
      bankName: 'بانک پاسارگاد',
      bankAccountNumber: '210.8100.20600165.1',
      iban: 'IR890570021081020600165101',
    });
    assert.equal(fromLegacy.ok, true);
    assert.equal(fromLegacy.collections.phones[0].number, '021-11111111');
    assert.equal(fromLegacy.collections.phones[0].isPrimary, true);
    assert.equal(fromLegacy.collections.phones[0].type, undefined);
    assert.equal(fromLegacy.primary.phone, '021-11111111');
    assert.equal(fromLegacy.collections.addresses[0].provinceCode, 'TEH');
    assert.equal(fromLegacy.collections.addresses[0].address, 'میرداماد');
    assert.equal(fromLegacy.collections.bankAccounts[0].bankCode, '057');
    assert.equal(fromLegacy.collections.bankAccounts[0].accountHolderName, 'شرکت پترو فولاد نیکان تست');
    assert.ok(fromLegacy.collections.phones[0].id);
    assert.equal(fromLegacy.collections.phones[0].sortOrder, 0);

    const identity = {
      phones: ['021-11111111', '021-22222222'],
      phone: 'ignored',
      addresses: [
        { province: 'تهران', city: 'تهران', officialAddress: 'A' },
        { province: 'اصفهان', city: 'اصفهان', officialAddress: 'B' },
      ],
    };
    assert.equal(primaryPhone(identity), '021-11111111');
    assert.equal(primaryAddress(identity).officialAddress, 'A');

    const structured = hydrateIdentityCollections({
      phones: [
        { id: 'orgph_keep', sortOrder: 0, label: 'دفتر مرکزی', type: 'landline', number: '021-33333333' },
        { id: 'orgph_2', sortOrder: 1, type: 'mobile', number: '09120000000', isPrimary: true },
      ],
    });
    assert.equal(structured.phones[0].id, 'orgph_keep');
    assert.equal(structured.phones[0].isPrimary, false);
    assert.equal(structured.phones[1].isPrimary, true);
    assert.equal(structured.phones[0].type, undefined);
    assert.equal(primaryPhone(structured), '09120000000');
  });

  it('normalizes explicit primary onto legacy scalars', () => {
    const res = normalizeIdentityCollections({
      legalName: 'شرکت تست',
      phones: [
        { number: '021-11111111' },
        { number: '021-22222222', isPrimary: true },
      ],
      addresses: [
        { province: 'تهران', city: 'تهران', officialAddress: 'A' },
        { province: 'اصفهان', city: 'اصفهان', officialAddress: 'B', isPrimary: true },
      ],
      bankAccounts: [
        { bankCode: '055', accountHolderName: 'شرکت تست', accountNumber: '181-2-7595437-1', iban: 'IR820550018100207595437001' },
        { bankCode: '057', accountHolderName: 'شرکت تست', accountNumber: '210.8100.20600165.1', iban: 'IR890570021081020600165101', isPrimary: true },
      ],
    });
    assert.equal(res.ok, true);
    assert.equal(res.primary.phone, '021-22222222');
    assert.equal(res.primary.officialAddress, 'B');
    assert.equal(res.primary.bankName, 'بانک پاسارگاد');
    assert.equal(res.collections.phones.filter((p) => p.isPrimary).length, 1);
    assert.equal(primaryBankAccount(res.collections).bankCode, '057');
  });

  it('rejects IBAN that does not belong to the selected bank', () => {
    const res = normalizeIdentityCollections({
      legalName: 'شرکت تست',
      bankAccounts: [{
        bankCode: '057',
        accountHolderName: 'شرکت تست',
        accountNumber: '210.8100.20600165.1',
        iban: 'IR820550018100207595437001',
      }],
    });
    assert.equal(res.ok, false);
    assert.equal(res.message, 'شماره شبا متعلق به بانک انتخاب‌شده نیست.');
  });

  it('rejects invalid organization phone on save', () => {
    const res = normalizeIdentityCollections({
      phones: [{ number: 'abc-xyz' }],
    });
    assert.equal(res.ok, false);
  });

  it('rejects city that does not belong to province', () => {
    const res = normalizeIdentityCollections({
      addresses: [{ province: 'تهران', city: 'شیراز', officialAddress: 'x' }],
    });
    assert.equal(res.ok, false);
  });

  it('requires account holder', () => {
    const banks = normalizeIdentityCollections({
      bankAccounts: [{ bankCode: '055', accountNumber: '181-2-7595437-1', iban: 'IR820550018100207595437001' }],
    });
    assert.equal(banks.ok, false);
  });
});
