/**
 * CampaignExecutor runtime adapter — Pooyesh + Channel mock adapters.
 */

import { createCampaignExecutor } from '../domain/campaignExecutor';
import { createDefaultExecutorRegistry } from '../domain/executorRegistry';
import { createDefaultChannelExecutorRegistry } from '../domain/channelExecutorRegistry';
import { repositoryFindById } from '../repositories/campaignRepository';
import { templateRepositoryFindById } from '../repositories/templateRepository';
import {
  intentRepositoryFindAll,
  intentRepositoryFindByCampaignId,
  intentRepositorySave,
} from '../repositories/executionIntentRepository';
import {
  createExecutionResultRepository,
  executionResultRepositoryReset,
} from '../repositories/executionResultRepository';
import {
  createChannelExecutionRepository,
  channelExecutionReset,
  channelExecutionListByCampaign,
} from '../repositories/channelExecutionRepository';
import {
  createPooyeshTaskPortAdapter,
  __resetPooyeshTaskPortForTests,
} from './pooyeshTaskPort.adapter';
import { useMowjStore } from '../store/useMowjStore';

let defaultExecutor = null;
let defaultPooyeshPort = null;
let defaultChannelRegistry = null;
let defaultChannelRepo = null;

function getPooyeshPort() {
  if (!defaultPooyeshPort) defaultPooyeshPort = createPooyeshTaskPortAdapter();
  return defaultPooyeshPort;
}

function getChannelRegistry() {
  if (!defaultChannelRegistry) {
    defaultChannelRegistry = createDefaultChannelExecutorRegistry();
  }
  return defaultChannelRegistry;
}

function getChannelRepo() {
  if (!defaultChannelRepo) {
    defaultChannelRepo = createChannelExecutionRepository();
  }
  return defaultChannelRepo;
}

function createPorts() {
  const results = createExecutionResultRepository();
  return {
    findCampaign: (id) => repositoryFindById(id),
    findTemplate: (id) => templateRepositoryFindById(id),
    findExecutionIntent: (id) => (
      intentRepositoryFindAll().find((item) => String(item.id) === String(id)) || null
    ),
    saveExecutionIntent: (intent) => {
      const saved = intentRepositorySave(intent);
      if (saved) useMowjStore.getState().bump();
      return saved;
    },
    results: {
      save: (result) => {
        const saved = results.save(result);
        if (saved) useMowjStore.getState().bump();
        return saved;
      },
      findById: results.findById,
      findByCampaignId: results.findByCampaignId,
      findByIntentId: results.findByIntentId,
      findAll: results.findAll,
    },
  };
}

function buildRegistry() {
  return createDefaultExecutorRegistry({
    pooyeshTaskPort: getPooyeshPort(),
    channelRegistry: getChannelRegistry(),
    channelRepository: getChannelRepo(),
  });
}

export function getDefaultCampaignExecutor() {
  if (!defaultExecutor) {
    defaultExecutor = createCampaignExecutor(createPorts(), buildRegistry());
  }
  return defaultExecutor;
}

export function getDefaultChannelExecutorRegistry() {
  return getChannelRegistry();
}

export function listChannelExecutionsForCampaign(campaignId) {
  return channelExecutionListByCampaign(campaignId);
}

/** @param {ReturnType<typeof createCampaignExecutor>|null} executor */
export function __setDefaultCampaignExecutorForTests(executor) {
  defaultExecutor = executor;
}

export function __resetExecutorRuntimeForTests() {
  executionResultRepositoryReset();
  channelExecutionReset();
  __resetPooyeshTaskPortForTests();
  defaultPooyeshPort = createPooyeshTaskPortAdapter();
  defaultChannelRegistry = createDefaultChannelExecutorRegistry();
  defaultChannelRepo = createChannelExecutionRepository();
  defaultExecutor = createCampaignExecutor(createPorts(), buildRegistry());
  useMowjStore.getState().bump();
}

export function listExecutionIntentsForCampaign(campaignId) {
  return intentRepositoryFindByCampaignId(campaignId);
}

export function listExecutionResultsForCampaign(campaignId) {
  return createExecutionResultRepository().findByCampaignId(campaignId);
}
