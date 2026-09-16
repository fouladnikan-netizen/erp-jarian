import { LIFECYCLE_STAGES } from './lifecycle.constants.js';
import {
  RELATIONSHIP_LIFECYCLE_STAGES,
  RELATIONSHIP_LIFECYCLE_LABELS,
} from './relationshipLifecycle.constants.js';

/** Ofogh pipeline stage → Kanoon relationship lifecycle. */
const PIPELINE_TO_RELATIONSHIP = Object.freeze({
  [LIFECYCLE_STAGES.COLD_LEAD]: RELATIONSHIP_LIFECYCLE_STAGES.NOPODID,
  [LIFECYCLE_STAGES.PITCHED]: RELATIONSHIP_LIFECYCLE_STAGES.DIDAR,
  [LIFECYCLE_STAGES.NURTURING]: RELATIONSHIP_LIFECYCLE_STAGES.ROYESH,
  [LIFECYCLE_STAGES.SALES_QUALIFIED]: RELATIONSHIP_LIFECYCLE_STAGES.ASTANE,
  [LIFECYCLE_STAGES.FIRST_TIME_BUYER]: RELATIONSHIP_LIFECYCLE_STAGES.NOPAYMAN,
  [LIFECYCLE_STAGES.LOYAL]: RELATIONSHIP_LIFECYCLE_STAGES.HAMPAYMAN,
  [LIFECYCLE_STAGES.ARCHIVED]: RELATIONSHIP_LIFECYCLE_STAGES.SAYEH,
});

/** Kanoon relationship lifecycle → Ofogh pipeline stage (RAW_LEAD excluded). */
const RELATIONSHIP_TO_PIPELINE = Object.freeze({
  [RELATIONSHIP_LIFECYCLE_STAGES.NOPODID]: LIFECYCLE_STAGES.COLD_LEAD,
  [RELATIONSHIP_LIFECYCLE_STAGES.DIDAR]: LIFECYCLE_STAGES.PITCHED,
  [RELATIONSHIP_LIFECYCLE_STAGES.ROYESH]: LIFECYCLE_STAGES.NURTURING,
  [RELATIONSHIP_LIFECYCLE_STAGES.ASTANE]: LIFECYCLE_STAGES.SALES_QUALIFIED,
  [RELATIONSHIP_LIFECYCLE_STAGES.NOPAYMAN]: LIFECYCLE_STAGES.FIRST_TIME_BUYER,
  [RELATIONSHIP_LIFECYCLE_STAGES.HAMPAYMAN]: LIFECYCLE_STAGES.LOYAL,
  [RELATIONSHIP_LIFECYCLE_STAGES.SAYEH]: LIFECYCLE_STAGES.ARCHIVED,
});

const RECORD_TYPE_LEAD = 'LEAD';

/**
 * Resolve Kanoon relationship lifecycle for a *Company* contact aggregate.
 * Raw Leads are not Companies — Ofogh board uses useLeadsStore + LifecycleVisualRegistry.
 * recordType LEAD is legacy and should not appear on customer columns.
 *
 * @param {object|null|undefined} contact
 * @returns {string} RELATIONSHIP_LIFECYCLE_STAGES value (customer continuum; never invent Raw Lead for empty company)
 */
export function resolveContactLifecycleStage(contact) {
  if (!contact) return RELATIONSHIP_LIFECYCLE_STAGES.NOPODID;

  // Legacy LEAD recordType: kept for Kanoon table compatibility — Ofogh board excludes these rows
  if (contact.recordType === RECORD_TYPE_LEAD) {
    return RELATIONSHIP_LIFECYCLE_STAGES.RAW_LEAD;
  }

  const explicit = contact.lifecycleStage;
  if (explicit && RELATIONSHIP_LIFECYCLE_LABELS[explicit]
    && explicit !== RELATIONSHIP_LIFECYCLE_STAGES.RAW_LEAD) {
    return explicit;
  }

  const fromPipeline = PIPELINE_TO_RELATIONSHIP[contact.lifecycle_stage];
  if (fromPipeline) return fromPipeline;

  return RELATIONSHIP_LIFECYCLE_STAGES.NOPODID;
}

/** @param {string} pipelineStage */
export function relationshipStageFromPipelineStage(pipelineStage) {
  return PIPELINE_TO_RELATIONSHIP[pipelineStage] ?? RELATIONSHIP_LIFECYCLE_STAGES.NOPODID;
}

/** @param {string} relationshipStage */
export function pipelineStageFromRelationshipStage(relationshipStage) {
  return RELATIONSHIP_TO_PIPELINE[relationshipStage] ?? LIFECYCLE_STAGES.COLD_LEAD;
}

/** @param {string} stage */
export function getRelationshipLifecycleLabel(stage) {
  return RELATIONSHIP_LIFECYCLE_LABELS[stage] || '—';
}
