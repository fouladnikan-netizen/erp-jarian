/**
 * Action executors backed by ChannelExecutorRegistry (mock only — no provider send).
 */

import { CAMPAIGN_ACTION_TYPE, getCompatibleTemplateType } from '../action.rules';
import {
  normalizeChannelExecutionRequest,
  CHANNEL_EXECUTION_STATUS,
} from '../channelExecutor.contract';
import { assertTemplateChannelCompatibility } from '../channelTemplateCompatibility';
import { createDefaultChannelExecutorRegistry } from '../channelExecutorRegistry';
import { EXECUTION_RESULT_STATUS } from '../executionResult.types';
import { createEmptyChannelExecutionRepository } from '../channelExecution.ports';

/**
 * @param {{
 *   actionType: string,
 *   channelRegistry?: ReturnType<typeof createDefaultChannelExecutorRegistry>,
 *   channelRepository?: import('../channelExecution.ports').ChannelExecutionRepository,
 * }} options
 * @returns {import('../executor.ports').ActionExecutor}
 */
export function createChannelBackedActionExecutor(options) {
  const actionType = String(options.actionType || '').toUpperCase();
  const channelRegistry = options.channelRegistry || createDefaultChannelExecutorRegistry();
  const channelRepository = options.channelRepository || createEmptyChannelExecutionRepository();

  return {
    actionType,

    /**
     * @param {import('../executor.ports').ExecutorContext} ctx
     */
    execute(ctx) {
      const intent = ctx?.intent;
      const campaign = ctx?.campaign;
      const template = ctx?.template;
      const action = ctx?.action;

      if (!intent) {
        return fail('CampaignExecutionIntent الزامی است.');
      }

      const channelType = String(
        campaign?.executionChannelId || action?.configuration?.channelHint || '',
      ).toUpperCase();

      if (!channelType) {
        return fail('کانال کمپین پیکربندی نشده است.');
      }

      const resolved = channelRegistry.resolve(channelType);
      if (!resolved.ok) {
        return fail(resolved.error || `کانال ${channelType} پشتیبانی نمی‌شود.`);
      }

      const templateType = template?.type || getCompatibleTemplateType(actionType);
      if (templateType) {
        const compat = assertTemplateChannelCompatibility(templateType, channelType);
        if (!compat.ok) {
          return fail(compat.error);
        }
      }

      const request = normalizeChannelExecutionRequest({
        campaignId: intent.campaignId,
        templateVersion: action?.templateVersion ?? template?.version ?? null,
        audienceSnapshot: intent.audienceReference
          ? { members: [intent.audienceReference] }
          : null,
        variables: {
          ...(ctx.contextVars || {}),
        },
        metadata: {
          actionType,
          templateId: action?.templateId || template?.id || null,
          mocked: true,
          provider: null,
        },
        channelType,
        templateId: action?.templateId || template?.id || null,
        actionType,
        executionIntentId: intent.id,
      });

      const attempt = channelRepository.saveAttempt({
        id: null,
        campaignId: intent.campaignId,
        executionIntentId: intent.id,
        channelType,
        request,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      });

      let channelResult;
      try {
        channelResult = resolved.executor.execute(request);
      } catch (err) {
        channelResult = {
          status: CHANNEL_EXECUTION_STATUS.FAILED,
          externalReference: null,
          error: err?.message || 'خطای ChannelExecutor',
          channelType,
          mocked: true,
        };
      }

      channelRepository.saveResult({
        attemptId: attempt?.id || null,
        campaignId: intent.campaignId,
        executionIntentId: intent.id,
        channelType,
        ...channelResult,
        createdAt: new Date().toISOString(),
      });

      const ok = channelResult.status === CHANNEL_EXECUTION_STATUS.SUCCESS
        || channelResult.status === CHANNEL_EXECUTION_STATUS.MOCKED;

      return {
        ok,
        status: ok ? EXECUTION_RESULT_STATUS.SUCCESS : EXECUTION_RESULT_STATUS.FAILED,
        referenceId: channelResult.externalReference || null,
        error: channelResult.error || null,
        payload: {
          kind: 'channel.execute',
          channelType,
          channelResult,
          attemptId: attempt?.id || null,
          mocked: true,
        },
      };
    },
  };
}

function fail(error) {
  return {
    ok: false,
    status: EXECUTION_RESULT_STATUS.FAILED,
    referenceId: null,
    error,
    payload: null,
  };
}

export function createBroadcastMessageChannelExecutor(deps = {}) {
  return createChannelBackedActionExecutor({
    actionType: CAMPAIGN_ACTION_TYPE.BROADCAST_MESSAGE,
    ...deps,
  });
}

export function createSurveyRequestChannelExecutor(deps = {}) {
  return createChannelBackedActionExecutor({
    actionType: CAMPAIGN_ACTION_TYPE.SURVEY_REQUEST,
    ...deps,
  });
}

export function createPhysicalDeliveryChannelExecutor(deps = {}) {
  return createChannelBackedActionExecutor({
    actionType: CAMPAIGN_ACTION_TYPE.PHYSICAL_DELIVERY,
    ...deps,
  });
}
