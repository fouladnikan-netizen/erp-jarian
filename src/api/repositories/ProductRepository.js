import { apiClient } from '../client';
import { useMockApi } from '../useMockApi';

/**
 * Only FE path for the Vitrin-owned Product/SKU aggregate (DDL-24).
 * Backend is authoritative for SKU generation, canonical-identity duplicate
 * detection, schema validation, and lifecycle — this repository never
 * computes any of that client-side.
 */
export const ProductRepository = {
  async searchProducts(filters = {}) {
    if (useMockApi()) return null;
    const params = {};
    if (filters.sku) params.sku = filters.sku;
    if (filters.text) params.text = filters.text;
    if (filters.groupId) params.groupId = filters.groupId;
    if (filters.categoryId) params.categoryId = filters.categoryId;
    if (filters.productTypeId) params.productTypeId = filters.productTypeId;
    if (filters.brandId) params.brandId = filters.brandId;
    if (filters.lifecycleStatus) params.lifecycleStatus = filters.lifecycleStatus;
    if (filters.includeInactive) params.includeInactive = 'true';
    if (filters.limit) params.limit = filters.limit;
    if (filters.attributeCode && filters.attributeValue !== undefined) {
      params.attributeCode = filters.attributeCode;
      params.attributeValue = filters.attributeValue;
    }
    if (Array.isArray(filters.attributeFilters) && filters.attributeFilters.length) {
      params.attributeFilters = JSON.stringify(filters.attributeFilters);
    }
    const { data } = await apiClient.get('/products', { params });
    return data.items || [];
  },

  async getProduct(id) {
    if (useMockApi()) return null;
    const { data } = await apiClient.get(`/products/${id}`);
    return data.product;
  },

  async createProduct(payload) {
    if (useMockApi()) return null;
    const { data } = await apiClient.post('/products', payload);
    return data.product;
  },

  async updateProduct(id, patch) {
    if (useMockApi()) return null;
    const { data } = await apiClient.patch(`/products/${id}`, patch);
    return data.product;
  },

  async activateProduct(id) {
    if (useMockApi()) return null;
    const { data } = await apiClient.patch(`/products/${id}/activate`);
    return data.product;
  },
  async deactivateProduct(id) {
    if (useMockApi()) return null;
    const { data } = await apiClient.patch(`/products/${id}/deactivate`);
    return data.product;
  },

  async listRelationships(productId) {
    if (useMockApi()) return null;
    const { data } = await apiClient.get(`/products/${productId}/relationships`);
    return data.items || [];
  },
  async createRelationship(payload) {
    if (useMockApi()) return null;
    const { data } = await apiClient.post('/products/relationships', payload);
    return data.relationship;
  },
  async deactivateRelationship(id) {
    if (useMockApi()) return null;
    const { data } = await apiClient.patch(`/products/relationships/${id}/deactivate`);
    return data.relationship;
  },

  /** @param {{ mode: 'DRY_RUN'|'APPLY', rows: object[] }} payload */
  async runBulkImport(payload) {
    if (useMockApi()) return null;
    const { data } = await apiClient.post('/products/bulk-import', payload);
    return data.batch;
  },
  async getBulkImportBatch(id) {
    if (useMockApi()) return null;
    const { data } = await apiClient.get(`/products/bulk-import/${id}`);
    return data.batch;
  },
  async listBulkImportBatches() {
    if (useMockApi()) return null;
    const { data } = await apiClient.get('/products/bulk-import');
    return data.items || [];
  },
};

export default ProductRepository;
