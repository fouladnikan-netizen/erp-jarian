/**
 * Order stage machine — Backend entry (re-exports shared SSOT).
 * Prefer importing evaluate* from src/domain/order/orderLifecycle.js in new code.
 */
export {
  STAGE,
  ORDER_STATUS,
  PHASE1_STAGE_IDS,
  PHASE2_STAGE_IDS,
  normalizeStageId,
  normalizeStatus,
  stageIdToStorage,
  isPhase1Stage,
  isPhase2Stage,
  isActivePhase2Stage,
  evaluateStageTransition,
  evaluateStatusTransition,
  evaluateOrderLifecyclePatch,
  canEnterMozeneStage,
  MOZENE_LOCKED_MESSAGE,
  ORDER_RULE_MESSAGES,
} from '../../../../../../src/domain/order/orderLifecycle.js';
