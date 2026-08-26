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

  async update(id, patch) {
    if (useMockApi()) {
      return { id, ...patch };
    }
    const { data } = await apiClient.patch(`/companies/${id}`, contactToApi(patch));
    return contactFromApi(data.company);
  },
};

export default CompanyRepository;
