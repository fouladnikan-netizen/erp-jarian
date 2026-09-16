import { apiClient } from '../client';
import { leadFromApi, leadToApi } from '../mappers/leadMapper';
import { useMockApi } from '../useMockApi';
import { LEAD_STATUS } from '../../modules/ofogh/domain/lead.constants.js';

/**
 * Only path for persisted Raw Lead reads/writes when API mode is on.
 * Mock mode returns null / no-op signals so the store keeps local semantics for dev.
 */
export const LeadRepository = {
  async listLeads(params = {}) {
    if (useMockApi()) return null;
    const { data } = await apiClient.get('/leads', { params });
    return (data.items || []).map(leadFromApi);
  },

  async getLead(id) {
    if (useMockApi()) return null;
    const { data } = await apiClient.get(`/leads/${id}`);
    return leadFromApi(data.lead);
  },

  async createLead(lead) {
    if (useMockApi()) return null;
    const { data } = await apiClient.post('/leads', leadToApi(lead));
    return leadFromApi(data.lead);
  },

  async updateLead(id, patch) {
    if (useMockApi()) return null;
    const { data } = await apiClient.patch(`/leads/${id}`, leadToApi(patch));
    return leadFromApi(data.lead);
  },

  async changeLeadStatus(id, status) {
    if (useMockApi()) return null;
    const { data } = await apiClient.patch(`/leads/${id}/status`, { status });
    return leadFromApi(data.lead);
  },

  async archiveLead(id, { reason } = {}) {
    if (useMockApi()) return null;
    const { data } = await apiClient.post(`/leads/${id}/archive`, { reason });
    return data;
  },

  async movePipelineStage(id, stageId) {
    if (useMockApi()) return null;
    const { data } = await apiClient.patch(`/leads/${id}/pipeline-stage`, { stageId });
    return leadFromApi(data.lead);
  },

  async convertLead(id, { nationalId } = {}) {
    if (useMockApi()) return null;
    const { data } = await apiClient.post(`/leads/${id}/convert`, { nationalId });
    return {
      lead: leadFromApi(data.lead),
      company: data.company,
      companyId: data.companyId,
      conversionMode: data.conversionMode,
    };
  },

  async findCompanyMatches(q, params = {}) {
    if (useMockApi()) return [];
    const { data } = await apiClient.get('/leads/company-matches', {
      params: { q, ...params },
    });
    return data.items || [];
  },
};

export { LEAD_STATUS };
export default LeadRepository;
