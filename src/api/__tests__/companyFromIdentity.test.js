import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../client', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

vi.mock('../useMockApi.js', () => ({
  useMockApi: () => false,
}));

const { apiClient } = await import('../client');
const { CompanyRepository } = await import('../repositories/CompanyRepository.js');
const { useContactsStore } = await import('../../stores/useContactsStore.js');

describe('Kanoon createFromIdentity (SERVER_FIRST)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useContactsStore.setState({ contacts: [], error: null });
  });

  it('success → company appears in cache after API', async () => {
    apiClient.post.mockResolvedValue({
      data: {
        created: true,
        mode: 'create_new',
        company: {
          id: 'co_new_1',
          name: 'شرکت لینکا',
          entityType: 'CUSTOMER',
          nationalId: '12345678901',
          province: 'تهران',
          activityDomain: 'بازرگانی',
          payload: { linkaIdentity: { city: 'تهران' } },
        },
      },
    });

    const before = useContactsStore.getState().contacts.length;
    const result = await useContactsStore.getState().createFromIdentityAsync({
      nationalId: '12345678901',
      entityType: 'customer',
      activityDomain: 'بازرگانی',
    });

    expect(apiClient.post).toHaveBeenCalledWith('/companies/from-identity', {
      nationalId: '12345678901',
      entityType: 'CUSTOMER',
      activityDomain: 'بازرگانی',
    });
    expect(result.created).toBe(true);
    expect(result.company.id).toBe('co_new_1');
    expect(useContactsStore.getState().contacts.length).toBe(before + 1);
    expect(useContactsStore.getState().contacts[0].companyName).toBe('شرکت لینکا');
    expect(useContactsStore.getState().contacts[0].entityType).toBe('customer');
  });

  it('failure → cache unchanged', async () => {
    apiClient.post.mockRejectedValue({
      response: {
        data: {
          error: 'COMPANY_IDENTITY_NOT_FOUND',
          message: 'not found',
        },
      },
    });

    const before = [...useContactsStore.getState().contacts];
    await expect(
      useContactsStore.getState().createFromIdentityAsync({
        nationalId: '12345678901',
      }),
    ).rejects.toBeTruthy();
    expect(useContactsStore.getState().contacts).toEqual(before);
  });

  it('existing on server returns canonical company from API', async () => {
    useContactsStore.setState({
      contacts: [{
        id: 'co_stale_cache',
        nationalId: '12345678901',
        companyName: 'کش قدیمی',
        recordType: 'CUSTOMER',
      }],
    });
    apiClient.post.mockResolvedValue({
      data: {
        created: false,
        mode: 'existing',
        company: {
          id: 'co_exist',
          name: 'شرکت واقعی از سرور',
          nationalId: '12345678901',
          entityType: 'CUSTOMER',
          payload: { linkaIdentity: { provider: 'LINKA' } },
        },
      },
    });
    const result = await useContactsStore.getState().createFromIdentityAsync({
      nationalId: '12345678901',
    });
    expect(apiClient.post).toHaveBeenCalled();
    expect(result.company.id).toBe('co_exist');
    expect(result.company.companyName).toBe('شرکت واقعی از سرور');
  });

  it('repository maps API response', async () => {
    apiClient.post.mockResolvedValue({
      data: {
        created: false,
        mode: 'existing',
        company: {
          id: 'co_x',
          name: 'X',
          nationalId: '10987654321',
          entityType: 'CUSTOMER',
          payload: {},
        },
      },
    });
    const result = await CompanyRepository.createFromIdentity({
      nationalId: '10987654321',
      entityType: 'CUSTOMER',
    });
    expect(result.mode).toBe('existing');
    expect(result.company.id).toBe('co_x');
  });
});
