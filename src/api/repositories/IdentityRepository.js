/**
 * Identity duplicate-check API (DDL-25).
 */
import { apiClient } from '../client';
import { useMockApi } from '../useMockApi';

export const IdentityRepository = {
  async checkCompanyDuplicates(input = {}) {
    if (useMockApi()) return { classification: 'NONE', candidates: [], policy: 'allow' };
    const { data } = await apiClient.post('/identity/matches/company', input);
    return data;
  },

  async checkLeadDuplicates(input = {}) {
    if (useMockApi()) return { classification: 'NONE', candidates: [], policy: 'allow' };
    const { data } = await apiClient.post('/identity/matches/lead', input);
    return data;
  },

  async checkContactDuplicates(input = {}) {
    if (useMockApi()) return { classification: 'NONE', candidates: [], policy: 'allow' };
    const { data } = await apiClient.post('/identity/matches/contact', input);
    return data;
  },
};

export default IdentityRepository;
