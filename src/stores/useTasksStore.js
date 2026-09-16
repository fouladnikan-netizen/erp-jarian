/**
 * Pooyesh Task cache — Zustand UI cache only in API mode (DDL-16).
 * PostgreSQL is SSOT via TaskRepository (SERVER_FIRST).
 */

import { create } from 'zustand';
import { TaskRepository } from '../api/repositories/TaskRepository';
import { useMockApi } from '../api/useMockApi';
import { normalizeEntityReference } from '../domain/entityReference';

function toSubject(subjectOrRef) {
  if (!subjectOrRef) return null;
  if (typeof subjectOrRef === 'object') {
    return normalizeEntityReference(subjectOrRef)
      || (subjectOrRef.subjectType && subjectOrRef.subjectId
        ? { entityType: subjectOrRef.subjectType, entityId: String(subjectOrRef.subjectId) }
        : null);
  }
  return null;
}

export const useTasksStore = create((set, get) => ({
  tasks: [],
  error: null,
  // Monotonic counter for consumers — `tasks.length` alone misses in-place
  // status mutations (complete/update) where the array length is unchanged.
  version: 0,

  listBySubject: (subjectOrRef) => {
    const subject = toSubject(subjectOrRef);
    if (!subject) return get().tasks.slice();
    return get().tasks.filter(
      (t) => t.subject?.entityType === subject.entityType
        && String(t.subject?.entityId) === String(subject.entityId),
    );
  },

  getTask: (id) => {
    if (id == null || id === '') return null;
    return get().tasks.find((t) => String(t.id) === String(id)) || null;
  },

  fetchTasks: async (filters = {}) => {
    if (useMockApi()) return [];
    try {
      const items = await TaskRepository.listTasks(filters) || [];
      if (filters.entityType && filters.entityId) {
        set((state) => {
          const others = state.tasks.filter(
            (t) => !(t.subject?.entityType === filters.entityType
              && String(t.subject?.entityId) === String(filters.entityId)),
          );
          return { tasks: [...items, ...others], error: null, version: state.version + 1 };
        });
      } else {
        set((state) => ({ tasks: items, error: null, version: state.version + 1 }));
      }
      return items;
    } catch (error) {
      console.error('[tasks-store] fetch failed', error);
      set({ error: error?.message || 'بارگذاری وظایف ناموفق بود.' });
      return [];
    }
  },

  createTaskAsync: async (payload) => {
    if (useMockApi()) return null;
    try {
      const saved = await TaskRepository.createTask(payload);
      if (!saved) return null;
      set((state) => ({
        tasks: [saved, ...state.tasks.filter((t) => String(t.id) !== String(saved.id))],
        error: null,
        version: state.version + 1,
      }));
      return saved;
    } catch (error) {
      console.error('[tasks-store] create failed', error);
      set({ error: error?.response?.data?.message || error?.message || 'ثبت وظیفه ناموفق بود.' });
      throw error;
    }
  },

  updateTaskAsync: async (id, patch) => {
    if (useMockApi()) return null;
    try {
      const saved = await TaskRepository.updateTask(id, patch);
      if (!saved) return null;
      set((state) => ({
        tasks: state.tasks.map((t) => (String(t.id) === String(id) ? saved : t)),
        error: null,
        version: state.version + 1,
      }));
      return saved;
    } catch (error) {
      set({ error: error?.response?.data?.message || error?.message || 'ویرایش وظیفه ناموفق بود.' });
      throw error;
    }
  },

  changeTaskStatusAsync: async (id, status) => {
    if (useMockApi()) return null;
    try {
      const saved = await TaskRepository.changeTaskStatus(id, status);
      if (!saved) return null;
      set((state) => ({
        tasks: state.tasks.map((t) => (String(t.id) === String(id) ? saved : t)),
        error: null,
        version: state.version + 1,
      }));
      return saved;
    } catch (error) {
      set({ error: error?.response?.data?.message || error?.message || 'تغییر وضعیت ناموفق بود.' });
      throw error;
    }
  },

  completeTaskAsync: async (id) => {
    if (useMockApi()) return null;
    try {
      const saved = await TaskRepository.completeTask(id);
      if (!saved) return null;
      set((state) => ({
        tasks: state.tasks.map((t) => (String(t.id) === String(id) ? saved : t)),
        error: null,
        version: state.version + 1,
      }));
      return saved;
    } catch (error) {
      set({ error: error?.response?.data?.message || error?.message || 'تکمیل وظیفه ناموفق بود.' });
      throw error;
    }
  },

  archiveTaskAsync: async (id) => {
    if (useMockApi()) return null;
    try {
      const result = await TaskRepository.archiveTask(id);
      set((state) => ({
        tasks: state.tasks.filter((t) => String(t.id) !== String(id)),
        error: null,
        version: state.version + 1,
      }));
      return result || { id, archived: true };
    } catch (error) {
      set({ error: error?.response?.data?.message || error?.message || 'آرشیو وظیفه ناموفق بود.' });
      throw error;
    }
  },
}));

export default useTasksStore;
