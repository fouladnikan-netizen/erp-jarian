/**
 * Organization Identity (DDL-28) — real backend-persisted singleton.
 * GET empty until first PUT. Mock mode keeps an in-memory copy only.
 */
import { apiClient } from '../client';
import { useMockApi } from '../useMockApi';
import { primaryAddress, primaryBankAccount, primaryPhone } from '../../domain/organizationIdentity/collections.js';

export const EMPTY_ORGANIZATION_IDENTITY = Object.freeze({
  tradeName: '',
  legalName: '',
  nationalId: '',
  legalPersonType: '',
  registrationNumber: '',
  economicNumber: '',
  phones: [],
  addresses: [],
  bankAccounts: [],
  phone: '',
  email: '',
  website: '',
  fax: '',
  province: '',
  city: '',
  officialAddress: '',
  postalCode: '',
  bankName: '',
  bankAccountNumber: '',
  iban: '',
  logoFileId: null,
  logo: null,
  updatedAt: null,
  updatedBy: null,
});

let mockIdentity = { ...EMPTY_ORGANIZATION_IDENTITY };
let mockLogo = null;

function dataUrlFromLogo(logo) {
  if (!logo?.dataBase64) return '';
  return `data:${logo.mimeType || 'image/png'};base64,${logo.dataBase64}`;
}

export const OrganizationIdentityRepository = {
  async get() {
    if (useMockApi()) return { ...mockIdentity };
    const { data } = await apiClient.get('/organization-identity');
    return { ...EMPTY_ORGANIZATION_IDENTITY, ...(data.organizationIdentity || {}) };
  },

  async put(payload) {
    if (useMockApi()) {
      const phones = Array.isArray(payload.phones) ? payload.phones : mockIdentity.phones;
      const addresses = Array.isArray(payload.addresses) ? payload.addresses : mockIdentity.addresses;
      const bankAccounts = Array.isArray(payload.bankAccounts) ? payload.bankAccounts : mockIdentity.bankAccounts;
      const next = {
        ...EMPTY_ORGANIZATION_IDENTITY,
        ...payload,
        phones,
        addresses,
        bankAccounts,
      };
      const addr = primaryAddress(next);
      const bank = primaryBankAccount(next);
      mockIdentity = {
        ...next,
        phone: primaryPhone(next),
        province: addr.province,
        city: addr.city,
        officialAddress: addr.officialAddress,
        postalCode: addr.postalCode,
        bankName: bank.bankName,
        bankAccountNumber: bank.accountNumber,
        iban: bank.iban,
        logoFileId: mockIdentity.logoFileId,
        logo: mockIdentity.logo,
      };
      return { ...mockIdentity };
    }
    const { data } = await apiClient.put('/organization-identity', payload);
    return { ...EMPTY_ORGANIZATION_IDENTITY, ...(data.organizationIdentity || {}) };
  },

  async getLogo() {
    if (useMockApi()) {
      if (!mockLogo) return null;
      return { ...mockLogo, dataUrl: dataUrlFromLogo(mockLogo) };
    }
    try {
      const { data } = await apiClient.get('/organization-identity/logo');
      const logo = data.logo;
      if (!logo) return null;
      return { ...logo, dataUrl: dataUrlFromLogo(logo) };
    } catch (err) {
      if (err?.response?.status === 404) return null;
      throw err;
    }
  },

  async putLogo({ fileName, mimeType, dataBase64 }) {
    if (useMockApi()) {
      mockLogo = {
        id: 'orglogo_mock',
        fileName,
        mimeType,
        sizeBytes: Math.floor((String(dataBase64 || '').length * 3) / 4),
        dataBase64,
      };
      mockIdentity = {
        ...mockIdentity,
        logoFileId: mockLogo.id,
        logo: { fileName: mockLogo.fileName, mimeType: mockLogo.mimeType, sizeBytes: mockLogo.sizeBytes },
      };
      return { ...mockIdentity };
    }
    const { data } = await apiClient.put('/organization-identity/logo', { fileName, mimeType, dataBase64 });
    return { ...EMPTY_ORGANIZATION_IDENTITY, ...(data.organizationIdentity || {}) };
  },
};

export default OrganizationIdentityRepository;
