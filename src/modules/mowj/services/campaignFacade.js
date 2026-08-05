/**
 * Mowj Campaign Facade — UI talks only to this module.
 */

import { useMemo } from 'react';
import {
  AUDIENCE_SEGMENT_STATUS,
  AUDIENCE_SEGMENT_STATUS_LABELS,
  AUDIENCE_SOURCE_TYPE_LABELS,
  CAMPAIGN_ACTION_TYPE_LABELS,
  CAMPAIGN_PURPOSE_LABELS,
  CAMPAIGN_STATUS,
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_TYPE_LABELS,
  DASHBOARD_RANK_METRIC,
  DASHBOARD_RANK_METRIC_LABELS,
  EXECUTION_STATUS_LABELS,
  TEMPLATE_STATUS,
  TEMPLATE_TYPE_LABELS,
  TEMPLATE_STATUS_LABELS,
  assertCampaignTransition,
  createCampaignDraft,
  formatActionConfigurationSummary,
  formatAudienceRule,
  formatKpiDefinition,
  formatTriggerPresentation,
  getCompatibleTemplateType,
  getExecutionChannelLabel,
  getCampaignAutomationStatus,
  getCampaignChannelStatus,
  normalizeCampaign,
  EXECUTOR_PIPELINE_STATUS_LABELS,
  resolveExecutorPipelineStatus,
} from '../domain';
import { getDefaultAudienceResolver } from '../adapters/audienceResolver.runtime';
import {
  __resetAnalyticsRuntimeForTests,
  getDefaultCampaignAnalyticsService,
} from '../adapters/campaignAnalytics.runtime';
import {
  getDefaultCampaignDashboardService,
  __resetCampaignDashboardRuntimeForTests,
} from '../adapters/campaignDashboard.runtime';
import {
  __resetAudienceSegmentRuntimeForTests,
  getAudienceSegment,
  listAudienceSegments,
  previewAudienceSegment,
  saveAudienceSegment,
} from '../adapters/audienceSegment.runtime';
import {
  __resetAutomationRuntimeForTests,
  getDefaultAutomationEngine,
} from '../adapters/campaignAutomation.runtime';
import {
  __resetExecutorRuntimeForTests,
  getDefaultCampaignExecutor,
  getDefaultChannelExecutorRegistry,
  listChannelExecutionsForCampaign,
  listExecutionIntentsForCampaign,
  listExecutionResultsForCampaign,
} from '../adapters/campaignExecutor.runtime';
import {
  formatAudienceSegmentSummary,
  segmentToAudienceDefinition,
} from '../domain/audienceSegment.types';
import {
  repositoryFindAll,
  repositoryFindById,
  repositoryResetToSeed,
  repositorySave,
} from '../repositories/campaignRepository';
import {
  templateRepositoryFindAll,
  templateRepositoryFindById,
  templateRepositoryFindByType,
  templateRepositoryResetToSeed,
  templateRepositorySave,
  templateRepositoryCreateVersion,
  templateRepositoryListVersions,
  templateRepositoryGetVersion,
  templateRepositoryDelete,
} from '../repositories/templateRepository';
import {
  audienceRepositoryDeleteSegment,
} from '../repositories/audienceSegmentRepository';
import { useMowjStore } from '../store/useMowjStore';
import {
  __executionTesting,
  listCampaignExecutions,
  prepareCampaignExecution,
} from './executionFacade';

function bump() {
  useMowjStore.getState().bump();
}

function toAudiencePresentation(audience) {
  if (!audience) {
    return {
      source: '—',
      rule: '—',
      estimatedCount: 0,
      name: '—',
      sourceType: null,
    };
  }
  const estimatedCount = getDefaultAudienceResolver().estimateCount(audience);
  return {
    name: audience.name || '—',
    sourceType: audience.sourceType || audience.source,
    source: AUDIENCE_SOURCE_TYPE_LABELS[audience.sourceType || audience.source]
      || audience.sourceType
      || audience.source
      || '—',
    targetLevel: audience.targetLevel || null,
    baseSelection: audience.baseSelection || null,
    rules: Array.isArray(audience.rules) ? audience.rules : [],
    groups: Array.isArray(audience.groups) ? audience.groups : [],
    rule: formatAudienceRule(audience),
    estimatedCount,
  };
}

