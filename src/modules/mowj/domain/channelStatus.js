/**
 * Campaign channel readiness for Detail UI — no send button.
 */

import { getExecutionChannel, getExecutionChannelLabel } from './channel.catalog';
import { getCompatibleTemplateType } from './action.rules';
import { assertTemplateChannelCompatibility } from './channelTemplateCompatibility';
import { createDefaultChannelExecutorRegistry } from './channelExecutorRegistry';

export const CAMPAIGN_CHANNEL_STATUS = Object.freeze({
  NOT_CONFIGURED: 'NOT_CONFIGURED',
  READY: 'READY',
  EXECUTED: 'EXECUTED',
});

export const CAMPAIGN_CHANNEL_STATUS_LABELS = Object.freeze({
  NOT_CONFIGURED: 'پیکربندی نشده',
  READY: 'آماده',
  EXECUTED: 'اجراشده',
});

/**
 * @param {object} campaign  presentation or domain
 * @param {{
 *   channelResults?: object[],
 *   channelRegistry?: ReturnType<typeof createDefaultChannelExecutorRegistry>,
 * }} [options]
 */
export function getCampaignChannelStatus(campaign, options = {}) {
  const channelId = campaign?.executionChannelId || null;
  const channel = channelId ? getExecutionChannel(channelId) : null;
  const channelLabel = getExecutionChannelLabel(channelId);
  const results = Array.isArray(options.channelResults) ? options.channelResults : [];
  const executed = results.some((row) => (
    row.status === 'MOCKED' || row.status === 'SUCCESS'
  ));

  if (!channelId) {
    return {
      channelId: null,
      channelLabel: '—',
      status: CAMPAIGN_CHANNEL_STATUS.NOT_CONFIGURED,
      statusLabel: CAMPAIGN_CHANNEL_STATUS_LABELS.NOT_CONFIGURED,
      compatible: false,
      executorRegistered: false,
      integrationReady: false,
    };
  }

  const registry = options.channelRegistry || createDefaultChannelExecutorRegistry();
  const resolved = registry.resolve(channelId);
  const tplType = campaign?.actionView?.templateType
    || campaign?.action?.templateType
    || getCompatibleTemplateType(campaign?.action?.actionType);

  let compatible = true;
  if (tplType) {
    compatible = assertTemplateChannelCompatibility(tplType, channelId).ok;
  }

  const status = executed
    ? CAMPAIGN_CHANNEL_STATUS.EXECUTED
    : (resolved.ok && compatible
      ? CAMPAIGN_CHANNEL_STATUS.READY
      : CAMPAIGN_CHANNEL_STATUS.NOT_CONFIGURED);

  return {
    channelId,
    channelLabel,
    channelCategory: channel?.category || null,
    status,
    statusLabel: CAMPAIGN_CHANNEL_STATUS_LABELS[status],
    compatible,
    executorRegistered: resolved.ok,
    integrationReady: false,
  };
}
