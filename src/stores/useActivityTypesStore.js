/**
 * Activity Type Registry cache — Zustand UI cache only when API mode is on.
 * PostgreSQL is SSOT via ActivityTypeRepository (Shirazeh-owned, Gap 1).
 */
import { create } from 'zustand';
import { ActivityTypeRepository } from '../api/repositories/ActivityTypeRepository';
import { useMockApi } from '../api/useMockApi';

/** Offline/mock-only fallback — mirrors the backend canonical seed (010 migration). */
export const MOCK_ACTIVITY_TYPES = [
  { key: 'call', labelFa: 'تماس', sortOrder: 10, isActive: true },
  { key: 'message', labelFa: 'پیام/ایمیل', sortOrder: 20, isActive: true },
  { key: 'meeting', labelFa: 'جلسه حضوری', sortOrder: 30, isActive: true },
  { key: 'catalog', labelFa: 'ارسال کاتالوگ', sortOrder: 40, isActive: true },
  { key: 'note', labelFa: 'یادداشت داخلی', sortOrder: 50, isActive: true },
  { key: 'task', labelFa: 'وظیفه', sortOrder: 60, isActive: true },
];

export const useActivityTypesStore = create((set, get) => ({
  types: [],
  loaded: false,
  error: null,
  version: 0,

  listCached: () => get().types,

  fetchAll: async () => {
    if (useMockApi()) {
      set({ types: MOCK_ACTIVITY_TYPES, loaded: true, version: get().version + 1 });
      return get().types;
    }
    try {
      const items = await ActivityTypeRepository.listActivityTypes({ includeInactive: true }) || [];
      set((state) => ({ types: items, loaded: true, error: null, version: state.version + 1 }));
      return items;
    } catch (error) {
      console.error('[activity-types-store] fetchAll failed', error);
      set({ error: error?.response?.data?.message || error?.message || 'بارگذاری انواع فعالیت ناموفق بود.' });
      return get().types;
    }
  },

  createType: async (payload) => {
    if (useMockApi()) return null;
    const saved = await ActivityTypeRepository.createActivityType(payload);
    if (saved) {
      set((state) => ({ types: [...state.types, saved], version: state.version + 1 }));
    }
    return saved;
  },

  updateType: async (key, patch) => {
    if (useMockApi()) return null;
    const saved = await ActivityTypeRepository.updateActivityType(key, patch);
    if (saved) {
      set((state) => ({
        types: state.types.map((t) => (t.key === key ? saved : t)),
        version: state.version + 1,
      }));
    }
    return saved;
  },

  activateType: async (key) => {
    if (useMockApi()) return null;
    const saved = await ActivityTypeRepository.activateActivityType(key);
    if (saved) {
      set((state) => ({
        types: state.types.map((t) => (t.key === key ? saved : t)),
        version: state.version + 1,
      }));
    }
    return saved;
  },

  deactivateType: async (key) => {
    if (useMockApi()) return null;
    const saved = await ActivityTypeRepository.deactivateActivityType(key);
    if (saved) {
      set((state) => ({
        types: state.types.map((t) => (t.key === key ? saved : t)),
        version: state.version + 1,
      }));
    }
    return saved;
  },
}));

export default useActivityTypesStore;
