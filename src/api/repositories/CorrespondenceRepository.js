import { apiClient } from '../client';
import { correspondenceFromApi, correspondenceToApi, attachmentFromApi } from '../mappers/correspondenceMapper';
import { useMockApi } from '../useMockApi';

/**
 * Only FE path for persisted Gahshomar Correspondence reads/writes (DDL-23).
 * UI must go through `officialRecordFacade`, never this repository directly.
 */
export const CorrespondenceRepository = {
  async listCorrespondence(filters = {}) {
    if (useMockApi()) return null;
    const params = {};
    if (filters.direction) params.direction = filters.direction;
    if (filters.status) params.status = filters.status;
    if (filters.typeKey) params.typeKey = filters.typeKey;
    if (filters.companyId != null) params.companyId = filters.companyId;
    if (filters.orderId != null) params.orderId = filters.orderId;
    if (filters.search) params.search = filters.search;
    if (filters.limit) params.limit = filters.limit;
    const { data } = await apiClient.get('/correspondence', { params });
    return (data.items || []).map(correspondenceFromApi);
  },

  async getCorrespondence(id) {
    if (useMockApi()) return null;
    const { data } = await apiClient.get(`/correspondence/${id}`);
    return correspondenceFromApi(data.correspondence);
  },

  async createCorrespondence(payload) {
    if (useMockApi()) return null;
    const { data } = await apiClient.post('/correspondence', correspondenceToApi(payload));
    return correspondenceFromApi(data.correspondence);
  },

  async updateCorrespondence(id, patch) {
    if (useMockApi()) return null;
    const { data } = await apiClient.patch(`/correspondence/${id}`, correspondenceToApi(patch));
    return correspondenceFromApi(data.correspondence);
  },

  /** @returns {Promise<{ content: string, validation: { ok: boolean, violations: Array } }>} */
  async aiRewrite(id, text) {
    if (useMockApi()) return null;
    const { data } = await apiClient.post(`/correspondence/${id}/ai-rewrite`, { text });
    return data;
  },

  async finalize(id, { finalBody, issuedBy, issuerTitle } = {}) {
    if (useMockApi()) return null;
    const { data } = await apiClient.post(`/correspondence/${id}/finalize`, { finalBody, issuedBy, issuerTitle });
    return correspondenceFromApi(data.correspondence);
  },

  async archiveCorrespondence(id) {
    if (useMockApi()) return null;
    const { data } = await apiClient.delete(`/correspondence/${id}`);
    return data;
  },

  async listAttachments(id) {
    if (useMockApi()) return null;
    const { data } = await apiClient.get(`/correspondence/${id}/attachments`);
    return (data.items || []).map(attachmentFromApi);
  },

  async getAttachment(id, attachmentId) {
    if (useMockApi()) return null;
    const { data } = await apiClient.get(`/correspondence/${id}/attachments/${attachmentId}`);
    return attachmentFromApi(data.attachment);
  },

  /** @param {{ fileName: string, mimeType?: string, dataBase64: string }} file */
  async addAttachment(id, file) {
    if (useMockApi()) return null;
    const { data } = await apiClient.post(`/correspondence/${id}/attachments`, file);
    return attachmentFromApi(data.attachment);
  },

  async removeAttachment(id, attachmentId) {
    if (useMockApi()) return null;
    const { data } = await apiClient.delete(`/correspondence/${id}/attachments/${attachmentId}`);
    return data;
  },
};

export default CorrespondenceRepository;
