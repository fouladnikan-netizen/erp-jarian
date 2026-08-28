/**
 * Brand Registry cache — Zustand UI cache only. PostgreSQL is SSOT via
 * BrandRepository (Shirazeh-owned, DDL-24d). Duplicate-detection is always
 * backend-authoritative — `checkDuplicate` is a pre-flight warning helper.
 */
import { create } from 'zustand';
import { BrandRepository } from '../api/repositories/BrandRepository';
import { useMockApi } from '../api/useMockApi';

export const useBrandsStore = create((set, get) => ({
  brands: [],
  loaded: false,
  error: null,
  version: 0,

  fetchAll: async () => {
    if (useMockApi()) {
      set({ loaded: true, version: get().version + 1 });
      return;
    }
    try {
      const items = await BrandRepository.listBrands({ includeInactive: true }) || [];
      set((s) => ({ brands: items, loaded: true, error: null, version: s.version + 1 }));
    } catch (error) {
      console.error('[brands-store] fetchAll failed', error);
      set({ error: error?.response?.data?.message || error?.message || 'بارگذاری برندها ناموفق بود.' });
    }
  },

  /** @returns {Promise<{ exact: object|null, probable: Array<{brand:object, score:number}> }>} */
  checkDuplicate: async (brandName) => {
    if (useMockApi()) return { exact: null, probable: [] };
    return BrandRepository.checkDuplicate(brandName);
  },

  createBrand: async (payload) => {
    if (useMockApi()) return null;
    const saved = await BrandRepository.createBrand(payload);
    if (saved) set((s) => ({ brands: [...s.brands, saved], version: s.version + 1 }));
    return saved;
  },
  updateBrand: async (id, patch) => {
    if (useMockApi()) return null;
    const saved = await BrandRepository.updateBrand(id, patch);
    if (saved) set((s) => ({ brands: s.brands.map((b) => (b.id === id ? saved : b)), version: s.version + 1 }));
    return saved;
  },
}));

export default useBrandsStore;
