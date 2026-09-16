import { apiClient } from '../client';
import { useMockApi } from '../useMockApi';

/**
 * Only FE path for the Shirazeh-owned Correspondence Type Registry (DDL-23d).
 * Real backend-persisted CRUD — not a static config array.
 */
export const CorrespondenceTypeRepository = {
  async listCorrespondenceTypes({ includeInactive = true } = {}) {
    if (useMockApi()) return null;
    const { data } = await apiClient.get('/correspondence-types', {
      params: { includeInactive: includeInactive ? 'true' : 'false' },
    });
    return data.items || [];
  },

  async createCorrespondenceType(payload) {
    if (useMockApi()) return null;
    const { data } = await apiClient.post('/correspondence-types', payload);
    return data.correspondenceType;
  },

  async updateCorrespondenceType(key, patch) {
    if (useMockApi()) return null;
    const { data } = await apiClient.patch(`/correspondence-types/${encodeURIComponent(key)}`, patch);
    return data.correspondenceType;
  },

  async activateCorrespondenceType(key) {
    if (useMockApi()) return null;
    const { data } = await apiClient.patch(`/correspondence-types/${encodeURIComponent(key)}/activate`);
    return data.correspondenceType;
  },

  async deactivateCorrespondenceType(key) {
    if (useMockApi()) return null;
    const { data } = await apiClient.patch(`/correspondence-types/${encodeURIComponent(key)}/deactivate`);
    return data.correspondenceType;
  },
};

export default CorrespondenceTypeRepository;
