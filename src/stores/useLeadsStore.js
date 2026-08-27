/**
 * Ofogh Raw Lead store — Zustand cache / UI only when API mode is on.
 *
 * Architecture (DDL-13): Raw Lead = independent Ofogh aggregate (not a Company facet).
 * PostgreSQL = SSOT via LeadRepository (SERVER_FIRST).
 * Mock mode: local working set for offline development only.
 */

import { create } from 'zustand';
import { createEntityId, createInteractionId } from '../domain/identity';
import {
  LEAD_STATUS,
  isOpenLeadStatus,
  getAllowedLeadStatusTransitions,
} from '../modules/ofogh/domain/lead.constants.js';
import { BRAND_NAME, SHOW_BRAND_NAME } from '../config/brand';
import { LeadRepository } from '../api/repositories/LeadRepository';
import { useMockApi } from '../api/useMockApi';

function createLeadId() {
  return createEntityId('lead');
}

function patchLeadCache(set, leadId, nextLead) {
  set((state) => ({
    leads: state.leads.map((lead) => (
      String(lead.id) === String(leadId) ? { ...nextLead, id: lead.id } : lead
    )),
  }));
}

export const useLeadsStore = create((set, get) => ({
  leads: [],
  loading: false,
  hydrated: useMockApi(),
  error: null,

  fetchLeads: async () => {
    if (useMockApi()) {
      set({ hydrated: true, loading: false, error: null });
      return;
    }
    set({ loading: true, error: null });
    try {
      const leads = await LeadRepository.listLeads();
      set({ leads: leads || [], loading: false, hydrated: true });
    } catch (error) {
      console.error('[leads-store] fetchLeads failed', error);
      set({
        loading: false,
        hydrated: false,
        error: error?.message || 'بارگذاری سرنخ‌ها ناموفق بود.',
      });
    }
  },

  /** SERVER_FIRST single-lead hydrate (deep-link / profile origin). */
  fetchLeadById: async (leadId) => {
    if (leadId == null || leadId === '') return null;
    if (useMockApi()) return get().getLead(leadId);
    try {
      const lead = await LeadRepository.getLead(leadId);
      if (lead) get().upsertLeadCache(lead);
      return lead;
    } catch (error) {
      console.error('[leads-store] fetchLeadById failed', error);
      return null;
    }
  },

  addLead: (payload = {}) => {
    if (!useMockApi()) {
      void get().addLeadAsync(payload);
      return null;
    }

    const companyName = String(payload.companyName || '').trim();
    const personName = String(payload.personName || '').trim();
    const mobile = String(payload.mobile || '').trim();
    const leadSource = String(payload.leadSource || '').trim();
    if (!companyName || !personName || !mobile || !leadSource) return null;

    const id = payload.id || createLeadId();
    const now = new Date().toISOString();
    const lead = {
      id,
      companyName,
      personName,
      mobile,
      leadSource,
      activityDomain: String(payload.activityDomain || '').trim() || undefined,
      notes: String(payload.notes || '').trim() || undefined,
      status: LEAD_STATUS.NEW,
      convertedCompanyId: null,
      convertedAt: null,
      interactions: [],
      next_follow_up_date: null,
      last_interaction_date: now,
      createdAt: now,
      assignee: payload.assignee || { name: 'کاربر جاری', role: 'مسئول' },
    };

    set((state) => ({ leads: [lead, ...state.leads] }));
    return id;
  },

  /**
   * SERVER_FIRST create — returns lead id or null on failure (nothing cached).
   */
  addLeadAsync: async (payload = {}) => {
    const companyName = String(payload.companyName || '').trim();
    if (!companyName) return null;

    if (useMockApi()) {
      return get().addLead(payload);
    }

    try {
      const saved = await LeadRepository.createLead({
        companyName,
        personName: payload.personName,
        mobile: payload.mobile,
        leadSource: payload.leadSource,
        notes: payload.notes,
        activityDomain: payload.activityDomain,
        assignee: payload.assignee,
      });
      if (!saved) return null;
      set((state) => ({ leads: [saved, ...state.leads], error: null }));
      return saved.id;
    } catch (error) {
      console.error('[leads-store] create failed', error);
      set({ error: error?.message || 'ثبت سرنخ ناموفق بود.' });
      return null;
    }
  },

  updateLead: (leadId, updates = {}) => {
    if (useMockApi()) {
      set((state) => ({
        leads: state.leads.map((lead) => (
          String(lead.id) === String(leadId)
            ? { ...lead, ...updates, id: lead.id }
            : lead
        )),
      }));
      return;
    }
    void get().updateLeadAsync(leadId, updates);
  },

  updateLeadAsync: async (leadId, updates = {}) => {
    if (useMockApi()) {
      get().updateLead(leadId, updates);
      return get().getLead(leadId);
    }
    try {
      const saved = await LeadRepository.updateLead(leadId, {
        ...get().getLead(leadId),
        ...updates,
      });
      if (saved) patchLeadCache(set, leadId, saved);
      return saved;
    } catch (error) {
      console.error('[leads-store] update failed', error);
      set({ error: error?.message || 'ویرایش سرنخ ناموفق بود.' });
      throw error;
    }
  },

  /**
   * SERVER_FIRST status change — CONVERTED must use convert flow, not this method.
   * @returns {Promise<object|null>}
   */
  changeLeadStatusAsync: async (leadId, status) => {
    const prev = get().getLead(leadId);
    if (!prev) return null;

    if (useMockApi()) {
      const allowed = getAllowedLeadStatusTransitions(prev.status);
      if (!allowed.includes(status)) {
        const err = new Error('تغییر وضعیت مجاز نیست.');
        err.code = 'INVALID_LEAD_STATUS';
        throw err;
      }
      patchLeadCache(set, leadId, { ...prev, status });
      return get().getLead(leadId);
    }

    try {
      const saved = await LeadRepository.changeLeadStatus(leadId, status);
      if (saved) patchLeadCache(set, leadId, saved);
      return saved;
    } catch (error) {
      console.error('[leads-store] status change failed', error);
      set({ error: error?.response?.data?.message || error?.message || 'تغییر وضعیت ناموفق بود.' });
      throw error;
    }
  },

  /**
   * SERVER_FIRST soft-delete — removes from active cache only after success.
   * @returns {Promise<{ id: string, archived: boolean }|null>}
   */
  archiveLeadAsync: async (leadId, { reason } = {}) => {
    if (leadId == null || leadId === '') return null;

    if (useMockApi()) {
      set((state) => ({
        leads: state.leads.filter((lead) => String(lead.id) !== String(leadId)),
      }));
      return { id: leadId, archived: true };
    }

    try {
      const result = await LeadRepository.archiveLead(leadId, { reason });
      set((state) => ({
        leads: state.leads.filter((lead) => String(lead.id) !== String(leadId)),
        error: null,
      }));
      return result || { id: leadId, archived: true };
    } catch (error) {
      console.error('[leads-store] archive failed', error);
      set({ error: error?.response?.data?.message || error?.message || 'آرشیو سرنخ ناموفق بود.' });
      throw error;
    }
  },

  moveLeadPipelineStageAsync: async (leadId, stageId) => {
    if (!leadId || !stageId) return null;
    if (useMockApi()) {
      set((state) => ({
        leads: state.leads.map((lead) => (
          String(lead.id) === String(leadId)
            ? { ...lead, pipelineStageId: stageId }
            : lead
        )),
      }));
      return get().getLead(leadId);
    }
    try {
      const updated = await LeadRepository.movePipelineStage(leadId, stageId);
      if (updated) {
        set((state) => ({
          leads: state.leads.map((lead) => (
            String(lead.id) === String(leadId) ? { ...lead, ...updated } : lead
          )),
          error: null,
        }));
      }
      return updated;
    } catch (error) {
      console.error('[leads-store] move stage failed', error);
      set({ error: error?.response?.data?.message || error?.message || 'جابه‌جایی سرنخ ناموفق بود.' });
      throw error;
    }
  },

  getLead: (leadId) => {
    if (leadId == null || leadId === '') return null;
    return get().leads.find((lead) => String(lead.id) === String(leadId)) || null;
  },

  listOpenLeads: () => get().leads.filter((lead) => isOpenLeadStatus(lead.status)),

  addLeadInteraction: (leadId, note, nextFollowUpDate, type = 'note') => {
    const trimmed = String(note || '').trim();
    if (!trimmed || leadId == null) return;

    const applyLocal = (lead) => {
      if (lead.status === LEAD_STATUS.CONVERTED) return lead;
      const now = new Date().toISOString();
      const entry = {
        id: createInteractionId(leadId),
        date: now,
        note: trimmed,
        summary: trimmed,
        type,
        nextFollowUp: nextFollowUpDate || null,
        operator: lead.assignee?.name || (SHOW_BRAND_NAME ? `کاربر ${BRAND_NAME}` : 'کاربر سامانه'),
      };
      return {
        ...lead,
        interactions: [entry, ...(lead.interactions || [])],
        next_follow_up_date: nextFollowUpDate || lead.next_follow_up_date,
        last_interaction_date: now,
      };
    };

    if (useMockApi()) {
      set((state) => ({
        leads: state.leads.map((lead) => (
          String(lead.id) === String(leadId) ? applyLocal(lead) : lead
        )),
      }));
      return;
    }

    const prev = get().getLead(leadId);
    if (!prev) return;
    const next = applyLocal(prev);
    void get().updateLeadAsync(leadId, next);
  },

  /**
   * Cache-only mark after successful convert (API mode already returns CONVERTED lead).
   */
  markLeadConverted: (leadId, companyId) => {
    const now = new Date().toISOString();
    set((state) => ({
      leads: state.leads.map((lead) => (
        String(lead.id) === String(leadId)
          ? {
            ...lead,
            status: LEAD_STATUS.CONVERTED,
            convertedCompanyId: companyId,
            convertedAt: now,
          }
          : lead
      )),
    }));
  },

  /** Replace one lead in cache from API response */
  upsertLeadCache: (lead) => {
    if (!lead?.id) return;
    set((state) => {
      const exists = state.leads.some((l) => String(l.id) === String(lead.id));
      if (!exists) return { leads: [lead, ...state.leads] };
      return {
        leads: state.leads.map((l) => (String(l.id) === String(lead.id) ? lead : l)),
      };
    });
  },
}));

export default useLeadsStore;