function toActionPresentation(action) {
  if (!action) {
    return {
      actionType: null,
      actionTypeLabel: '—',
      templateId: null,
      templateName: '—',
      templateVersion: null,
      templateTypeLabel: '—',
      configurationSummary: '—',
      configuration: {},
    };
  }
  const template = action.templateId
    ? templateRepositoryFindById(action.templateId)
    : null;
  const pinnedVersion = action.templateVersion != null
    ? templateRepositoryGetVersion(action.templateId, action.templateVersion)
    : null;
  const expectedType = getCompatibleTemplateType(action.actionType);
  const versionNumber = action.templateVersion != null
    ? action.templateVersion
    : (template?.version ?? null);
  return {
    actionType: action.actionType,
    actionTypeLabel: CAMPAIGN_ACTION_TYPE_LABELS[action.actionType] || action.actionType,
    templateId: action.templateId,
    templateName: pinnedVersion?.name || template?.name || '—',
    templateVersion: versionNumber,
    templateType: pinnedVersion?.type || template?.type || expectedType,
    templateTypeLabel: TEMPLATE_TYPE_LABELS[pinnedVersion?.type || template?.type || expectedType] || '—',
    configuration: action.configuration || {},
    configurationSummary: formatActionConfigurationSummary(action),
  };
}

function toListPresentation(campaign) {
  const audienceView = toAudiencePresentation(campaign.audience);
  const triggerView = formatTriggerPresentation(campaign.triggerRule);
  const actionView = toActionPresentation(campaign.action);
  const segment = campaign.audienceSegmentId
    ? getAudienceSegment(campaign.audienceSegmentId)
    : null;
  return {
    id: campaign.id,
    name: campaign.name,
    description: campaign.description,
    purpose: campaign.purpose,
    purposeLabel: CAMPAIGN_PURPOSE_LABELS[campaign.purpose] || campaign.purpose,
    campaignType: campaign.campaignType,
    campaignTypeLabel: CAMPAIGN_TYPE_LABELS[campaign.campaignType] || campaign.campaignType,
    executionChannelId: campaign.executionChannelId,
    channelLabel: getExecutionChannelLabel(campaign.executionChannelId),
    status: campaign.status,
    statusLabel: CAMPAIGN_STATUS_LABELS[campaign.status] || campaign.status,
    owner: campaign.owner,
    startDate: campaign.startDate,
    endDate: campaign.endDate,
    triggerRule: campaign.triggerRule,
    triggerLabel: campaign.triggerRule?.label || '—',
    triggerView,
    kpiDefinition: campaign.kpiDefinition,
    kpiLabel: formatKpiDefinition(campaign.kpiDefinition),
    surveyFormId: campaign.surveyFormId,
    audienceSegmentId: campaign.audienceSegmentId || null,
    audienceSegmentName: segment?.name || null,
    audienceSegmentSummary: segment ? formatAudienceSegmentSummary(segment) : null,
    audience: campaign.audience,
    audienceView,
    audienceLabel: segment?.name
      || (audienceView.name !== '—'
        ? `${audienceView.name} (${audienceView.estimatedCount.toLocaleString('fa-IR')})`
        : 'مخاطب تعریف‌نشده'),
    action: campaign.action,
    actionView,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
  };
}

export function listTemplates(filters = {}) {
  let rows = templateRepositoryFindAll();
  if (filters.type) {
    rows = templateRepositoryFindByType(filters.type);
  }
  if (filters.status) {
    rows = rows.filter((row) => row.status === filters.status);
  } else if (filters.selectableOnly) {
    rows = rows.filter((row) => row.status !== TEMPLATE_STATUS.ARCHIVED);
  }
  const q = String(filters.query || '').trim().toLowerCase();
  if (q) {
    rows = rows.filter((row) => (
      `${row.name} ${row.type}`.toLowerCase().includes(q)
    ));
  }
  return rows.map(toTemplatePresentation);
}

