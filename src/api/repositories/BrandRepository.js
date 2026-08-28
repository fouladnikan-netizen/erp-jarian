import { apiClient } from '../client';
import { useMockApi } from '../useMockApi';

/**
 * Only FE path for the Shirazeh-owned Brand Registry (DDL-24d).
 * Duplicate-detection is backend-authoritative — `checkDuplicate` is a
 * pre-flight warning helper only, never the source of truth for blocking.
 */
export const BrandRepository = {
  async listBrands({ includeInactive = true } = {}) {
    if (useMockApi()) return null;
    const { data } = await apiClient.get('/brands', {
      params: { includeInactive: includeInactive ? 'true' : 'false' },
    });
    return data.items || [];
  },
  async checkDuplicate(brandName) {
    if (useMockApi()) return null;
    const { data } = await apiClient.post('/brands/check-duplicate', { brandName });
    return data;
  },
  async createBrand(payload) {
    if (useMockApi()) return null;
    const { data } = await apiClient.post('/brands', payload);
    return data.brand;
  },
  async updateBrand(id, patch) {
    if (useMockApi()) return null;
    const { data } = await apiClient.patch(`/brands/${id}`, patch);
    return data.brand;
  },
};

export default BrandRepository;
