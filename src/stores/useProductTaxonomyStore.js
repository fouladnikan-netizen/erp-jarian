/**
 * Product Taxonomy (Group -> Category -> Product Type) cache — Zustand UI
 * cache only. PostgreSQL is SSOT via ProductTaxonomyRepository (Shirazeh-owned,
 * DDL-24). No mock/offline fixture existed for this before this task — mock
 * mode simply renders empty, matching this being a brand-new admin surface.
 */
import { create } from 'zustand';
import { ProductTaxonomyRepository } from '../api/repositories/ProductTaxonomyRepository';
import { useMockApi } from '../api/useMockApi';

export const useProductTaxonomyStore = create((set, get) => ({
  groups: [],
  categories: [],
  types: [],
  loaded: false,
  error: null,
  version: 0,

  fetchAll: async () => {
    if (useMockApi()) {
      set({ loaded: true, version: get().version + 1 });
      return;
    }
    try {
      const [groups, categories, types] = await Promise.all([
        ProductTaxonomyRepository.listGroups({ includeInactive: true }),
        ProductTaxonomyRepository.listCategories({ includeInactive: true }),
        ProductTaxonomyRepository.listTypes({ includeInactive: true }),
      ]);
      set((s) => ({
        groups: groups || [], categories: categories || [], types: types || [],
        loaded: true, error: null, version: s.version + 1,
      }));
    } catch (error) {
      console.error('[product-taxonomy-store] fetchAll failed', error);
      set({ error: error?.response?.data?.message || error?.message || 'بارگذاری طبقه‌بندی کالا ناموفق بود.' });
    }
  },

  createGroup: async (payload) => {
    if (useMockApi()) return null;
    const saved = await ProductTaxonomyRepository.createGroup(payload);
    if (saved) set((s) => ({ groups: [...s.groups, saved], version: s.version + 1 }));
    return saved;
  },
  updateGroup: async (id, patch) => {
    if (useMockApi()) return null;
    const saved = await ProductTaxonomyRepository.updateGroup(id, patch);
    if (saved) set((s) => ({ groups: s.groups.map((g) => (g.id === id ? saved : g)), version: s.version + 1 }));
    return saved;
  },

  createCategory: async (payload) => {
    if (useMockApi()) return null;
    const saved = await ProductTaxonomyRepository.createCategory(payload);
    if (saved) set((s) => ({ categories: [...s.categories, saved], version: s.version + 1 }));
    return saved;
  },
  updateCategory: async (id, patch) => {
    if (useMockApi()) return null;
    const saved = await ProductTaxonomyRepository.updateCategory(id, patch);
    if (saved) set((s) => ({ categories: s.categories.map((c) => (c.id === id ? saved : c)), version: s.version + 1 }));
    return saved;
  },

  createType: async (payload) => {
    if (useMockApi()) return null;
    const saved = await ProductTaxonomyRepository.createType(payload);
    if (saved) set((s) => ({ types: [...s.types, saved], version: s.version + 1 }));
    return saved;
  },
  updateType: async (id, patch) => {
    if (useMockApi()) return null;
    const saved = await ProductTaxonomyRepository.updateType(id, patch);
    if (saved) set((s) => ({ types: s.types.map((t) => (t.id === id ? saved : t)), version: s.version + 1 }));
    return saved;
  },
}));

export default useProductTaxonomyStore;
