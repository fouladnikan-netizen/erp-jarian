import { apiClient } from '../client';
import { useMockApi } from '../useMockApi';

function assertLiveApi() {
  if (useMockApi()) {
    const err = new Error('ماتریس دسترسی به API واقعی نیاز دارد.');
    err.code = 'RBAC_API_REQUIRED';
    throw err;
  }
}

/**
 * Shirazeh Role + permission matrix → PostgreSQL roles / role_permissions.
 */
export const RbacRepository = {
  async listPermissions() {
    assertLiveApi();
    const { data } = await apiClient.get('/rbac/permissions');
    return data.permissions || [];
  },

  async listRoles() {
    assertLiveApi();
    const { data } = await apiClient.get('/rbac/roles');
    return data.roles || [];
  },

  async getRole(roleCode) {
    assertLiveApi();
    const { data } = await apiClient.get(`/rbac/roles/${encodeURIComponent(roleCode)}`);
    return data.role;
  },

  async createRole(payload) {
    assertLiveApi();
    const { data } = await apiClient.post('/rbac/roles', payload);
    return data.role;
  },

  async updateRole(roleCode, patch) {
    assertLiveApi();
    const { data } = await apiClient.patch(
      `/rbac/roles/${encodeURIComponent(roleCode)}`,
      patch,
    );
    return data;
  },

  async listRoleUsers(roleCode) {
    assertLiveApi();
    const { data } = await apiClient.get(
      `/rbac/roles/${encodeURIComponent(roleCode)}/users`,
    );
    return Array.isArray(data.users) ? data.users : [];
  },

  async listRolePermissions(roleCode) {
    assertLiveApi();
    const { data } = await apiClient.get(
      `/rbac/roles/${encodeURIComponent(roleCode)}/permissions`,
    );
    return Array.isArray(data.permissions) ? data.permissions : [];
  },

  async replaceRolePermissions(roleCode, permissions) {
    assertLiveApi();
    const { data } = await apiClient.put(
      `/rbac/roles/${encodeURIComponent(roleCode)}/permissions`,
      { permissions },
    );
    return Array.isArray(data.permissions) ? data.permissions : [];
  },
};

export default RbacRepository;
