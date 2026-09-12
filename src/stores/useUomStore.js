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
  conversionsLoaded: false,
  error: null,
  version: 0,

  fetchAll: async ({ includeConversions = false } = {}) => {
    if (useMockApi()) {
      set({ loaded: true, conversionsLoaded: true, version: get().version + 1 });
      return;
    }
    const state = get();
    if (state.loaded && (!includeConversions || state.conversionsLoaded)) return;
    try {
      const uoms = state.loaded
        ? state.uoms
        : (await UomRepository.listUoms({ includeInactive: true }) || []);
      let conversions = state.conversions;
      let conversionsLoaded = state.conversionsLoaded;
      if (includeConversions && !conversionsLoaded) {
        const conversionLists = await Promise.all(uoms.map((u) => UomRepository.listConversions(u.id)));
        conversions = conversionLists.flat().filter(Boolean);
        conversionsLoaded = true;
      }
      set((s) => ({
        uoms,
        conversions,
        loaded: true,
        conversionsLoaded,
        error: null,
        version: s.version + 1,
      }));
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
  deleteUom: async (id) => {
    if (useMockApi()) return null;
    await UomRepository.deleteUom(id);
    set((s) => ({
      uoms: s.uoms.filter((u) => u.id !== id),
      conversions: s.conversions.filter((c) => c.fromUomId !== id && c.toUomId !== id),
      version: s.version + 1,
    }));
  },
  createConversion: async (payload) => {
    if (useMockApi()) return null;
    const saved = await UomRepository.createConversion(payload);
    if (saved) set((s) => ({ conversions: [...s.conversions, saved], version: s.version + 1 }));
    return saved;
  },
}));

export default useUomStore;
