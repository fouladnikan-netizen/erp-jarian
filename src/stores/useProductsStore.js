/**
 * Product/SKU cache (Vitrin) — Zustand UI cache only. PostgreSQL is SSOT via
 * ProductRepository (Vitrin-owned, DDL-24). Backend is authoritative for SKU
 * generation, canonical-identity duplicate blocking, schema validation, and
 * lifecycle — this store never re-implements any of that.
 */
import { create } from 'zustand';
import { ProductRepository } from '../api/repositories/ProductRepository';
import { useMockApi } from '../api/useMockApi';

export const useProductsStore = create((set, get) => ({
  products: [],
  loaded: false,
  error: null,
  version: 0,

  search: async (filters = {}) => {
    if (useMockApi()) {
      set({ loaded: true, version: get().version + 1 });
      return [];
    }
    try {
      const items = await ProductRepository.searchProducts(filters) || [];
      set((s) => ({ products: items, loaded: true, error: null, version: s.version + 1 }));
      return items;
    } catch (error) {
      console.error('[products-store] search failed', error);
      set({ error: error?.response?.data?.message || error?.message || 'جست‌وجوی کالا ناموفق بود.' });
      return [];
    }
  },

  getProduct: async (id) => {
    if (useMockApi()) return null;
    return ProductRepository.getProduct(id);
  },

  /** Throws on 409 (exact/probable duplicate) — caller shows the warning and may retry with confirmDuplicate:true. */
  createProduct: async (payload) => {
    if (useMockApi()) return null;
    const saved = await ProductRepository.createProduct(payload);
    if (saved) set((s) => ({ products: [saved, ...s.products], version: s.version + 1 }));
    return saved;
  },

  updateProduct: async (id, patch) => {
    if (useMockApi()) return null;
    const saved = await ProductRepository.updateProduct(id, patch);
    if (saved) set((s) => ({ products: s.products.map((p) => (p.id === id ? saved : p)), version: s.version + 1 }));
    return saved;
  },

  setActive: async (id, isActive) => {
    if (useMockApi()) return null;
    const saved = isActive
      ? await ProductRepository.activateProduct(id)
      : await ProductRepository.deactivateProduct(id);
    if (saved) set((s) => ({ products: s.products.map((p) => (p.id === id ? saved : p)), version: s.version + 1 }));
    return saved;
  },

  listRelationships: async (productId) => {
    if (useMockApi()) return [];
    return ProductRepository.listRelationships(productId) || [];
  },
  createRelationship: async (payload) => {
    if (useMockApi()) return null;
    return ProductRepository.createRelationship(payload);
  },
  deactivateRelationship: async (id) => {
    if (useMockApi()) return null;
    return ProductRepository.deactivateRelationship(id);
  },

  runBulkImport: async (payload) => {
    if (useMockApi()) return null;
    return ProductRepository.runBulkImport(payload);
  },
  listBulkImportBatches: async () => {
    if (useMockApi()) return [];
    return ProductRepository.listBulkImportBatches() || [];
  },
}));

export default useProductsStore;
