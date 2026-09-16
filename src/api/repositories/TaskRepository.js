import { apiClient } from '../client';
import { taskFromApi, taskToApi } from '../mappers/taskMapper';
import { useMockApi } from '../useMockApi';

export const TaskRepository = {
  async listTasks(filters = {}) {
    if (useMockApi()) return null;
    const params = {};
    if (filters.subjectType || filters.entityType) {
      params.subjectType = filters.subjectType || filters.entityType;
    }
    if (filters.subjectId || filters.entityId) {
      params.subjectId = filters.subjectId || filters.entityId;
    }
    if (filters.assignedTo) params.assignedTo = filters.assignedTo;
    if (filters.status) params.status = filters.status;
    if (filters.limit) params.limit = filters.limit;
    const { data } = await apiClient.get('/tasks', { params });
    return (data.items || []).map(taskFromApi);
  },

  async getTask(id) {
    if (useMockApi()) return null;
    const { data } = await apiClient.get(`/tasks/${id}`);
    return taskFromApi(data.task);
  },

  async createTask(payload) {
    if (useMockApi()) return null;
    const { data } = await apiClient.post('/tasks', taskToApi(payload));
    return taskFromApi(data.task);
  },

  async updateTask(id, patch) {
    if (useMockApi()) return null;
    const body = taskToApi(patch);
    delete body.subjectType;
    delete body.subjectId;
    const { data } = await apiClient.patch(`/tasks/${id}`, body);
    return taskFromApi(data.task);
  },

  async changeTaskStatus(id, status) {
    if (useMockApi()) return null;
    const { data } = await apiClient.patch(`/tasks/${id}/status`, { status });
    return taskFromApi(data.task);
  },

  async completeTask(id) {
    if (useMockApi()) return null;
    const { data } = await apiClient.patch(`/tasks/${id}/complete`);
    return taskFromApi(data.task);
  },

  async archiveTask(id) {
    if (useMockApi()) return null;
    const { data } = await apiClient.delete(`/tasks/${id}`);
    return data;
  },
};

export default TaskRepository;
