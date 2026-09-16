import { apiClient } from '../client';
import { useMockApi } from '../useMockApi';

/**
 * Only FE path for the Shirazeh-owned Activity Type Registry (Gap 1).
 * Real backend-persisted CRUD — not a static config array.
 */
export const ActivityTypeRepository = {
  async listActivityTypes({ includeInactive = true } = {}) {
    if (useMockApi()) return null;
    const { data } = await apiClient.get('/activity-types', {
      params: { includeInactive: includeInactive ? 'true' : 'false' },
    });
    return data.items || [];
  },

  async createActivityType(payload) {
    if (useMockApi()) return null;
    const { data } = await apiClient.post('/activity-types', payload);
    return data.activityType;
  },

  async updateActivityType(key, patch) {
    if (useMockApi()) return null;
    const { data } = await apiClient.patch(`/activity-types/${encodeURIComponent(key)}`, patch);
    return data.activityType;
  },

  async activateActivityType(key) {
    if (useMockApi()) return null;
    const { data } = await apiClient.patch(`/activity-types/${encodeURIComponent(key)}/activate`);
    return data.activityType;
  },

  async deactivateActivityType(key) {
    if (useMockApi()) return null;
    const { data } = await apiClient.patch(`/activity-types/${encodeURIComponent(key)}/deactivate`);
    return data.activityType;
  },
};

export default ActivityTypeRepository;
