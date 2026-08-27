/**
 * Raw Lead / Company capability matrix (DDL-14 Global Gate).
 * Domain enforcement — UI hide is not enough.
 */

import {
  ENTITY_REF_TYPE,
  normalizeEntityReference,
  parseEntityReference,
} from './entityReference.js';

/** Capability keys used across modules */
export const ERP_CAPABILITY = Object.freeze({
  ACTIVITY: 'ACTIVITY',
  TASK: 'TASK',
  FOLLOW_UP: 'FOLLOW_UP',
  NOTE: 'NOTE',
  ORDER: 'ORDER',
  QUOTATION: 'QUOTATION',
  FINANCE: 'FINANCE',
  CAMPAIGN: 'CAMPAIGN',
  CORRESPONDENCE: 'CORRESPONDENCE',
  CONTRACT: 'CONTRACT',
});

const RAW_LEAD_ALLOWED = new Set([
  ERP_CAPABILITY.ACTIVITY,
  ERP_CAPABILITY.TASK,
  ERP_CAPABILITY.FOLLOW_UP,
  ERP_CAPABILITY.NOTE,
]);

const COMPANY_DENIED = new Set(); // Company allowed for all listed capabilities subject to RBAC

export const RAW_LEAD_GATE_ERROR = Object.freeze({
  ORDER: 'RAW_LEAD_NOT_ELIGIBLE_FOR_ORDER',
  QUOTATION: 'RAW_LEAD_NOT_ELIGIBLE_FOR_QUOTATION',
  FINANCE: 'RAW_LEAD_NOT_ELIGIBLE_FOR_FINANCE',
  CAMPAIGN: 'RAW_LEAD_NOT_ELIGIBLE_FOR_CAMPAIGN',
  CORRESPONDENCE: 'RAW_LEAD_NOT_ELIGIBLE_FOR_CORRESPONDENCE',
  CONTRACT: 'RAW_LEAD_NOT_ELIGIBLE_FOR_CONTRACT',
  GENERIC: 'RAW_LEAD_NOT_ELIGIBLE',
});

const CAPABILITY_ERROR = Object.freeze({
  [ERP_CAPABILITY.ORDER]: RAW_LEAD_GATE_ERROR.ORDER,
  [ERP_CAPABILITY.QUOTATION]: RAW_LEAD_GATE_ERROR.QUOTATION,
  [ERP_CAPABILITY.FINANCE]: RAW_LEAD_GATE_ERROR.FINANCE,
  [ERP_CAPABILITY.CAMPAIGN]: RAW_LEAD_GATE_ERROR.CAMPAIGN,
  [ERP_CAPABILITY.CORRESPONDENCE]: RAW_LEAD_GATE_ERROR.CORRESPONDENCE,
  [ERP_CAPABILITY.CONTRACT]: RAW_LEAD_GATE_ERROR.CONTRACT,
});

const CAPABILITY_MESSAGE = Object.freeze({
  [ERP_CAPABILITY.ORDER]:
    'Raw lead must be converted to a company before an order can be created.',
  [ERP_CAPABILITY.QUOTATION]:
    'Raw lead must be converted to a company before a quotation can be created.',
  [ERP_CAPABILITY.FINANCE]:
    'Raw lead is not eligible for financial operations.',
  [ERP_CAPABILITY.CAMPAIGN]:
    'Raw lead cannot be used as a campaign audience target.',
  [ERP_CAPABILITY.CORRESPONDENCE]:
    'Raw lead is not eligible for formal correspondence.',
  [ERP_CAPABILITY.CONTRACT]:
    'Raw lead is not eligible for contracts.',
});

export function isCapabilityAllowed(entityType, capability) {
  const type = String(entityType || '').toUpperCase();
  const cap = String(capability || '').toUpperCase();
  if (type === ENTITY_REF_TYPE.COMPANY) {
    return !COMPANY_DENIED.has(cap);
  }
  if (type === ENTITY_REF_TYPE.RAW_LEAD) {
    return RAW_LEAD_ALLOWED.has(cap);
  }
  return false;
}

/**
 * @returns {{ ok: true, ref: object }|{ ok: false, code: string, message: string }}
 */
export function assertEntityEligibleFor(subject, capability) {
  const parsed = parseEntityReference(subject);
  if (!parsed.ok) {
    return {
      ok: false,
      code: parsed.code,
      message: parsed.error,
    };
  }
  const { ref } = parsed;
  if (isCapabilityAllowed(ref.entityType, capability)) {
    return { ok: true, ref };
  }
  if (ref.entityType === ENTITY_REF_TYPE.RAW_LEAD) {
    return {
      ok: false,
      code: CAPABILITY_ERROR[capability] || RAW_LEAD_GATE_ERROR.GENERIC,
      message: CAPABILITY_MESSAGE[capability]
        || 'Raw lead is not eligible for this operation.',
    };
  }
  return {
    ok: false,
    code: 'INVALID_ENTITY_REFERENCE',
    message: 'مرجع موجودیت برای این عملیات مجاز نیست.',
  };
}

/**
 * Detect Raw Lead disguised as order party fields.
 * @param {object} body
 */
export function detectRawLeadOrderAttempt(body = {}) {
  const entityType = String(body.entityType || body.subjectType || '').toUpperCase();
  if (entityType === ENTITY_REF_TYPE.RAW_LEAD) {
    return { attempted: true, reason: 'entityType' };
  }
  if (body.leadId) {
    return { attempted: true, reason: 'leadId' };
  }
  if (body.subject) {
    const ref = normalizeEntityReference(body.subject);
    if (ref?.entityType === ENTITY_REF_TYPE.RAW_LEAD) {
      return { attempted: true, reason: 'subject' };
    }
  }
  const companyId = body.companyId || body.customerId;
  if (companyId != null && String(companyId).startsWith('lead_')) {
    return { attempted: true, reason: 'lead_prefix' };
  }
  return { attempted: false };
}

export default {
  ERP_CAPABILITY,
  RAW_LEAD_GATE_ERROR,
  isCapabilityAllowed,
  assertEntityEligibleFor,
  detectRawLeadOrderAttempt,
};