function toTemplatePresentation(tpl) {
  return {
    id: tpl.id,
    name: tpl.name,
    type: tpl.type,
    typeLabel: TEMPLATE_TYPE_LABELS[tpl.type] || tpl.type,
    status: tpl.status,
    statusLabel: TEMPLATE_STATUS_LABELS[tpl.status] || tpl.status,
    version: tpl.version,
    content: tpl.content,
    variables: tpl.variables,
    createdBy: tpl.createdBy,
    createdAt: tpl.createdAt,
    updatedAt: tpl.updatedAt,
  };
}

export function getTemplate(id) {
  const tpl = templateRepositoryFindById(id);
  if (!tpl) return null;
  return {
    ...toTemplatePresentation(tpl),
    versions: templateRepositoryListVersions(id),
  };
}

export function saveTemplate(payload) {
  const saved = templateRepositorySave(payload);
  if (!saved) return null;
  bump();
  return toTemplatePresentation(saved);
}

export function createTemplateVersion(templateId, nextContent = null) {
  const result = templateRepositoryCreateVersion(templateId, nextContent);
  if (!result) return null;
  bump();
  return {
    template: toTemplatePresentation(result.template),
    version: result.version,
    history: result.history,
  };
}

export function listTemplateVersions(templateId) {
  return templateRepositoryListVersions(templateId);
}

function findCampaignsUsingTemplate(templateId) {
  const id = String(templateId || '');
  if (!id) return [];
  return repositoryFindAll().filter((campaign) => (
    String(campaign.action?.templateId || '') === id
  ));
}

function findCampaignsUsingSegment(segmentId) {
  const id = String(segmentId || '');
  if (!id) return [];
  return repositoryFindAll().filter((campaign) => (
    String(campaign.audienceSegmentId || '') === id
  ));
}

/**
 * Soft-archive or hard-delete a template based on campaign usage.
 * @returns {{ ok: boolean, mode?: 'deleted'|'archived', error?: string, campaigns?: object[] }}
 */
export function removeTemplateAsset(templateId) {
  const tpl = templateRepositoryFindById(templateId);
  if (!tpl) return { ok: false, error: 'قالب یافت نشد.' };
  const used = findCampaignsUsingTemplate(templateId);
  if (used.length) {
    const archived = templateRepositorySave({
      ...tpl,
      status: TEMPLATE_STATUS.ARCHIVED,
    });
    if (!archived) return { ok: false, error: 'بایگانی قالب ناموفق بود.' };
    bump();
    return {
      ok: true,
      mode: 'archived',
      error: 'این مورد در کمپین‌های فعال استفاده شده و قابل حذف نیست.',
      campaigns: used.map((c) => ({ id: c.id, name: c.name })),
    };
  }
  const deleted = templateRepositoryDelete(templateId);
  if (!deleted) return { ok: false, error: 'حذف قالب ناموفق بود.' };
  bump();
  return { ok: true, mode: 'deleted' };
}

export function archiveTemplate(templateId) {
  const tpl = templateRepositoryFindById(templateId);
  if (!tpl) return null;
  const saved = templateRepositorySave({ ...tpl, status: TEMPLATE_STATUS.ARCHIVED });
  if (saved) bump();
  return saved ? toTemplatePresentation(saved) : null;
}

export function listCampaigns(filters = {}) {
  let rows = repositoryFindAll().map(toListPresentation);
  const q = String(filters.query || '').trim().toLowerCase();
  if (q) {
    rows = rows.filter((row) => (
      `${row.name} ${row.purposeLabel} ${row.campaignTypeLabel} ${row.channelLabel} ${row.statusLabel}`
        .toLowerCase()
        .includes(q)
    ));
  }
  if (filters.purpose) {
    rows = rows.filter((row) => row.purpose === filters.purpose);
  }
  if (filters.status) {
    rows = rows.filter((row) => row.status === filters.status);
  }
  return rows;
}

export function getCampaign(id) {
  const row = repositoryFindById(id);
  return row ? toListPresentation(row) : null;
}

/**
 * Detail aggregate for Campaign Detail page.
 */
