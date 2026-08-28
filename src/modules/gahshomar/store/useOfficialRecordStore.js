/**
 * Gahshomar Correspondence cache (DDL-23) — Zustand UI cache only when API
 * mode is on. PostgreSQL is SSOT via CorrespondenceRepository (SERVER_FIRST).
 *
 * Mock mode: data lives in officialRecordRepository's in-memory array;
 * `bump()` is still used there to trigger React re-reads after a mutation.
 */

import { create } from 'zustand';
import { CorrespondenceRepository } from '../../../api/repositories/CorrespondenceRepository';
import { correspondenceFromApi } from '../../../api/mappers/correspondenceMapper';

export const useOfficialRecordStore = create((set, get) => ({
  version: 0,
  /** @type {Array<object>} raw (normalizeOfficialRecord-shaped) records — API mode only */
  records: [],
  loading: false,
  error: null,

  bump: () => set((state) => ({ version: state.version + 1 })),

  getRecord: (id) => {
    if (id == null || id === '') return null;
    return get().records.find((r) => String(r.id) === String(id)) || null;
  },

  upsertRecord: (record) => {
    if (!record) return;
    set((state) => ({
      records: [record, ...state.records.filter((r) => String(r.id) !== String(record.id))],
      version: state.version + 1,
    }));
  },

  fetchAll: async (filters = {}) => {
    set({ loading: true, error: null });
    try {
      const items = await CorrespondenceRepository.listCorrespondence(filters) || [];
      set((state) => ({ records: items, loading: false, version: state.version + 1 }));
      return items;
    } catch (error) {
      console.error('[official-record-store] fetchAll failed', error);
      set({ loading: false, error: error?.response?.data?.message || error?.message || 'بارگذاری مکاتبات ناموفق بود.' });
      return [];
    }
  },

  fetchById: async (id) => {
    try {
      const item = await CorrespondenceRepository.getCorrespondence(id);
      if (item) get().upsertRecord(item);
      return item;
    } catch (error) {
      console.error('[official-record-store] fetchById failed', error);
      set({ error: error?.response?.data?.message || error?.message || 'بارگذاری مکاتبه ناموفق بود.' });
      return null;
    }
  },

  createRecordAsync: async (payload) => {
    const saved = await CorrespondenceRepository.createCorrespondence(payload);
    if (saved) get().upsertRecord(saved);
    return saved;
  },

  updateRecordAsync: async (id, patch) => {
    const saved = await CorrespondenceRepository.updateCorrespondence(id, patch);
    if (saved) get().upsertRecord(saved);
    return saved;
  },

  aiRewriteAsync: async (id, text) => {
    const result = await CorrespondenceRepository.aiRewrite(id, text);
    if (result?.content) {
      const existing = get().getRecord(id);
      if (existing) get().upsertRecord({ ...existing, aiRewrittenBody: result.content, body: result.content });
    }
    return result;
  },

  finalizeAsync: async (id, payload) => {
    const saved = await CorrespondenceRepository.finalize(id, payload);
    if (saved) get().upsertRecord(saved);
    return saved;
  },

  archiveRecordAsync: async (id) => {
    const result = await CorrespondenceRepository.archiveCorrespondence(id);
    set((state) => ({
      records: state.records.filter((r) => String(r.id) !== String(id)),
      version: state.version + 1,
    }));
    return result;
  },
}));

export { correspondenceFromApi };
