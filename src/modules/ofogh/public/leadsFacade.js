/**
 * Ofogh public Raw Lead surface.
 * Cross-module consumers must import from here — not useLeadsStore.
 * Ofogh UI may still use useLeadsStore as owner cache.
 */
import { LeadRepository } from '../../../api/repositories/LeadRepository.js';
import { useMockApi } from '../../../api/useMockApi.js';
import { useLeadsStore } from '../../../stores/useLeadsStore.js';

export function getLead(leadId) {
  if (leadId == null || leadId === '') return null;
  return useLeadsStore.getState().getLead(leadId) || null;
}

export function listLeads(filter) {
  const leads = useLeadsStore.getState().leads || [];
  if (typeof filter !== 'function') return [...leads];
  return leads.filter(filter);
}

export function resolveLeadReference(leadId) {
  const lead = getLead(leadId);
  if (!lead) return { ok: false, error: 'LEAD_NOT_FOUND' };
  return {
    ok: true,
    leadId: lead.id,
    displayName: lead.companyName || String(lead.id),
    status: lead.status,
    snapshot: lead,
  };
}

export function listLeadDocumentInteractions(leadId) {
  const lead = getLead(leadId);
  const list = Array.isArray(lead?.interactions) ? lead.interactions : [];
  return list.map((item) => ({ ...item }));
}

export function addLeadDocumentInteraction(leadId, note, nextFollowUpDate, type) {
  useLeadsStore.getState().addLeadInteraction(leadId, note, nextFollowUpDate, type);
}

/** React subscription for external modules that only need a version tick. */
export function useLeadsVersion() {
  return useLeadsStore((s) => s.leads.length);
}

/**
 * Deep-link into Ofogh Lead detail (ID-based).
 * @param {string} leadId
 */
export function buildOfoghLeadDeepLink(leadId) {
  if (leadId == null || leadId === '') return '/ofogh';
  return `/ofogh?leadId=${encodeURIComponent(String(leadId))}`;
}

/**
 * Interim origin rule until product defines Primary Origin:
 * earliest conversion (convertedAt), then earliest createdAt.
 * @param {Array<object>} leads
 * @returns {object|null}
 */
export function pickPrimaryOriginLead(leads) {
  const list = Array.isArray(leads) ? leads.filter(Boolean) : [];
  if (!list.length) return null;
  return [...list].sort((a, b) => {
    const ta = Date.parse(a.convertedAt || a.createdAt || 0) || 0;
    const tb = Date.parse(b.convertedAt || b.createdAt || 0) || 0;
    if (ta !== tb) return ta - tb;
    return String(a.id || '').localeCompare(String(b.id || ''));
  })[0] || null;
}

/**
 * Canonical fetch: Leads converted to this Company (Ofogh SoR via API).
 * Does not invent Company-owned Lead copies.
 * @param {string} companyId
 * @returns {Promise<object[]>}
 */
export async function fetchLeadsConvertedToCompany(companyId) {
  if (companyId == null || companyId === '') return [];

  if (useMockApi()) {
    return listLeads((lead) => String(lead.convertedCompanyId) === String(companyId));
  }

  const items = await LeadRepository.listLeads({
    convertedCompanyId: companyId,
    limit: 50,
  }) || [];

  const upsert = useLeadsStore.getState().upsertLeadCache;
  items.forEach((lead) => upsert(lead));
  return items;
}

export async function fetchLeadById(leadId) {
  return useLeadsStore.getState().fetchLeadById(leadId);
}

export const leadsFacade = {
  getLead,
  listLeads,
  resolveLeadReference,
  listLeadDocumentInteractions,
  addLeadDocumentInteraction,
  buildOfoghLeadDeepLink,
  pickPrimaryOriginLead,
  fetchLeadsConvertedToCompany,
  fetchLeadById,
};

export default leadsFacade;
