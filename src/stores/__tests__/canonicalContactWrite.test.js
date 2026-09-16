import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../api/useMockApi.js', () => ({
  useMockApi: () => false,
}));

const createMock = vi.fn();
const updateContactMock = vi.fn();
const updateRelationshipMock = vi.fn();
const endRelationshipMock = vi.fn();
const listByCompanyMock = vi.fn();
const getByIdMock = vi.fn();

vi.mock('../../api/repositories/ContactRepository.js', () => ({
  default: {
    create: (...args) => createMock(...args),
    updateContact: (...args) => updateContactMock(...args),
    updateRelationship: (...args) => updateRelationshipMock(...args),
    endRelationship: (...args) => endRelationshipMock(...args),
    listByCompany: (...args) => listByCompanyMock(...args),
  },
}));

vi.mock('../../api/repositories/CompanyRepository.js', () => ({
  default: {
    getById: (...args) => getByIdMock(...args),
    list: vi.fn().mockResolvedValue([]),
    update: vi.fn(),
  },
}));

import { useContactsStore } from '../../stores/useContactsStore.js';

describe('canonical Contact write path (API mode store)', () => {
  beforeEach(() => {
    createMock.mockReset();
    updateContactMock.mockReset();
    updateRelationshipMock.mockReset();
    endRelationshipMock.mockReset();
    listByCompanyMock.mockReset();
    getByIdMock.mockReset();

    useContactsStore.setState({
      contacts: [{
        id: 'co_1',
        companyName: 'Test Co',
        relatedPersons: [{
          id: 'ct_1',
          relationshipId: 'ccr_1',
          fullName: 'Ali',
          mobile: '09121234567',
          jobPosition: 'خرید',
          isPrimary: true,
        }],
      }],
      error: null,
    });

    getByIdMock.mockResolvedValue({
      id: 'co_1',
      companyName: 'Test Co',
      relatedPersons: [{
        id: 'ct_1',
        relationshipId: 'ccr_1',
        fullName: 'Ali Updated',
        mobile: '09121234567',
        jobPosition: 'مدیر',
        isPrimary: true,
      }],
    });
  });

  it('addContactPersonAsync calls ContactRepository.create and refetches company', async () => {
    createMock.mockResolvedValue({ contact: { id: 'ct_new' }, linkedExisting: false });
    getByIdMock.mockResolvedValue({
      id: 'co_1',
      companyName: 'Test Co',
      relatedPersons: [{
        id: 'ct_new',
        fullName: 'Sara',
        mobile: '09129998877',
        jobPosition: 'فروش',
        relationshipId: 'ccr_new',
        isPrimary: false,
      }],
    });

    const id = await useContactsStore.getState().addContactPersonAsync('co_1', {
      fullName: 'Sara',
      mobile: '09129998877',
      jobPosition: 'فروش',
      isPrimary: false,
    });

    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({
      companyId: 'co_1',
      fullName: 'Sara',
      mobile: '09129998877',
      roleTitle: 'فروش',
    }));
    expect(getByIdMock).toHaveBeenCalledWith('co_1');
    expect(id).toBe('ct_new');
  });

  it('updateContactPersonAsync updates contact + relationship without mutating cache optimistically', async () => {
    updateContactMock.mockResolvedValue({ id: 'ct_1', fullName: 'Ali Updated' });
    updateRelationshipMock.mockResolvedValue({ id: 'ccr_1', roleTitle: 'مدیر', isPrimary: true });

    await useContactsStore.getState().updateContactPersonAsync('co_1', 'ct_1', {
      fullName: 'Ali Updated',
      mobile: '09121234567',
      jobPosition: 'مدیر',
      isPrimary: true,
    });

    expect(updateContactMock).toHaveBeenCalled();
    expect(updateRelationshipMock).toHaveBeenCalledWith('ccr_1', expect.objectContaining({
      roleTitle: 'مدیر',
      isPrimary: true,
    }));
    expect(getByIdMock).toHaveBeenCalledWith('co_1');
  });

  it('deleteContactPersonAsync ends relationship (not contact delete)', async () => {
    endRelationshipMock.mockResolvedValue({ ended: true, relationshipId: 'ccr_1' });

    await useContactsStore.getState().deleteContactPersonAsync('co_1', 'ct_1');

    expect(endRelationshipMock).toHaveBeenCalledWith('ccr_1');
    expect(getByIdMock).toHaveBeenCalledWith('co_1');
  });

  it('updateContact blocks relatedPersons writes in API mode', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    useContactsStore.getState().updateContact('co_1', {
      relatedPersons: [{ id: 'shadow', fullName: 'Bad', mobile: '09120000000' }],
    });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
