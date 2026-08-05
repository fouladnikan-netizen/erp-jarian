/**
 * ActionType → Executor registry.
 * CREATE_TASK → Pooyesh; channel actions → ChannelExecutorRegistry (mock).
 */

import { CAMPAIGN_ACTION_TYPE } from './action.rules';
import { createPooyeshTaskExecutor } from './executors/pooyeshTaskExecutor';
import {
  createBroadcastMessageChannelExecutor,
  createSurveyRequestChannelExecutor,
  createPhysicalDeliveryChannelExecutor,
} from './executors/channelBackedActionExecutor';
import { createEmptyPooyeshTaskPort } from './pooyeshTask.port';
import { createDefaultChannelExecutorRegistry } from './channelExecutorRegistry';
import { createEmptyChannelExecutionRepository } from './channelExecution.ports';

/**
 * @param {{
 *   pooyeshTaskPort?: import('./pooyeshTask.port').PooyeshTaskPort,
 *   channelRegistry?: ReturnType<typeof createDefaultChannelExecutorRegistry>,
 *   channelRepository?: import('./channelExecution.ports').ChannelExecutionRepository,
 * }} [options]
 */
export function createDefaultExecutorRegistry(options = {}) {
  const pooyeshTaskPort = options.pooyeshTaskPort || createEmptyPooyeshTaskPort();
  const channelRegistry = options.channelRegistry || createDefaultChannelExecutorRegistry();
  const channelRepository = options.channelRepository || createEmptyChannelExecutionRepository();
  const channelDeps = { channelRegistry, channelRepository };

  return Object.freeze({
    [CAMPAIGN_ACTION_TYPE.CREATE_TASK]: createPooyeshTaskExecutor({ pooyeshTaskPort }),
    [CAMPAIGN_ACTION_TYPE.BROADCAST_MESSAGE]: createBroadcastMessageChannelExecutor(channelDeps),
    [CAMPAIGN_ACTION_TYPE.SURVEY_REQUEST]: createSurveyRequestChannelExecutor(channelDeps),
    [CAMPAIGN_ACTION_TYPE.PHYSICAL_DELIVERY]: createPhysicalDeliveryChannelExecutor(channelDeps),
  });
}

/**
 * @param {Record<string, import('./executor.ports').ActionExecutor>} [overrides]
 * @param {Parameters<typeof createDefaultExecutorRegistry>[0]} [options]
 */
export function createExecutorRegistry(overrides = {}, options = {}) {
  return Object.freeze({
    ...createDefaultExecutorRegistry(options),
    ...overrides,
  });
}

/**
 * @param {Record<string, import('./executor.ports').ActionExecutor>} registry
 * @param {string} actionType
 * @returns {import('./executor.ports').ActionExecutor|null}
 */
export function selectExecutor(registry, actionType) {
  const key = String(actionType || '').toUpperCase();
  if (!key || !registry || typeof registry !== 'object') return null;
  return registry[key] || null;
}
