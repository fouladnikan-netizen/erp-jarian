/**
 * Attribute Definition + Product Type schema-binding cache — Zustand UI
 * cache only. PostgreSQL is SSOT via AttributeDefinitionRepository
 * (Shirazeh-owned, DDL-24c).
 */
import { create } from 'zustand';
import { AttributeDefinitionRepository } from '../api/repositories/AttributeDefinitionRepository';
import { useMockApi } from '../api/useMockApi';

export const useAttributeDefinitionsStore = create((set, get) => ({
  definitions: [],
  schemaByType: {},
  loaded: false,
  error: null,
  version: 0,

  fetchAll: async () => {
    if (useMockApi()) {
      set({ loaded: true, version: get().version + 1 });
      return;
    }
    try {
      const items = await AttributeDefinitionRepository.listDefinitions({ includeInactive: true }) || [];
      set((s) => ({ definitions: items, loaded: true, error: null, version: s.version + 1 }));
    } catch (error) {
      console.error('[attribute-definitions-store] fetchAll failed', error);
      set({ error: error?.response?.data?.message || error?.message || 'بارگذاری تعاریف ویژگی ناموفق بود.' });
    }
  },

  fetchSchemaForType: async (productTypeId) => {
    if (!productTypeId || useMockApi()) return [];
    const schema = await AttributeDefinitionRepository.getSchemaForType(productTypeId, { includeInactive: true }) || [];
    set((s) => ({ schemaByType: { ...s.schemaByType, [productTypeId]: schema }, version: s.version + 1 }));
    return schema;
  },

  createDefinition: async (payload) => {
    if (useMockApi()) return null;
    const saved = await AttributeDefinitionRepository.createDefinition(payload);
    if (saved) set((s) => ({ definitions: [...s.definitions, saved], version: s.version + 1 }));
    return saved;
  },
  updateDefinition: async (id, patch) => {
    if (useMockApi()) return null;
    const saved = await AttributeDefinitionRepository.updateDefinition(id, patch);
    if (saved) set((s) => ({ definitions: s.definitions.map((d) => (d.id === id ? saved : d)), version: s.version + 1 }));
    return saved;
  },

  bindAttribute: async (payload) => {
    if (useMockApi()) return null;
    const saved = await AttributeDefinitionRepository.bindAttribute(payload);
    if (saved) await get().fetchSchemaForType(payload.productTypeId);
    return saved;
  },
  updateBinding: async (id, patch, productTypeId) => {
    if (useMockApi()) return null;
    const saved = await AttributeDefinitionRepository.updateBinding(id, patch);
    if (saved && productTypeId) await get().fetchSchemaForType(productTypeId);
    return saved;
  },
}));

export default useAttributeDefinitionsStore;
