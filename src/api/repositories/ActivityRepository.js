import { apiClient } from '../client';
import { activityFromApi, activityToApi } from '../mappers/activityMapper';
import { useMockApi } from '../useMockApi';

/**
 * Only FE path for persisted Pooyesh Activity reads/writes when API mode is on.
 */
export const ActivityRepository = {
  /**
   * @param {{ entityType?: string, entityId?: string, subjectType?: string, subjectId?: string, status?: string, limit?: number }} [subjectOrFilters]
   */
  async listActivities(subjectOrFilters = {}) {
    if (useMockApi()) return null;
    const subjectType = subjectOrFilters.subjectType || subjectOrFilters.entityType;
    const subjectId = subjectOrFilters.subjectId || subjectOrFilters.entityId;
    const params = {};
    if (subjectType) params.subjectType = subjectType;
    if (subjectId != null) params.subjectId = subjectId;
    if (subjectOrFilters.status) params.status = subjectOrFilters.status;
    if (subjectOrFilters.limit) params.limit = subjectOrFilters.limit;
    const { data } = await apiClient.get('/activities', { params });
    return (data.items || []).map(activityFromApi);
  },

  async getActivity(id) {
    if (useMockApi()) return null;
    const { data } = await apiClient.get(`/activities/${id}`);
    return activityFromApi(data.activity);
  },

  async createActivity(payload) {
    if (useMockApi()) return null;
    const { data } = await apiClient.post('/activities', activityToApi(payload));
    return activityFromApi(data.activity);
  },

  async updateActivity(id, patch) {
    if (useMockApi()) return null;
    const body = activityToApi({ ...patch });
    delete body.subjectType;
    delete body.subjectId;
    const { data } = await apiClient.patch(`/activities/${id}`, body);
    return activityFromApi(data.activity);
  },

  async completeActivity(id) {
    if (useMockApi()) return null;
    const { data } = await apiClient.patch(`/activities/${id}/complete`);
    return activityFromApi(data.activity);
  },

  async archiveActivity(id) {
    if (useMockApi()) return null;
    const { data } = await apiClient.delete(`/activities/${id}`);
    return data;
  },
};

export default ActivityRepository;
