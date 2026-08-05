/**
 * CampaignExecutor — consumes CampaignExecutionIntent via ActionType registry.
 * Internal ERP intents only; no external channel send.
 */

import { validateExecutionIntent, EXECUTION_INTENT_STATUS } from './executionIntent.types';
import {
  normalizeExecutionResult,
  EXECUTION_RESULT_STATUS,
} from './executionResult.types';
import { createDefaultExecutorRegistry, selectExecutor } from './executorRegistry';
import { createEmptyExecutionResultRepository } from './executor.ports';

/**
 * @param {import('./executor.ports').CampaignExecutorPorts} [ports]
 * @param {Record<string, import('./executor.ports').ActionExecutor>} [registry]
 */
export function createCampaignExecutor(
  ports = {},
  registry = createDefaultExecutorRegistry(),
) {
  const results = ports.results || createEmptyExecutionResultRepository();
  const findCampaign = typeof ports.findCampaign === 'function'
    ? ports.findCampaign
    : () => null;
  const findTemplate = typeof ports.findTemplate === 'function'
    ? ports.findTemplate
    : () => null;
  const saveExecutionIntent = typeof ports.saveExecutionIntent === 'function'
    ? ports.saveExecutionIntent
    : null;

  /**
   * @param {object} intent
   * @returns {{
   *   ok: boolean,
   *   result: object|null,
   *   taskCreationIntent?: object|null,
   *   error?: string
   * }}
   */
  function execute(intent) {
    const check = validateExecutionIntent(intent);
    if (!check.ok) {
      return {
        ok: false,
        result: null,
        error: check.errors.join(' '),
      };
    }

    if (intent.status === EXECUTION_INTENT_STATUS.CANCELLED) {
      return {
        ok: false,
        result: null,
        error: 'Intent لغو شده قابل اجرا نیست.',
      };
    }

    if (intent.status === EXECUTION_INTENT_STATUS.CONSUMED) {
      const existing = results.findByIntentId?.(intent.id);
      if (existing) {
        return { ok: existing.status === EXECUTION_RESULT_STATUS.SUCCESS, result: existing };
      }
      return {
        ok: false,
        result: null,
        error: 'Intent قبلاً مصرف شده است.',
      };
    }

    const actionType = String(intent.actionType || '').toUpperCase();
    const executor = selectExecutor(registry, actionType);
    if (!executor) {
      const rejected = normalizeExecutionResult({
        executionIntentId: intent.id,
        campaignId: intent.campaignId,
        actionType: actionType || 'UNKNOWN',
        status: EXECUTION_RESULT_STATUS.FAILED,
        referenceId: null,
        error: `اقدام نامعتبر یا بدون Executor: ${actionType || '—'}`,
      });
      const saved = results.save(rejected);
      markConsumed(intent);
      return {
        ok: false,
        result: saved,
        error: saved?.error,
      };
    }

    const campaign = findCampaign(intent.campaignId);
    const action = campaign?.action
      || (campaign?.actionType
        ? { actionType: campaign.actionType, templateId: campaign.templateId }
        : { actionType, templateId: null, id: null, campaignId: intent.campaignId, configuration: {} });

    // Prefer campaign action when actionType matches; otherwise synthesize from intent
    const resolvedAction = action?.actionType === actionType
      ? action
      : {
          id: action?.id || null,
          campaignId: intent.campaignId,
          actionType,
          templateId: action?.templateId || null,
          configuration: action?.configuration || {},
        };

    const template = resolvedAction.templateId
      ? findTemplate(resolvedAction.templateId)
      : null;

    let outcome;
    try {
      outcome = executor.execute({
        intent,
        campaign,
        action: resolvedAction,
        template,
      });
    } catch (err) {
      outcome = {
        ok: false,
        status: EXECUTION_RESULT_STATUS.FAILED,
        referenceId: null,
        error: err?.message || 'خطای داخلی Executor.',
        payload: null,
      };
    }

    const result = normalizeExecutionResult({
      executionIntentId: intent.id,
      campaignId: intent.campaignId,
      actionType,
      status: outcome?.status || EXECUTION_RESULT_STATUS.FAILED,
      referenceId: outcome?.referenceId || null,
      error: outcome?.error || null,
      payload: outcome?.payload || null,
    });

    const saved = results.save(result);
    markConsumed(intent);

    return {
      ok: Boolean(outcome?.ok) && saved?.status === EXECUTION_RESULT_STATUS.SUCCESS,
      result: saved,
      taskCreationIntent: outcome?.payload?.taskCreationIntent || null,
      error: saved?.error || undefined,
    };
  }

  function markConsumed(intent) {
    if (!saveExecutionIntent || !intent?.id) return;
    saveExecutionIntent({
      ...intent,
      status: EXECUTION_INTENT_STATUS.CONSUMED,
    });
  }

  return {
    execute,
    getRegistry: () => registry,
    listResults: (campaignId) => (
      campaignId ? results.findByCampaignId(campaignId) : results.findAll()
    ),
  };
}
