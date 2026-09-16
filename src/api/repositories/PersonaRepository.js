import { apiClient } from '../client';
import { useMockApi } from '../useMockApi';

/**
 * Shirazeh Persona Definitions → PostgreSQL personas (DDL-42 / DDL-44).
 * Mock mode keeps an in-memory working copy only — not a second SoR.
 */
let mockPersonas = [];
let mockRoleOptions = [];

function clone(row) {
  return {
    ...row,
    roles: Array.isArray(row.roles) ? row.roles.map((role) => ({ ...role })) : [],
  };
}

export const PersonaRepository = {
  async listPersonas({ includeInactive = true } = {}) {
    if (useMockApi()) {
      return mockPersonas
        .filter((row) => includeInactive || row.isActive)
        .map(clone);
    }
    const { data } = await apiClient.get('/personas', {
      params: { includeInactive: includeInactive ? 'true' : 'false' },
    });
    return data.personas || [];
  },

  async listRoleOptions() {
    if (useMockApi()) return mockRoleOptions.map((role) => ({ ...role }));
    const { data } = await apiClient.get('/personas/meta/roles');
    return data.roles || [];
  },

  async getPersona(code) {
    if (useMockApi()) {
      return mockPersonas.find((row) => row.code === code) || null;
    }
    const { data } = await apiClient.get(`/personas/${encodeURIComponent(code)}`);
    return data.persona;
  },

  async createPersona(payload) {
    if (useMockApi()) {
      const next = mockPersonas
        .map((row) => Number(String(row.code).replace(/^persona_/, '')) || 0)
        .reduce((max, n) => Math.max(max, n), 0) + 1;
      const created = {
        id: `prs_mock_${next}`,
        code: `persona_${next}`,
        name: payload.name,
        domain: payload.domain || '',
        isActive: true,
        roles: payload.roleCode
          ? [{ code: payload.roleCode, labelFa: payload.roleLabelFa || payload.roleCode }]
          : [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockPersonas = [created, ...mockPersonas];
      return clone(created);
    }
    const { data } = await apiClient.post('/personas', {
      name: payload.name,
      roleCode: payload.roleCode,
    });
    return data.persona;
  },

  async updatePersona(code, patch) {
    if (useMockApi()) {
      const idx = mockPersonas.findIndex((row) => row.code === code);
      if (idx < 0) return null;
      mockPersonas[idx] = {
        ...mockPersonas[idx],
        ...patch,
        code: mockPersonas[idx].code,
        roles: mockPersonas[idx].roles,
        updatedAt: new Date().toISOString(),
      };
      return clone(mockPersonas[idx]);
    }
    const { data } = await apiClient.patch(`/personas/${encodeURIComponent(code)}`, patch);
    return data.persona;
  },

  async attachRole(code, roleCode) {
    if (useMockApi()) {
      const idx = mockPersonas.findIndex((row) => row.code === code);
      if (idx < 0) return null;
      const roles = mockPersonas[idx].roles || [];
      if (!roles.some((role) => role.code === roleCode)) {
        roles.push({ code: roleCode, labelFa: roleCode });
      }
      mockPersonas[idx] = { ...mockPersonas[idx], roles };
      return clone(mockPersonas[idx]);
    }
    const { data } = await apiClient.post(`/personas/${encodeURIComponent(code)}/roles`, { roleCode });
    return data.persona;
  },

  async detachRole(code, roleCode) {
    if (useMockApi()) {
      const idx = mockPersonas.findIndex((row) => row.code === code);
      if (idx < 0) return null;
      mockPersonas[idx] = {
        ...mockPersonas[idx],
        roles: (mockPersonas[idx].roles || []).filter((role) => role.code !== roleCode),
      };
      return clone(mockPersonas[idx]);
    }
    const { data } = await apiClient.delete(
      `/personas/${encodeURIComponent(code)}/roles/${encodeURIComponent(roleCode)}`,
    );
    return data.persona;
  },

  async activatePersona(code) {
    if (useMockApi()) return this.updatePersona(code, { isActive: true });
    const { data } = await apiClient.patch(`/personas/${encodeURIComponent(code)}/activate`);
    return data.persona;
  },

  async deactivatePersona(code) {
    if (useMockApi()) return this.updatePersona(code, { isActive: false });
    const { data } = await apiClient.patch(`/personas/${encodeURIComponent(code)}/deactivate`);
    return data.persona;
  },
};

export default PersonaRepository;
