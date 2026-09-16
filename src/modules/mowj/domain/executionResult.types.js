/**
 * CampaignExecutionResult — outcome of consuming an ExecutionIntent.
 */

import { createEntityId, ENTITY_ID_PREFIX } from '../../../domain/identity';

export const EXECUTION_RESULT_STATUS = Object.freeze({
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  PENDING: 'PENDING',
});

export const EXECUTION_RESULT_STATUS_LABELS = Object.freeze({
  SUCCESS: 'موفق',
  FAILED: 'ناموفق',
  PENDING: 'در انتظار',
});

/**
 * Pipeline status for Campaign Detail history (intent → result).
 */
export const EXECUTOR_PIPELINE_STATUS = Object.freeze({
  INTENT_CREATED: 'INTENT_CREATED',
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
});

export const EXECUTOR_PIPELINE_STATUS_LABELS = Object.freeze({
  INTENT_CREATED: 'Intent ایجاد شد',
  PENDING: 'در انتظار',
  COMPLETED: 'تکمیل‌شده',
  FAILED: 'ناموفق',
});

/**
 * @typedef {object} CampaignExecutionResult
 * @property {string} id
 * @property {string} executionIntentId
 * @property {string} campaignId
 * @property {string} actionType
 * @property {string} status
 * @property {string|null} referenceId
 * @property {string} createdAt
 * @property {string|null} error
 * @property {object|null} [payload]  e.g. TaskCreationIntent (internal only)
 */

/**
 * @param {object} input
 * @returns {CampaignExecutionResult|null}
 */
export function normalizeExecutionResult(input = {}) {
  const executionIntentId = String(input.executionIntentId || '').trim();
  const actionType = String(input.actionType || '').trim().toUpperCase();
  if (!executionIntentId || !actionType) return null;

  const statusRaw = String(input.status || EXECUTION_RESULT_STATUS.PENDING).toUpperCase();
  const status = EXECUTION_RESULT_STATUS[statusRaw] || EXECUTION_RESULT_STATUS.PENDING;
  const nowIso = new Date().toISOString();

  return {
    id: input.id != null && input.id !== ''
      ? String(input.id)
      : createEntityId(ENTITY_ID_PREFIX.CAMPAIGN, 'exec-result'),
    executionIntentId,
    campaignId: String(input.campaignId || '').trim() || null,
    actionType,
    status,
    referenceId: input.referenceId != null && input.referenceId !== ''
      ? String(input.referenceId)
      : null,
    createdAt: input.createdAt || nowIso,
    error: input.error != null && String(input.error).trim()
      ? String(input.error).trim()
      : null,
    payload: input.payload != null && typeof input.payload === 'object'
      ? Object.freeze({ ...input.payload })
      : null,
  };
}

/**
 * @param {object} input
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateExecutionResult(input) {
  const errors = [];
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: ['نتیجه اجرا نامعتبر است.'] };
  }
  if (!String(input.executionIntentId || '').trim()) {
    errors.push('executionIntentId الزامی است.');
  }
  if (!String(input.actionType || '').trim()) {
    errors.push('actionType الزامی است.');
  }
  const status = String(input.status || '').toUpperCase();
  if (status && !EXECUTION_RESULT_STATUS[status]) {
    errors.push(`وضعیت نامعتبر: ${input.status}`);
  }
  return { ok: errors.length === 0, errors };
}

/**
 * Derive UI pipeline row from an intent + optional result.
 * @param {object} intent
 * @param {object|null} result
 */
export function resolveExecutorPipelineStatus(intent, result = null) {
  if (result) {
    if (result.status === EXECUTION_RESULT_STATUS.SUCCESS) {
      return EXECUTOR_PIPELINE_STATUS.COMPLETED;
    }
    if (result.status === EXECUTION_RESULT_STATUS.FAILED) {
      return EXECUTOR_PIPELINE_STATUS.FAILED;
    }
    return EXECUTOR_PIPELINE_STATUS.PENDING;
  }
  if (intent?.status === 'CONSUMED') {
    return EXECUTOR_PIPELINE_STATUS.PENDING;
  }
  return EXECUTOR_PIPELINE_STATUS.INTENT_CREATED;
}
