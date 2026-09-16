/**
 * ChannelExecutor contract — pluggable providers, no real sends.
 */

import { createEntityId, ENTITY_ID_PREFIX } from '../../../domain/identity';

export const CHANNEL_EXECUTION_STATUS = Object.freeze({
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  SKIPPED: 'SKIPPED',
  MOCKED: 'MOCKED',
});

export const CHANNEL_ATTEMPT_STATUS = Object.freeze({
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
});

/**
 * @typedef {object} ChannelExecutionRequest
 * @property {string} campaignId
 * @property {number|null} templateVersion
 * @property {object|null} audienceSnapshot
 * @property {Record<string, string>} variables
 * @property {object} metadata
 * @property {string} [channelType]
 * @property {string} [templateId]
 * @property {string} [actionType]
 * @property {string} [executionIntentId]
 */

/**
 * @typedef {object} ChannelExecutionResult
 * @property {string} status
 * @property {string|null} externalReference
 * @property {string|null} error
 * @property {string} [channelType]
 * @property {boolean} [mocked]
 */

/**
 * @param {object} [input]
 * @returns {ChannelExecutionRequest}
 */
export function normalizeChannelExecutionRequest(input = {}) {
  return {
    campaignId: String(input.campaignId || ''),
    templateVersion: input.templateVersion != null && Number.isFinite(Number(input.templateVersion))
      ? Math.floor(Number(input.templateVersion))
      : null,
    audienceSnapshot: input.audienceSnapshot && typeof input.audienceSnapshot === 'object'
      ? { ...input.audienceSnapshot }
      : null,
    variables: input.variables && typeof input.variables === 'object'
      ? { ...input.variables }
      : {},
    metadata: input.metadata && typeof input.metadata === 'object'
      ? { ...input.metadata }
      : {},
    channelType: input.channelType != null ? String(input.channelType).toUpperCase() : null,
    templateId: input.templateId != null ? String(input.templateId) : null,
    actionType: input.actionType != null ? String(input.actionType).toUpperCase() : null,
    executionIntentId: input.executionIntentId != null ? String(input.executionIntentId) : null,
  };
}

/**
 * @param {object} [input]
 * @returns {ChannelExecutionResult}
 */
export function normalizeChannelExecutionResult(input = {}) {
  const statusRaw = String(input.status || CHANNEL_EXECUTION_STATUS.FAILED).toUpperCase();
  const status = CHANNEL_EXECUTION_STATUS[statusRaw] || CHANNEL_EXECUTION_STATUS.FAILED;
  return {
    status,
    externalReference: input.externalReference != null && input.externalReference !== ''
      ? String(input.externalReference)
      : null,
    error: input.error != null && String(input.error).trim()
      ? String(input.error).trim()
      : null,
    channelType: input.channelType != null ? String(input.channelType).toUpperCase() : null,
    mocked: Boolean(input.mocked),
  };
}

/**
 * @typedef {object} ChannelExecutor
 * @property {string} channelType
 * @property {(request: ChannelExecutionRequest) => ChannelExecutionResult} execute
 */

/**
 * Mock executor factory — records a fake reference, never contacts providers.
 * @param {string} channelType
 * @returns {ChannelExecutor}
 */
export function createMockChannelExecutor(channelType) {
  const type = String(channelType || '').toUpperCase();
  return {
    channelType: type,
    execute(request) {
      const req = normalizeChannelExecutionRequest(request);
      if (!req.campaignId) {
        return normalizeChannelExecutionResult({
          status: CHANNEL_EXECUTION_STATUS.FAILED,
          externalReference: null,
          error: 'campaignId الزامی است.',
          channelType: type,
          mocked: true,
        });
      }
      const externalReference = createEntityId(
        ENTITY_ID_PREFIX.CAMPAIGN,
        `mock-${type.toLowerCase()}`,
      );
      return normalizeChannelExecutionResult({
        status: CHANNEL_EXECUTION_STATUS.MOCKED,
        externalReference,
        error: null,
        channelType: type,
        mocked: true,
      });
    },
  };
}
