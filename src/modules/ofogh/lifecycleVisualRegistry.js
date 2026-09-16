/**
 * Ofogh presentation-only visual registry (not a domain enum).
 * Maps Company lifecycle + Raw Lead status → monochrome indicator kinds.
 *
 * Raw Lead is NEVER a customer lifecycle stage in this registry.
 */

import { RELATIONSHIP_LIFECYCLE_STAGES } from '../../domain/party/relationshipLifecycle.constants.js';
import { getRelationshipLifecycleLabel } from '../../domain/party/relationshipLifecycle.js';
import { LEAD_STATUS, LEAD_STATUS_LABELS, isOpenLeadStatus } from './domain/lead.constants.js';
import { relationshipStageFromPipelineStage } from '../../domain/party/relationshipLifecycle.js';

/** Visual kinds consumed by LifecycleIndicator */
export const LIFECYCLE_VISUAL_KIND = Object.freeze({
  DASHED_CIRCLE: 'DASHED_CIRCLE',
  EMPTY_CIRCLE: 'EMPTY_CIRCLE',
  CIRCLE_25: 'CIRCLE_25',
  CIRCLE_50: 'CIRCLE_50',
  CIRCLE_75: 'CIRCLE_75',
  FULL_CIRCLE: 'FULL_CIRCLE',
  STAR: 'STAR',
  MOON: 'MOON',
  CONVERTED_DASHED_CHECK: 'CONVERTED_DASHED_CHECK',
  REJECTED_DASHED_SLASH: 'REJECTED_DASHED_SLASH',
});

const COMPANY_STAGE_TO_VISUAL = Object.freeze({
  [RELATIONSHIP_LIFECYCLE_STAGES.NOPODID]: LIFECYCLE_VISUAL_KIND.EMPTY_CIRCLE,
  [RELATIONSHIP_LIFECYCLE_STAGES.DIDAR]: LIFECYCLE_VISUAL_KIND.CIRCLE_25,
  [RELATIONSHIP_LIFECYCLE_STAGES.ROYESH]: LIFECYCLE_VISUAL_KIND.CIRCLE_50,
  [RELATIONSHIP_LIFECYCLE_STAGES.ASTANE]: LIFECYCLE_VISUAL_KIND.CIRCLE_75,
  [RELATIONSHIP_LIFECYCLE_STAGES.NOPAYMAN]: LIFECYCLE_VISUAL_KIND.FULL_CIRCLE,
  [RELATIONSHIP_LIFECYCLE_STAGES.HAMPAYMAN]: LIFECYCLE_VISUAL_KIND.STAR,
  [RELATIONSHIP_LIFECYCLE_STAGES.SAYEH]: LIFECYCLE_VISUAL_KIND.MOON,
});

/**
 * Raw Lead status → visual. Never maps to customer lifecycle fills.
 * @param {string} [status]
 * @returns {{ kind: string, label: string, entityType: 'RAW_LEAD' }}
 */
export function resolveRawLeadVisual(status) {
  if (status === LEAD_STATUS.CONVERTED) {
    return {
      kind: LIFECYCLE_VISUAL_KIND.CONVERTED_DASHED_CHECK,
      label: LEAD_STATUS_LABELS[LEAD_STATUS.CONVERTED] || 'تبدیل‌شده',
      entityType: 'RAW_LEAD',
    };
  }
  if (status === LEAD_STATUS.REJECTED) {
    return {
      kind: LIFECYCLE_VISUAL_KIND.REJECTED_DASHED_SLASH,
      label: LEAD_STATUS_LABELS[LEAD_STATUS.REJECTED] || 'ردشده',
      entityType: 'RAW_LEAD',
    };
  }
  // NEW | QUALIFYING | OPEN | unknown open → dashed
  return {
    kind: LIFECYCLE_VISUAL_KIND.DASHED_CIRCLE,
    label: LEAD_STATUS_LABELS[LEAD_STATUS.OPEN] || 'سرنخ خام',
    entityType: 'RAW_LEAD',
    isOpen: isOpenLeadStatus(status) || !status,
  };
}

/**
 * Company relationship / pipeline stage → visual.
 * Legacy RAW_LEAD on a Company aggregate is treated as نوپدید (empty), never as Raw Lead card.
 * Empty / missing → نوپدید (empty circle), never dashed Raw Lead.
 *
 * @param {{ relationshipStage?: string, lifecycleStage?: string, lifecycle_stage?: string, recordType?: string }} company
 */
export function resolveCompanyLifecycleVisual(company = {}) {
  // Defensive: LEAD recordType should not appear as company card; still do not use dashed for board companies
  let stage = company.lifecycleStage || company.relationshipStage || null;
  if (!stage && company.lifecycle_stage) {
    stage = relationshipStageFromPipelineStage(company.lifecycle_stage);
  }

  // Legacy: RAW_LEAD on company continuum → NOPODID empty (not dashed Raw Lead)
  if (stage === RELATIONSHIP_LIFECYCLE_STAGES.RAW_LEAD || !stage) {
    stage = RELATIONSHIP_LIFECYCLE_STAGES.NOPODID;
  }

  const kind = COMPANY_STAGE_TO_VISUAL[stage] || LIFECYCLE_VISUAL_KIND.EMPTY_CIRCLE;
  return {
    kind,
    label: getRelationshipLifecycleLabel(stage),
    entityType: 'COMPANY',
    stage,
  };
}

/**
 * Unified Ofogh presentation view-model helper (identity preserved).
 * @param {{ entityType: 'RAW_LEAD'|'COMPANY', entityId: string|number, displayName?: string, status?: string, company?: object }} input
 */
export function buildOfoghPresentationItem(input) {
  if (input.entityType === 'RAW_LEAD') {
    const visual = resolveRawLeadVisual(input.status);
    return {
      entityType: 'RAW_LEAD',
      entityId: input.entityId,
      displayName: input.displayName || '',
      visualState: visual.kind,
      visualLabel: visual.label,
      ...visual,
    };
  }
  const visual = resolveCompanyLifecycleVisual(input.company || input);
  return {
    entityType: 'COMPANY',
    entityId: input.entityId,
    displayName: input.displayName || '',
    visualState: visual.kind,
    visualLabel: visual.label,
    ...visual,
  };
}

/** @deprecated Prefer resolveCompanyLifecycleVisual / resolveRawLeadVisual */
export function resolveVisualFromLegacyStage(stage) {
  if (stage === RELATIONSHIP_LIFECYCLE_STAGES.RAW_LEAD) {
    return resolveRawLeadVisual(LEAD_STATUS.NEW);
  }
  if (stage === LEAD_STATUS.CONVERTED || stage === 'CONVERTED') {
    return resolveRawLeadVisual(LEAD_STATUS.CONVERTED);
  }
  if (stage === LEAD_STATUS.REJECTED || stage === 'REJECTED') {
    return resolveRawLeadVisual(LEAD_STATUS.REJECTED);
  }
  return resolveCompanyLifecycleVisual({ lifecycleStage: stage });
}

export const LifecycleVisualRegistry = {
  LIFECYCLE_VISUAL_KIND,
  resolveRawLeadVisual,
  resolveCompanyLifecycleVisual,
  buildOfoghPresentationItem,
  resolveVisualFromLegacyStage,
};

export default LifecycleVisualRegistry;