export function getCampaignDetail(id) {
  const campaign = getCampaign(id);
  if (!campaign) return null;
  const executions = listCampaignExecutions(id);
  const channelResults = listChannelExecutionsForCampaign(id);
  return {
    campaign,
    executions,
    audience: campaign.audienceView,
    trigger: campaign.triggerView,
    action: campaign.actionView,
    automation: getCampaignAutomationStatus(campaign),
    channel: getCampaignChannelStatus(campaign, {
      channelResults,
      channelRegistry: getDefaultChannelExecutorRegistry(),
    }),
    channelExecutions: channelResults,
    executorHistory: listExecutorHistory(id),
    results: getCampaignResultsPresentation(id, campaign),
    canPrepareExecution: (
      campaign.status === CAMPAIGN_STATUS.DRAFT
      || campaign.status === CAMPAIGN_STATUS.READY
      || campaign.status === CAMPAIGN_STATUS.PAUSED
    ),
  };
}

/**
 * Real attribution-backed campaign results for UI — never invents metrics.
 * @param {string} campaignId
 * @param {object} [campaign]
 */
export function getCampaignResultsPresentation(campaignId, campaign = null) {
  const row = campaign || getCampaign(campaignId);
  const analytics = getDefaultCampaignAnalyticsService();
  const attributions = analytics.getCampaignResults(campaignId);

  const latestTarget = listCampaignExecutions(campaignId)
    .map((run) => run.targetCount)
    .find((n) => n != null && Number.isFinite(Number(n)));
  const estimated = row?.audienceView?.estimatedCount;
  const targetContacts = latestTarget != null
    ? Number(latestTarget)
    : (estimated != null && Number(estimated) > 0 ? Number(estimated) : null);

  const summary = analytics.getKpiSummary(campaignId, {
    purpose: row?.purpose,
    targetContacts,
  });

  return {
    hasData: summary.hasData,
    purpose: summary.purpose,
    targetContacts: summary.targetContacts,
    leadsGenerated: summary.leadsGenerated,
    opportunitiesCreated: summary.opportunitiesCreated,
    ordersGenerated: summary.ordersGenerated,
    surveyResponses: summary.surveyResponses,
    completedFollowUps: summary.completedFollowUps,
    repeatOrders: summary.repeatOrders,
    customerActivities: summary.customerActivities,
    attributionCount: summary.attributionCount,
    metrics: summary.metrics,
    attributions,
  };
}

/**
 * Attribute an ERP domain event to a campaign (foundation only).
 * @param {string} campaignId
 * @param {object} event
 */
export function attributeCampaignEvent(campaignId, event) {
  return getDefaultCampaignAnalyticsService().attributeEvent(campaignId, event);
}

/**
 * Intent → result pipeline rows for Campaign Detail (read-only).
 * @param {string} campaignId
 */
