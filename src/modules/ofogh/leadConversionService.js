/**
 * Ofogh → Kanoon lead conversion.
 * Creates a verified Company in useContactsStore; marks Lead as CONVERTED.
 * Preserves Pooyesh interactions by migrating them onto the new Company.
 */

import { useContactsStore, CONTACT_RECORD_TYPES, LIFECYCLE_STAGES, RELATIONSHIP_LIFECYCLE_STAGES } from '../../stores/useContactsStore';
import { useLeadsStore } from '../../stores/useLeadsStore';
import {
  ENTITY_TYPES,
  PERSON_TYPES,
  DEFAULT_CUSTOMER_STATUS,
} from '../kanoon/config';
import { LEAD_STATUS } from './domain/lead.constants.js';

/**
 * Mock Linka validation — simulated network delay, always succeeds when nationalId is valid shape.
 * @param {string} nationalId
 * @returns {Promise<{ ok: boolean, nationalId: string, companyName?: string }>}
 */
export async function mockLinkaValidate(nationalId) {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  const cleaned = String(nationalId || '').replace(/\D/g, '');
  if (!cleaned || cleaned.length !== 11) {
    return { ok: false, nationalId: cleaned };
  }
  return { ok: true, nationalId: cleaned };
}

/**
 * Convert an OPEN Ofogh Lead into a Kanoon Company (CUSTOMER).
 *
 * @param {string} leadId
 * @param {{ nationalId: string }} options
 * @returns {Promise<{ ok: boolean, companyId?: string|number, error?: string }>}
 */
export async function convertLeadToCompany(leadId, options = {}) {
  const lead = useLeadsStore.getState().getLead(leadId);
  if (!lead) return { ok: false, error: 'سرنخ یافت نشد.' };
  if (lead.status === LEAD_STATUS.CONVERTED) {
    return { ok: false, error: 'این سرنخ قبلاً تبدیل شده است.', companyId: lead.convertedCompanyId };
  }

  const validation = await mockLinkaValidate(options.nationalId);
  if (!validation.ok) {
    return { ok: false, error: 'شناسه ملی نامعتبر است یا استعلام لینکا ناموفق بود.' };
  }

  const companyPayload = {
    recordType: CONTACT_RECORD_TYPES.CUSTOMER,
    entityType: ENTITY_TYPES.CUSTOMER,
    personType: PERSON_TYPES.LEGAL,
    companyName: lead.companyName,
    nationalId: validation.nationalId,
    activityDomain: lead.activityDomain,
    mobile: lead.mobile,
    behavioralStatus: DEFAULT_CUSTOMER_STATUS,
    lifecycle_stage: LIFECYCLE_STAGES.COLD_LEAD,
    lifecycleStage: RELATIONSHIP_LIFECYCLE_STAGES.NOPODID,
    assignee: lead.assignee || { name: 'کاربر جاری', role: 'مسئول' },
    relatedPersons: [
      {
        fullName: lead.personName,
        mobile: lead.mobile,
        jobPosition: 'مخاطب اصلی',
        isPrimary: true,
      },
    ],
    officialSpecs: {},
    legalPersons: {},
    governance: {},
    interactions: (lead.interactions || []).map((item) => ({ ...item })),
    relatedOrders: [],
    isActive: true,
    createdAt: new Date().toISOString(),
    lastActivityAt: lead.last_interaction_date || new Date().toISOString(),
    next_follow_up_date: lead.next_follow_up_date || null,
    last_interaction_date: lead.last_interaction_date || new Date().toISOString(),
    notes: lead.notes,
    leadSource: lead.leadSource,
    convertedFromLeadId: lead.id,
  };

  const companyId = await useContactsStore.getState().addContactAsync(companyPayload);
  useLeadsStore.getState().markLeadConverted(leadId, companyId);

  return { ok: true, companyId };
}

export const leadConversionService = {
  mockLinkaValidate,
  convertLeadToCompany,
};

export default leadConversionService;
