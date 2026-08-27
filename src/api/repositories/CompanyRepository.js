import { apiClient } from '../client';
import { contactFromApi, contactToApi } from '../mappers/companyMapper';
import { useMockApi } from '../useMockApi';
import { initialContacts } from '../../modules/kanoon/contactsData';
import { LIFECYCLE_STAGES } from '../../domain/party';

function seedFromMock() {
  return initialContacts.map((contact) => ({
    ...contact,
    recordType: contact.recordType || 'CUSTOMER',
    lifecycle_stage: contact.lifecycle_stage || LIFECYCLE_STAGES.COLD_LEAD,
    relatedPersons: contact.relatedPersons || [],
    interactions: contact.interactions || [],
  }));
}

export const CompanyRepository = {
  async list(params = {}) {
    if (useMockApi()) {
      return seedFromMock();
    }
    const { data } = await apiClient.get('/companies', { params });
    return (data.items || []).map(contactFromApi);
  },

  async getById(id) {
    if (useMockApi()) {
      const found = seedFromMock().find((c) => String(c.id) === String(id));
      return found || null;
    }
    const { data } = await apiClient.get(`/companies/${id}`);
    return contactFromApi(data.company);
  },

  async create(contact) {
    if (useMockApi()) {
      return contact;
    }
    const { data } = await apiClient.post('/companies', contactToApi(contact));
    return contactFromApi(data.company);
  },

  /**
   * National ID → Backend identity resolver (Linka) → Company create/link.
   * @param {{ nationalId: string, entityType?: string }} input
   * @returns {Promise<{ company: object, created: boolean, mode: string }>}
   */
  async createFromIdentity(input = {}) {
    const nationalId = String(input.nationalId || '').replace(/\D/g, '');
    const rawType = String(input.entityType || 'CUSTOMER').toUpperCase();
    const entityType = rawType === 'SUPPLIER' ? 'SUPPLIER' : 'CUSTOMER';

    if (useMockApi()) {
      const existing = seedFromMock().find(
        (c) => String(c.nationalId || '').replace(/\D/g, '') === nationalId,
      );
      if (existing) {
        return { company: existing, created: false, mode: 'existing' };
      }
      const company = {
        id: `co_mock_${Date.now().toString(36)}`,
        companyName: `شرکت ${nationalId}`,
        name: `شرکت ${nationalId}`,
        entityType,
        nationalId,
        province: null,
        activityDomain: null,
        recordType: 'CUSTOMER',
        personType: 'legal',
        lifecycle_stage: LIFECYCLE_STAGES.COLD_LEAD,
        relatedPersons: [],
        interactions: [],
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      return { company, created: true, mode: 'create_new' };
    }

    const { data } = await apiClient.post('/companies/from-identity', {
      nationalId,
      entityType,
      activityDomain: input.activityDomain || null,
    });
    return {
      company: contactFromApi(data.company),
      created: Boolean(data.created),
      mode: data.mode || (data.created ? 'create_new' : 'existing'),
      enrichment: data.enrichment || null,
    };
  },

  async update(id, patch) {
    if (useMockApi()) {
      return { id, ...patch };
    }
    const { data } = await apiClient.patch(`/companies/${id}`, contactToApi(patch));
    return contactFromApi(data.company);
  },

  /**
   * POST /companies/:id/enrich-from-linka — BaseInfo + CompanyPerson + Gazette.
   * @param {string} companyId
   */
  async enrichFromLinka(companyId) {
    if (useMockApi()) {
      const company = await this.getById(companyId);
      return {
        company,
        sections: { base: 'ok', persons: 'ok', gazette: 'ok' },
        sectionErrors: { base: null, persons: null, gazette: null },
        complete: true,
        message: 'mock enrichment',
      };
    }
    const { data } = await apiClient.post(`/companies/${companyId}/enrich-from-linka`);
    return {
      company: contactFromApi(data.company),
      sections: data.sections || {},
      sectionErrors: data.sectionErrors || {},
      complete: Boolean(data.complete),
      message: data.message || '',
    };
  },
};

export default CompanyRepository;