export function listExecutorHistory(campaignId) {
  const intents = listExecutionIntentsForCampaign(campaignId);
  const results = listExecutionResultsForCampaign(campaignId);
  const byIntent = new Map(results.map((row) => [String(row.executionIntentId), row]));

  return intents.map((intent) => {
    const result = byIntent.get(String(intent.id)) || null;
    const pipelineStatus = resolveExecutorPipelineStatus(intent, result);
    const assignedTo = result?.payload?.assignedTo
      || result?.payload?.taskCreationResult?.assignedTo
      || result?.payload?.taskCreationIntent?.assignedTo
      || null;
    const taskId = result?.payload?.taskId || result?.referenceId || null;
    return {
      id: intent.id,
      intentId: intent.id,
      actionType: intent.actionType,
      actionTypeLabel: CAMPAIGN_ACTION_TYPE_LABELS[intent.actionType] || intent.actionType,
      triggerEvent: intent.triggerEvent?.type || '—',
      createdAt: intent.createdAt,
      pipelineStatus,
      pipelineStatusLabel: EXECUTOR_PIPELINE_STATUS_LABELS[pipelineStatus] || pipelineStatus,
      resultStatus: result?.status || null,
      referenceId: result?.referenceId || null,
      taskId: intent.actionType === 'CREATE_TASK' ? taskId : null,
      assignedTo,
      assignedToLabel: assignedTo?.name || null,
      pooyeshHref: intent.actionType === 'CREATE_TASK' && taskId
        ? `/pooyesh?taskId=${encodeURIComponent(taskId)}`
        : null,
      error: result?.error || null,
    };
  }).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

/**
 * Evaluate a domain event via automation engine (decision only — no channel send).
 * @param {object} event
 */
export function evaluateCampaignAutomation(event) {
  return getDefaultAutomationEngine().evaluate(event);
}

/**
 * Consume a CampaignExecutionIntent via executor layer (internal actions only).
 * @param {object} intent
 */
export function executeCampaignIntent(intent) {
  return getDefaultCampaignExecutor().execute(intent);
}

/** Resolve AudienceSegment → audience definition (no duplicated filters on campaign). */
function hydrateAudienceFromSegment(payload = {}) {
  const segmentId = payload.audienceSegmentId;
  if (!segmentId) return payload;
  const segment = getAudienceSegment(segmentId);
  if (!segment) return payload;
  const definition = segmentToAudienceDefinition(segment);
  return {
    ...payload,
    audienceSegmentId: segment.id,
    audience: definition,
    _resolvedAudienceFromSegment: definition,
  };
}

/** Pin templateVersion on action from current template when missing. */
function hydrateActionTemplateVersion(payload = {}) {
  if (!payload.action?.templateId) return payload;
  if (payload.action.templateVersion != null) return payload;
  const tpl = templateRepositoryFindById(payload.action.templateId);
  if (!tpl) return payload;
  return {
    ...payload,
    action: {
      ...payload.action,
      templateVersion: tpl.version,
    },
  };
}

export function saveCampaign(payload) {
  const hydrated = hydrateActionTemplateVersion(hydrateAudienceFromSegment(payload));
  const saved = repositorySave(normalizeCampaign(hydrated));
  if (!saved) return null;
  bump();
  return toListPresentation(saved);
}

export function listSegments(filters = {}) {
  let rows = listAudienceSegments();
  const q = String(filters.query || '').trim().toLowerCase();
  if (q) {
    rows = rows.filter((row) => (
      `${row.name} ${row.sourceType} ${row.description || ''}`.toLowerCase().includes(q)
    ));
  }
  if (filters.sourceType) {
    rows = rows.filter((row) => row.sourceType === filters.sourceType);
  }
  if (filters.status) {
    rows = rows.filter((row) => (
      (row.status || AUDIENCE_SEGMENT_STATUS.ACTIVE) === filters.status
    ));
  } else if (filters.selectableOnly !== false) {
    // Campaign picker defaults to selectable (active) segments only.
    rows = rows.filter((row) => (
      (row.status || AUDIENCE_SEGMENT_STATUS.ACTIVE) !== AUDIENCE_SEGMENT_STATUS.ARCHIVED
    ));
  }
  return rows.map((row) => {
    const preview = previewAudienceSegment(row);
    return {
      ...row,
      description: row.description || null,
      status: row.status || AUDIENCE_SEGMENT_STATUS.ACTIVE,
      statusLabel: AUDIENCE_SEGMENT_STATUS_LABELS[row.status || AUDIENCE_SEGMENT_STATUS.ACTIVE]
        || row.status,
      sourceLabel: AUDIENCE_SOURCE_TYPE_LABELS[row.sourceType] || row.sourceType,
      summary: formatAudienceSegmentSummary(row),
      estimatedCount: preview?.ok ? Number(preview.count || 0) : 0,
    };
  });
}

export function getSegment(id) {
  const row = getAudienceSegment(id);
  if (!row) return null;
  const preview = previewAudienceSegment(row);
  return {
    ...row,
    description: row.description || null,
    status: row.status || AUDIENCE_SEGMENT_STATUS.ACTIVE,
    statusLabel: AUDIENCE_SEGMENT_STATUS_LABELS[row.status || AUDIENCE_SEGMENT_STATUS.ACTIVE]
      || row.status,
    sourceLabel: AUDIENCE_SOURCE_TYPE_LABELS[row.sourceType] || row.sourceType,
    summary: formatAudienceSegmentSummary(row),
    estimatedCount: preview?.ok ? Number(preview.count || 0) : 0,
  };
}

export function saveSegment(input) {
  return saveAudienceSegment({
    ...input,
    status: input.status || AUDIENCE_SEGMENT_STATUS.ACTIVE,
  });
}

export function previewSegment(segmentOrId) {
  return previewAudienceSegment(segmentOrId);
}

/**
 * Soft-archive or hard-delete a segment based on campaign usage.
 * @returns {{ ok: boolean, mode?: 'deleted'|'archived', error?: string }}
 */
export function removeSegmentAsset(segmentId) {
  const segment = getAudienceSegment(segmentId);
  if (!segment) return { ok: false, error: 'سگمنت یافت نشد.' };
  const used = findCampaignsUsingSegment(segmentId);
  if (used.length) {
    const archived = saveAudienceSegment({
      ...segment,
      status: AUDIENCE_SEGMENT_STATUS.ARCHIVED,
    });
    if (!archived) return { ok: false, error: 'بایگانی سگمنت ناموفق بود.' };
    bump();
    return {
      ok: true,
      mode: 'archived',
      error: 'این مورد در کمپین‌های فعال استفاده شده و قابل حذف نیست.',
    };
  }
  const deleted = audienceRepositoryDeleteSegment(segmentId);
  if (!deleted) return { ok: false, error: 'حذف سگمنت ناموفق بود.' };
  bump();
  return { ok: true, mode: 'deleted' };
}

export function archiveSegment(segmentId) {
  const segment = getAudienceSegment(segmentId);
  if (!segment) return null;
  const saved = saveAudienceSegment({
    ...segment,
    status: AUDIENCE_SEGMENT_STATUS.ARCHIVED,
  });
  if (saved) bump();
  return saved;
}

export function useAudienceSegmentList(filters = {}) {
  const version = useMowjStore((s) => s.version);
  return useMemo(
    () => listSegments(filters),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version, filters.query, filters.sourceType],
  );
}

