/**
 * UOM Registry + conversions cache — Zustand UI cache only. PostgreSQL is
 * SSOT via UomRepository (Shirazeh-owned, DDL-24e).
 */
import { create } from 'zustand';
import { UomRepository } from '../api/repositories/UomRepository';
import { useMockApi } from '../api/useMockApi';

export const useUomStore = create((set, get) => ({
  uoms: [],
  conversions: [],
  loaded: false,
  error: null,
  version: 0,

  fetchAll: async () => {
    if (useMockApi()) {
      set({ loaded: true, version: get().version + 1 });
      return;
    }
    try {
      const uoms = await UomRepository.listUoms({ includeInactive: true }) || [];
      const conversionLists = await Promise.all(uoms.map((u) => UomRepository.listConversions(u.id)));
      const conversions = conversionLists.flat().filter(Boolean);
      set((s) => ({ uoms, conversions, loaded: true, error: null, version: s.version + 1 }));
    } catch (error) {
      console.error('[uom-store] fetchAll failed', error);
      set({ error: error?.response?.data?.message || error?.message || 'بارگذاری واحدهای اندازه‌گیری ناموفق بود.' });
    }
  },

  createUom: async (payload) => {
    if (useMockApi()) return null;
    const saved = await UomRepository.createUom(payload);
    if (saved) set((s) => ({ uoms: [...s.uoms, saved], version: s.version + 1 }));
    return saved;
  },
  updateUom: async (id, patch) => {
    if (useMockApi()) return null;
    const saved = await UomRepository.updateUom(id, patch);
    if (saved) set((s) => ({ uoms: s.uoms.map((u) => (u.id === id ? saved : u)), version: s.version + 1 }));
    return saved;
  },
  createConversion: async (payload) => {
    if (useMockApi()) return null;
    const saved = await UomRepository.createConversion(payload);
    if (saved) set((s) => ({ conversions: [...s.conversions, saved], version: s.version + 1 }));
    return saved;
  },
}));

export default useUomStore;
