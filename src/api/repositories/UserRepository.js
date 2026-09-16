import { apiClient } from '../client';
import { useMockApi } from '../useMockApi';

function assertLiveApi() {
  if (useMockApi()) {
    const err = new Error('مدیریت کاربران به API واقعی نیاز دارد.');
    err.code = 'USERS_API_REQUIRED';
    throw err;
  }
}

/**
 * Canonical User administration API (DDL-27A).
 * PostgreSQL `users` is SSOT — this module never persists User records locally.
 */
export const UserRepository = {
  async listUsers() {
    assertLiveApi();
    const { data } = await apiClient.get('/users');
    return data.users || [];
  },

  async getUser(id) {
    assertLiveApi();
    const { data } = await apiClient.get(`/users/${encodeURIComponent(id)}`);
    return data.user;
  },

  async listRoles() {
    assertLiveApi();
    const { data } = await apiClient.get('/users/meta/roles');
    return data.roles || [];
  },

  async createUser(payload) {
    assertLiveApi();
    const { data } = await apiClient.post('/users', payload);
    return data.user;
  },

  async updateUser(id, patch) {
    assertLiveApi();
    const { data } = await apiClient.patch(`/users/${encodeURIComponent(id)}`, patch);
    return data.user;
  },

  async resetPassword(id, password) {
    assertLiveApi();
    const { data } = await apiClient.post(`/users/${encodeURIComponent(id)}/password`, { password });
    return data;
  },

  async resendInvitation(id) {
    assertLiveApi();
    const { data } = await apiClient.post(`/users/${encodeURIComponent(id)}/invitation`);
    return data;
  },
};

export default UserRepository;
