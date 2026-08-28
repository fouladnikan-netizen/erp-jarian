import { apiClient } from '../client';
import { useMockApi } from '../useMockApi';

/**
 * Only FE path for the Shirazeh-owned UOM Engine (registry + conversions).
 * DDL-24(e).
 */
export const UomRepository = {
  async listUoms({ includeInactive = true } = {}) {
    if (useMockApi()) return null;
    const { data } = await apiClient.get('/uom', {
      params: { includeInactive: includeInactive ? 'true' : 'false' },
    });
    return data.items || [];
  },
  async createUom(payload) {
    if (useMockApi()) return null;
    const { data } = await apiClient.post('/uom', payload);
    return data.uom;
  },
  async updateUom(id, patch) {
    if (useMockApi()) return null;
    const { data } = await apiClient.patch(`/uom/${id}`, patch);
    return data.uom;
  },

  async listConversions(fromUomId) {
    if (useMockApi()) return null;
    const { data } = await apiClient.get(`/uom/${fromUomId}/conversions`);
    return data.items || [];
  },
  async createConversion(payload) {
    if (useMockApi()) return null;
    const { data } = await apiClient.post('/uom/conversions', payload);
    return data.conversion;
  },
};

export default UomRepository;
