import { apiClient } from '../client';
import { useMockApi } from '../useMockApi';

/**
 * Only FE path for the Shirazeh-owned Attribute Definition registry and
 * Product Type <-> Attribute schema binding (DDL-24c, DDL-24h).
 */
export const AttributeDefinitionRepository = {
  async listDefinitions({ includeInactive = true } = {}) {
    if (useMockApi()) return null;
    const { data } = await apiClient.get('/attribute-definitions', {
      params: { includeInactive: includeInactive ? 'true' : 'false' },
    });
    return data.items || [];
  },
  async createDefinition(payload) {
    if (useMockApi()) return null;
    const { data } = await apiClient.post('/attribute-definitions', payload);
    return data.attributeDefinition;
  },
  async updateDefinition(id, patch) {
    if (useMockApi()) return null;
    const { data } = await apiClient.patch(`/attribute-definitions/${id}`, patch);
    return data.attributeDefinition;
  },

  /** Effective, inherited schema for a Product Type (DDL-24c). */
  async getSchemaForType(productTypeId, { includeInactive = false } = {}) {
    if (useMockApi()) return null;
    const { data } = await apiClient.get(`/attribute-definitions/schema/${productTypeId}`, {
      params: { includeInactive: includeInactive ? 'true' : 'false' },
    });
    return data.schema || [];
  },
  async bindAttribute(payload) {
    if (useMockApi()) return null;
    const { data } = await apiClient.post('/attribute-definitions/bindings', payload);
    return data.binding;
  },
  async updateBinding(id, patch) {
    if (useMockApi()) return null;
    const { data } = await apiClient.patch(`/attribute-definitions/bindings/${id}`, patch);
    return data.binding;
  },
};

export default AttributeDefinitionRepository;
