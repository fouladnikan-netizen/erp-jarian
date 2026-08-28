/**
 * Correspondence Type Registry cache (DDL-23d) — Zustand UI cache only when
 * API mode is on. PostgreSQL is SSOT via CorrespondenceTypeRepository
 * (Shirazeh-owned, same shape as useActivityTypesStore for Gap 1).
 */
import { create } from 'zustand';
import { CorrespondenceTypeRepository } from '../api/repositories/CorrespondenceTypeRepository';
import { useMockApi } from '../api/useMockApi';

/** Offline/mock-only fallback — mirrors the backend canonical seed (013 migration). */
export const MOCK_CORRESPONDENCE_TYPES = [
  { key: 'OFFICIAL', labelFa: 'رسمی', sortOrder: 10, isActive: true },
  { key: 'INTERNAL', labelFa: 'داخلی', sortOrder: 20, isActive: true },
  { key: 'ESTELAM', labelFa: 'استعلام', sortOrder: 30, isActive: true },
  { key: 'GHARARDAD', labelFa: 'قرارداد', sortOrder: 40, isActive: true },
  { key: 'PASOKH', labelFa: 'پاسخ', sortOrder: 50, isActive: true },
  { key: 'ELAMIEH', labelFa: 'اعلامیه', sortOrder: 60, isActive: true },
];

export const useCorrespondenceTypesStore = create((set, get) => ({
  types: [],
  loaded: false,
  error: null,
  version: 0,

  listCached: () => get().types,

  fetchAll: async () => {
    if (useMockApi()) {
      set({ types: MOCK_CORRESPONDENCE_TYPES, loaded: true, version: get().version + 1 });
      return get().types;
    }
    try {
      const items = await CorrespondenceTypeRepository.listCorrespondenceTypes({ includeInactive: true }) || [];
      set((state) => ({ types: items, loaded: true, error: null, version: state.version + 1 }));
      return items;
    } catch (error) {
      console.error('[correspondence-types-store] fetchAll failed', error);
      set({ error: error?.response?.data?.message || error?.message || 'بارگذاری انواع مکاتبات ناموفق بود.' });
      return get().types;
    }
  },

  createType: async (payload) => {
    if (useMockApi()) return null;
    const saved = await CorrespondenceTypeRepository.createCorrespondenceType(payload);
    if (saved) {
      set((state) => ({ types: [...state.types, saved], version: state.version + 1 }));
    }
    return saved;
  },

  updateType: async (key, patch) => {
    if (useMockApi()) return null;
    const saved = await CorrespondenceTypeRepository.updateCorrespondenceType(key, patch);
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
    const saved = await CorrespondenceTypeRepository.activateCorrespondenceType(key);
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
    const saved = await CorrespondenceTypeRepository.deactivateCorrespondenceType(key);
    if (saved) {
      set((state) => ({
        types: state.types.map((t) => (t.key === key ? saved : t)),
        version: state.version + 1,
      }));
    }
    return saved;
  },
}));

export default useCorrespondenceTypesStore;