/** Create campaign and leave in READY (prepared for execution foundation). */
export function createAndActivateCampaign(draftInput) {
  const draft = createCampaignDraft({
    ...draftInput,
    status: draftInput.status === CAMPAIGN_STATUS.DRAFT
      ? CAMPAIGN_STATUS.DRAFT
      : (draftInput.status || CAMPAIGN_STATUS.READY),
  });
  return saveCampaign(draft);
}

/**
 * Pause / resume only between RUNNING ↔ PAUSED.
 */
export function toggleCampaignStatus(id) {
  const existing = repositoryFindById(id);
  if (!existing) return null;
  let next = null;
  if (existing.status === CAMPAIGN_STATUS.RUNNING) next = CAMPAIGN_STATUS.PAUSED;
  else if (existing.status === CAMPAIGN_STATUS.PAUSED) next = CAMPAIGN_STATUS.RUNNING;
  else return null;

  const check = assertCampaignTransition(existing.status, next);
  if (!check.ok) return null;
  const saved = repositorySave({ ...existing, status: next });
  if (!saved) return null;
  bump();
  return toListPresentation(saved);
}

export function useCampaignList(filters = {}) {
  const version = useMowjStore((s) => s.version);
  return useMemo(
    () => listCampaigns(filters),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version, filters.query, filters.purpose, filters.status],
  );
}

export function useCampaignDetail(id) {
  const version = useMowjStore((s) => s.version);
  return useMemo(
    () => getCampaignDetail(id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version, id],
  );
}

