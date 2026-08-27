/**
 * Pooyesh Activity cache — Zustand UI cache only when API mode is on (DDL-15).
 * PostgreSQL is SSOT via ActivityRepository (SERVER_FIRST).
 */

import { create } from 'zustand';
import { ActivityRepository } from '../api/repositories/ActivityRepository';
import { useMockApi } from '../api/useMockApi';
import { ENTITY_REF_TYPE, normalizeEntityReference } from '../domain/entityReference';

function subjectKey(subjectType, subjectId) {
  return `${subjectType}:${subjectId}`;
}

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

export const useActivitiesStore = create((set, get) => ({
  /** @type {Array<object>} */
  activities: [],
  loadingBySubject: {},
  error: null,
  // Monotonic counter for consumers — `activities.length` alone misses
  // in-place status mutations (complete/update) where length is unchanged.
  version: 0,

  listBySubject: (subjectOrRef) => {
    const subject = toSubject(subjectOrRef);
    if (!subject) return [];
    return get().activities.filter(
      (a) => a.subjectType === subject.entityType && String(a.subjectId) === String(subject.entityId),
    );
  },

  getActivity: (id) => {
    if (id == null || id === '') return null;
    return get().activities.find((a) => String(a.id) === String(id)) || null;
  },

  fetchBySubject: async (subjectOrRef) => {
    if (useMockApi()) return [];
    const subject = toSubject(subjectOrRef);
    if (!subject) return [];

    const key = subjectKey(subject.entityType, subject.entityId);
    set((state) => ({
      loadingBySubject: { ...state.loadingBySubject, [key]: true },
      error: null,
    }));

    try {
      const items = await ActivityRepository.listActivities({
        entityType: subject.entityType,
        entityId: subject.entityId,
      }) || [];

      set((state) => {
        const others = state.activities.filter(
          (a) => !(a.subjectType === subject.entityType
            && String(a.subjectId) === String(subject.entityId)),
        );
        return {
          activities: [...items, ...others],
          loadingBySubject: { ...state.loadingBySubject, [key]: false },
          version: state.version + 1,
        };
      });
      return items;
    } catch (error) {
      console.error('[activities-store] fetchBySubject failed', error);
      set((state) => ({
        loadingBySubject: { ...state.loadingBySubject, [key]: false },
        error: error?.message || 'بارگذاری فعالیت‌ها ناموفق بود.',
      }));
      return [];
    }
  },

  /**
   * SERVER_FIRST create — cache only after success.
   * @returns {Promise<object|null>}
   */
  createActivityAsync: async (payload = {}) => {
    if (useMockApi()) return null;

    try {
      const saved = await ActivityRepository.createActivity(payload);
      if (!saved) return null;
      set((state) => ({
        activities: [saved, ...state.activities.filter((a) => String(a.id) !== String(saved.id))],
        error: null,
        version: state.version + 1,
      }));
      return saved;
    } catch (error) {
      console.error('[activities-store] create failed', error);
      set({ error: error?.response?.data?.message || error?.message || 'ثبت فعالیت ناموفق بود.' });
      throw error;
    }
  },

  updateActivityAsync: async (id, patch = {}) => {
    if (useMockApi()) return null;
    try {
      const saved = await ActivityRepository.updateActivity(id, patch);
      if (!saved) return null;
      set((state) => ({
        activities: state.activities.map((a) => (String(a.id) === String(id) ? saved : a)),
        error: null,
        version: state.version + 1,
      }));
      return saved;
    } catch (error) {
      console.error('[activities-store] update failed', error);
      set({ error: error?.response?.data?.message || error?.message || 'ویرایش فعالیت ناموفق بود.' });
      throw error;
    }
  },

  completeActivityAsync: async (id) => {
    if (useMockApi()) return null;
    try {
      const saved = await ActivityRepository.completeActivity(id);
      if (!saved) return null;
      set((state) => ({
        activities: state.activities.map((a) => (String(a.id) === String(id) ? saved : a)),
        error: null,
        version: state.version + 1,
      }));
      return saved;
    } catch (error) {
      console.error('[activities-store] complete failed', error);
      set({ error: error?.response?.data?.message || error?.message || 'تکمیل فعالیت ناموفق بود.' });
      throw error;
    }
  },

  archiveActivityAsync: async (id) => {
    if (useMockApi()) return null;
    try {
      const result = await ActivityRepository.archiveActivity(id);
      set((state) => ({
        activities: state.activities.filter((a) => String(a.id) !== String(id)),
        error: null,
        version: state.version + 1,
      }));
      return result || { id, archived: true };
    } catch (error) {
      console.error('[activities-store] archive failed', error);
      set({ error: error?.response?.data?.message || error?.message || 'آرشیو فعالیت ناموفق بود.' });
      throw error;
    }
  },
}));

export { ENTITY_REF_TYPE };
export default useActivitiesStore;
