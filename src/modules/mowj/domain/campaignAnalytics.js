/**
 * Campaign analytics engine — attribute ERP events to campaigns.
 */

import { validateMowjDomainEvent } from './events.contracts';
import {
  normalizeCampaignAttribution,
  validateCampaignAttribution,
} from './attribution.types';
import { resolveAttributionEntityFromEvent } from './attribution.mapping';
import { createEmptyCampaignAnalyticsRepository } from './campaignAnalytics.ports';
import { calculateCampaignKpiSummary } from './campaignKpiCalculator';

/**
 * @param {import('./campaignAnalytics.ports').CampaignAnalyticsRepository} [repository]
 */
export function createCampaignAnalyticsService(repository = createEmptyCampaignAnalyticsRepository()) {
  const repo = {
    addAttribution: typeof repository.addAttribution === 'function'
      ? repository.addAttribution
      : () => null,
    getCampaignResults: typeof repository.getCampaignResults === 'function'
      ? repository.getCampaignResults
      : () => [],
    getKpiSummary: typeof repository.getKpiSummary === 'function'
      ? repository.getKpiSummary
      : (campaignId, options) => calculateCampaignKpiSummary([], options),
  };

  /**
   * Record attribution: Campaign → Event → Entity.
   * @param {string} campaignId
   * @param {object} event
   * @returns {{ ok: boolean, attribution?: object|null, error?: string, duplicate?: boolean }}
   */
  function attributeEvent(campaignId, event) {
    const id = String(campaignId || '').trim();
    if (!id) return { ok: false, attribution: null, error: 'campaignId الزامی است.' };

    const eventCheck = validateMowjDomainEvent(event);
    if (!eventCheck.ok) {
      return { ok: false, attribution: null, error: eventCheck.errors.join(' ') };
    }

    const entity = resolveAttributionEntityFromEvent(event);
    if (!entity) {
      return {
        ok: false,
        attribution: null,
        error: `رویداد ${event.type} موجودیت قابل attribution ندارد.`,
      };
    }

    // Idempotent: same campaign + entity + event type
    const existing = repo.getCampaignResults(id).find((row) => (
      row.entityType === entity.entityType
      && String(row.entityId) === String(entity.entityId)
      && String(row.eventType) === String(event.type)
    ));
    if (existing) {
      return { ok: true, attribution: existing, duplicate: true };
    }

    const attribution = normalizeCampaignAttribution({
      campaignId: id,
      entityType: entity.entityType,
      entityId: entity.entityId,
      eventType: event.type,
      createdAt: event.occurredAt || new Date().toISOString(),
    });
    const check = validateCampaignAttribution(attribution);
    if (!check.ok || !attribution) {
      return { ok: false, attribution: null, error: (check.errors || []).join(' ') };
    }

    const saved = repo.addAttribution(attribution);
    return { ok: Boolean(saved), attribution: saved };
  }

  function getCampaignResults(campaignId) {
    return repo.getCampaignResults(String(campaignId || ''));
  }

  function getKpiSummary(campaignId, options = {}) {
    return repo.getKpiSummary(String(campaignId || ''), options);
  }

  return {
    attributeEvent,
    getCampaignResults,
    getKpiSummary,
  };
}