export function useCampaignKpis() {
  const version = useMowjStore((s) => s.version);
  return useMemo(() => {
    const all = repositoryFindAll();
    return {
      total: all.length,
      active: all.filter((c) => (
        c.status === CAMPAIGN_STATUS.RUNNING || c.status === CAMPAIGN_STATUS.READY
      )).length,
      paused: all.filter((c) => c.status === CAMPAIGN_STATUS.PAUSED).length,
      retention: all.filter((c) => c.purpose === 'RETENTION').length,
      acquisition: all.filter((c) => c.purpose === 'ACQUISITION').length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);
}

/**
 * Campaign analytics aggregate for Dashboard consumers (آینه).
 * Mowj remains SSOT; Aineh renders. Do not mount a dashboard page under /mowj.
 * Prefer importing from `services/campaignAnalyticsContract.js`.
 *
 * @param {{ rankMetric?: string }} [options]
 */
export function getCampaignDashboard(options = {}) {
  const service = getDefaultCampaignDashboardService();
  const rankMetric = options.rankMetric || DASHBOARD_RANK_METRIC.LEADS;
  const overview = service.getOverview();
  const performance = service.getCampaignPerformance();
  const top = service.getTopCampaigns({ metric: rankMetric, limit: 5 });
  const recent = service.getRecentExecutions({ limit: 8 });

  return {
    overview,
    performance: performance.map((row) => ({
      ...row,
      resultsSummary: formatPerformanceResults(row),
      audienceLabel: row.audienceCount != null
        ? Number(row.audienceCount).toLocaleString('fa-IR')
        : null,
      executionsLabel: row.executionCount > 0
        ? Number(row.executionCount).toLocaleString('fa-IR')
        : null,
    })),
    topCampaigns: {
      ...top,
      metricLabel: DASHBOARD_RANK_METRIC_LABELS[top.metric] || top.metric,
      items: top.items.map((row) => ({
        ...row,
        rankValueLabel: formatRankValue(row, top.metric),
        resultsSummary: formatPerformanceResults(row),
      })),
    },
    recentExecutions: {
      ...recent,
      items: recent.items.map((row) => ({
        ...row,
        statusLabel: EXECUTION_STATUS_LABELS[row.status] || row.status,
        targetLabel: row.targetCount != null
          ? Number(row.targetCount).toLocaleString('fa-IR')
          : null,
        runLabel: `اجرای ${Number(row.runNumber || 0).toLocaleString('fa-IR')}`,
      })),
    },
    rankMetrics: Object.entries(DASHBOARD_RANK_METRIC).map(([key, value]) => ({
      id: value,
      label: DASHBOARD_RANK_METRIC_LABELS[value] || key,
    })),
  };
}

function formatPerformanceResults(row) {
  if (!row?.hasResults) return null;
  const parts = [];
  if (row.leads > 0) parts.push(`${row.leads.toLocaleString('fa-IR')} سرنخ`);
  if (row.opportunities > 0) parts.push(`${row.opportunities.toLocaleString('fa-IR')} فرصت`);
  if (row.orders > 0) parts.push(`${row.orders.toLocaleString('fa-IR')} سفارش`);
  if (row.tasks > 0) parts.push(`${row.tasks.toLocaleString('fa-IR')} وظیفه`);
  if (row.responses > 0) parts.push(`${row.responses.toLocaleString('fa-IR')} پاسخ`);
  return parts.length ? parts.join(' · ') : null;
}

function formatRankValue(row, metric) {
  const key = String(metric || '').toUpperCase();
  if (key === DASHBOARD_RANK_METRIC.RESPONSE_RATE && row.responseRate != null) {
    return `${(row.responseRate * 100).toLocaleString('fa-IR', {
      maximumFractionDigits: 1,
    })}٪`;
  }
  if (key === DASHBOARD_RANK_METRIC.LEADS) return row.leads.toLocaleString('fa-IR');
  if (key === DASHBOARD_RANK_METRIC.ORDERS) return row.orders.toLocaleString('fa-IR');
  if (key === DASHBOARD_RANK_METRIC.TASKS) return row.tasks.toLocaleString('fa-IR');
  return '—';
}

export function useCampaignDashboard(options = {}) {
  const version = useMowjStore((s) => s.version);
  const rankMetric = options.rankMetric || DASHBOARD_RANK_METRIC.LEADS;
  return useMemo(
    () => getCampaignDashboard({ rankMetric }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version, rankMetric],
  );
}

export function useTemplateList(filters = {}) {
  const version = useMowjStore((s) => s.version);
  return useMemo(
    () => listTemplates(filters),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version, filters.type],
  );
}

export { prepareCampaignExecution };

export const __testing = {
  resetToSeed: () => {
    repositoryResetToSeed();
    templateRepositoryResetToSeed();
    __executionTesting.resetToSeed();
    __resetAutomationRuntimeForTests();
    __resetExecutorRuntimeForTests();
    __resetAnalyticsRuntimeForTests();
    __resetAudienceSegmentRuntimeForTests();
    __resetCampaignDashboardRuntimeForTests();
    bump();
  },
};
