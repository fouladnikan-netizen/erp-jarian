import { apiClient } from '../client';
import { useMockApi } from '../useMockApi';

/**
 * Only FE path for the Shirazeh-owned Product Master taxonomy
 * (Group -> Category -> Product Type). DDL-24 / DDL-24(b,c).
 * Real backend-persisted CRUD — never a client-side registry.
 */
export const ProductTaxonomyRepository = {
  async getTree({ includeInactive = true } = {}) {
    if (useMockApi()) return null;
    const { data } = await apiClient.get('/product-taxonomy/tree', {
      params: { includeInactive: includeInactive ? 'true' : 'false' },
    });
    return data.tree;
  },

  async listGroups({ includeInactive = true } = {}) {
    if (useMockApi()) return null;
    const { data } = await apiClient.get('/product-taxonomy/groups', {
      params: { includeInactive: includeInactive ? 'true' : 'false' },
    });
    return data.items || [];
  },
  async createGroup(payload) {
    if (useMockApi()) return null;
    const { data } = await apiClient.post('/product-taxonomy/groups', payload);
    return data.group;
  },
  async updateGroup(id, patch) {
    if (useMockApi()) return null;
    const { data } = await apiClient.patch(`/product-taxonomy/groups/${id}`, patch);
    return data.group;
  },
  async deleteGroup(id) {
    if (useMockApi()) return null;
    const { data } = await apiClient.delete(`/product-taxonomy/groups/${id}`);
    return data;
  },

  async listCategories({ groupId, includeInactive = true } = {}) {
    if (useMockApi()) return null;
    const params = { includeInactive: includeInactive ? 'true' : 'false' };
    if (groupId) params.groupId = groupId;
    const { data } = await apiClient.get('/product-taxonomy/categories', { params });
    return data.items || [];
  },
  async createCategory(payload) {
    if (useMockApi()) return null;
    const { data } = await apiClient.post('/product-taxonomy/categories', payload);
    return data.category;
  },
  async updateCategory(id, patch) {
    if (useMockApi()) return null;
    const { data } = await apiClient.patch(`/product-taxonomy/categories/${id}`, patch);
    return data.category;
  },
  async deleteCategory(id) {
    if (useMockApi()) return null;
    const { data } = await apiClient.delete(`/product-taxonomy/categories/${id}`);
    return data;
  },

  async listTypes({ categoryId, includeInactive = true } = {}) {
    if (useMockApi()) return null;
    const params = { includeInactive: includeInactive ? 'true' : 'false' };
    if (categoryId) params.categoryId = categoryId;
    const { data } = await apiClient.get('/product-taxonomy/types', { params });
    return data.items || [];
  },
  async createType(payload) {
    if (useMockApi()) return null;
    const { data } = await apiClient.post('/product-taxonomy/types', payload);
    return data.productType;
  },
  async updateType(id, patch) {
    if (useMockApi()) return null;
    const { data } = await apiClient.patch(`/product-taxonomy/types/${id}`, patch);
    return data.productType;
  },
  async deleteType(id) {
    if (useMockApi()) return null;
    const { data } = await apiClient.delete(`/product-taxonomy/types/${id}`);
    return data;
  },
};

export default ProductTaxonomyRepository;
