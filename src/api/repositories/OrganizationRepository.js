import { apiClient } from '../client';
import { useMockApi } from '../useMockApi';

function assertLiveApi() {
  if (useMockApi()) {
    const err = new Error('ساختار سازمانی به API واقعی نیاز دارد.');
    err.code = 'ORGANIZATION_API_REQUIRED';
    throw err;
  }
}

/**
 * Shirazeh Organization Structure → PostgreSQL units / positions / assignments (DDL-37).
 * Person nodes are users.id. This module never stores a second user identity.
 */
export const OrganizationRepository = {
  async getTree() {
    assertLiveApi();
    const { data } = await apiClient.get('/organization/tree');
    return data;
  },

  async putTree(tree) {
    assertLiveApi();
    const { data } = await apiClient.put('/organization/tree', { tree });
    return data;
  },

  async listUnits() {
    assertLiveApi();
    const { data } = await apiClient.get('/organization/units');
    return data.units || [];
  },

  async createUnit(payload) {
    assertLiveApi();
    const { data } = await apiClient.post('/organization/units', payload);
    return data.unit;
  },

  async updateUnit(id, patch) {
    assertLiveApi();
    const { data } = await apiClient.patch(`/organization/units/${encodeURIComponent(id)}`, patch);
    return data.unit;
  },

  async listPositions(unitId) {
    assertLiveApi();
    const { data } = await apiClient.get('/organization/positions', {
      params: unitId ? { unitId } : undefined,
    });
    return data.positions || [];
  },

  async createPosition(payload) {
    assertLiveApi();
    const { data } = await apiClient.post('/organization/positions', payload);
    return data.position;
  },

  async updatePosition(id, patch) {
    assertLiveApi();
    const { data } = await apiClient.patch(`/organization/positions/${encodeURIComponent(id)}`, patch);
    return data.position;
  },

  async listAssignments() {
    assertLiveApi();
    const { data } = await apiClient.get('/organization/assignments');
    return data.assignments || [];
  },

  async upsertAssignment(payload) {
    assertLiveApi();
    const { data } = await apiClient.put('/organization/assignments', payload);
    return data.assignment;
  },

  async deleteAssignment(userId) {
    assertLiveApi();
    const { data } = await apiClient.delete(
      `/organization/assignments/${encodeURIComponent(userId)}`,
    );
    return data;
  },
};

export default OrganizationRepository;
