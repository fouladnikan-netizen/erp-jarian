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
  schemaErrorByType: {},
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
    try {
      const schema = await AttributeDefinitionRepository.getSchemaForType(productTypeId, { includeInactive: false }) || [];
      set((s) => ({
        schemaByType: { ...s.schemaByType, [productTypeId]: schema },
        schemaErrorByType: { ...s.schemaErrorByType, [productTypeId]: null },
        version: s.version + 1,
      }));
      return schema;
    } catch (error) {
      console.error('[attribute-definitions-store] fetchSchemaForType failed', error);
      const message = error?.response?.data?.message
        || error?.message
        || 'بارگذاری ویژگی‌های این نوع کالا ناموفق بود.';
      set((s) => ({
        schemaErrorByType: { ...s.schemaErrorByType, [productTypeId]: message },
        version: s.version + 1,
      }));
      return [];
    }
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
    if (saved) {
      set((s) => ({
        definitions: s.definitions.map((d) => (d.id === id ? saved : d)),
        schemaByType: Object.fromEntries(
          Object.entries(s.schemaByType).map(([typeId, schema]) => [
            typeId,
            (schema || []).map((entry) => (
              entry.definition?.id === id ? { ...entry, definition: saved } : entry
            )),
          ]),
        ),
        version: s.version + 1,
      }));
    }
    return saved;
  },
  deleteDefinition: async (id) => {
    if (useMockApi()) return null;
    await AttributeDefinitionRepository.deleteDefinition(id);
    set((s) => ({ definitions: s.definitions.filter((d) => d.id !== id), version: s.version + 1 }));
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
  deleteBinding: async (id, productTypeId) => {
    if (useMockApi()) return null;
    await AttributeDefinitionRepository.deleteBinding(id);
    if (productTypeId) await get().fetchSchemaForType(productTypeId);
  },
}));

export default useAttributeDefinitionsStore;
