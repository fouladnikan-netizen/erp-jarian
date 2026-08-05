export {
  CAMPAIGN_PURPOSE,
  CAMPAIGN_PURPOSE_LABELS,
  CAMPAIGN_TYPE,
  CAMPAIGN_TYPE_LABELS,
  CAMPAIGN_STATUS,
  CAMPAIGN_STATUS_LABELS,
  CHANNEL_CATEGORY,
  CHANNEL_CATEGORY_LABELS,
  AUDIENCE_SOURCE,
  KPI_METRIC,
  KPI_METRIC_LABELS,
} from './campaign.constants';

export {
  CAMPAIGN_STATUS_TRANSITIONS,
  canTransitionCampaignStatus,
  assertCampaignTransition,
  listCampaignTransitionsFrom,
} from './campaign.lifecycle';

export {
  EXECUTION_CHANNELS,
  getExecutionChannel,
  getExecutionChannelLabel,
  listExecutionChannels,
} from './channel.catalog';

export {
  CHANNEL_EXECUTION_STATUS,
  CHANNEL_ATTEMPT_STATUS,
  normalizeChannelExecutionRequest,
  normalizeChannelExecutionResult,
  createMockChannelExecutor,
} from './channelExecutor.contract';

export {
  createChannelExecutorRegistry,
  createDefaultChannelExecutorRegistry,
  listRegisteredChannelCatalog,
} from './channelExecutorRegistry';

export {
  MESSAGE_TEMPLATE_CHANNELS,
  SURVEY_TEMPLATE_CHANNELS,
  PHYSICAL_TEMPLATE_CHANNELS,
  listCompatibleChannelsForTemplate,
  assertTemplateChannelCompatibility,
} from './channelTemplateCompatibility';

export {
  createEmptyChannelExecutionRepository,
} from './channelExecution.ports';

export {
  CAMPAIGN_CHANNEL_STATUS,
  CAMPAIGN_CHANNEL_STATUS_LABELS,
  getCampaignChannelStatus,
} from './channelStatus';

export {
  createChannelBackedActionExecutor,
  createBroadcastMessageChannelExecutor,
  createSurveyRequestChannelExecutor,
  createPhysicalDeliveryChannelExecutor,
} from './executors/channelBackedActionExecutor';

export {
  TRIGGER_RULE_CATALOG,
  getTriggerRuleDefinition,
  buildTriggerRule,
  formatTriggerPresentation,
} from './trigger.catalog';

export {
  createEmptyAudienceRef,
  normalizeAudienceRef,
} from './audience.types';

export {
  AUDIENCE_SOURCE_TYPE,
  AUDIENCE_SOURCE_TYPE_LABELS,
  AUDIENCE_ROOT,
  AUDIENCE_BASE_SELECTION,
  AUDIENCE_BASE_SELECTION_LABELS,
  AUDIENCE_TARGET_LEVEL,
  AUDIENCE_TARGET_LEVEL_LABELS,
  AUDIENCE_TARGET_LEVEL_HINTS,
  AUDIENCE_CANONICAL_SOURCES,
  RULE_COMBINATOR,
  validateAudienceDefinition,
  normalizeAudienceDefinition,
  normalizeAudienceFilters,
  normalizeAudienceRule,
  normalizeAudienceRuleGroup,
  normalizeAudienceTargetLevel,
  normalizeAudienceSource,
  resolveAudienceSourceAndLevel,
  audienceSourceForTargetLevel,
  createAudienceDefinition,
  formatAudienceRule,
  migrateLegacyAudienceInput,
  migrateLegacyConditionToRule,
} from './audienceDefinition';

export {
  createEmptyAudiencePort,
} from './audience.ports';

export {
  createAudienceResolver,
  snapshotMembersFromResolved,
} from './audienceResolver';

export {
  KPI_DEFINITION_CATALOG,
  listKpiDefinitionsForPurpose,
  normalizeKpiDefinition,
  formatKpiDefinition,
} from './kpi.types';

export {
  normalizeCampaign,
  createCampaignDraft,
} from './campaign.normalize';

export {
  EXECUTION_STATUS,
  EXECUTION_STATUS_LABELS,
  normalizeCampaignExecution,
} from './execution.types';

export {
  SNAPSHOT_MEMBER_STATUS,
  buildSnapshotMembersFromAudience,
  normalizeAudienceSnapshot,
} from './audienceSnapshot.types';

export {
  MOWJ_DOMAIN_EVENT_TYPE,
  MOWJ_DOMAIN_EVENT_LABELS,
  TRIGGER_CODE_TO_EVENT_TYPE,
  createMowjDomainEvent,
  validateMowjDomainEvent,
  createShipmentDeliveredEvent,
  createOrderDeliveredEvent,
  createOrderCreatedEvent,
  createFirstPurchaseCompletedEvent,
  createNoFollowUpDetectedEvent,
  createCustomerCreatedEvent,
  createCustomerActivityEvent,
  createLeadCreatedEvent,
  createOpportunityCreatedEvent,
  createTaskCompletedEvent,
  createSurveyResponseReceivedEvent,
} from './events.contracts';

export {
  MODULE_REF_KIND,
  refKanoonContact,
  refKanoonContactPerson,
  refOfoghLead,
  refNabzOrder,
  refCustomerOrder,
  refPooyeshTask,
  toContactReference,
  toLeadReference,
  toCustomerOrderReference,
} from './moduleRefs.contracts';

export {
  TEMPLATE_TYPE,
  TEMPLATE_TYPE_LABELS,
  TEMPLATE_STATUS,
  TEMPLATE_STATUS_LABELS,
  validateTemplate,
  normalizeTemplate,
  createTemplateDraft,
  createTemplateVersionSnapshot,
} from './template.types';

export {
  TemplateValidator,
  validateCampaignTemplate,
  validateTemplateForAction,
} from './templateValidator';

export {
  createEmptyTemplateRepository,
} from './template.repository.ports';

export {
  TEMPLATE_VARIABLE_SCOPE,
  TEMPLATE_VARIABLE_CATALOG,
  getTemplateVariable,
  extractVariableTokens,
  validateTemplateVariables,
  validateContentVariables,
} from './template.variables';

export {
  CAMPAIGN_ACTION_TYPE,
  CAMPAIGN_TYPE_TO_ACTION,
  ACTION_TYPE_TO_TEMPLATE,
  getDefaultActionTypeForCampaign,
  getCompatibleTemplateType,
  assertCampaignActionCompatibility,
  assertActionTemplateCompatibility,
  assertCampaignActionTemplateCompatibility,
} from './action.rules';

export {
  CAMPAIGN_ACTION_TYPE_LABELS,
  validateCampaignAction,
  normalizeCampaignAction,
  createDefaultActionForCampaignType,
  formatActionConfigurationSummary,
} from './action.types';

export {
  POOYESH_TASK_INTENT_KIND,
  buildPooyeshCreateTaskIntent,
  validatePooyeshCreateTaskIntent,
} from './pooyeshTask.contract';

export {
  TASK_CREATION_RESULT_STATUS,
  createEmptyPooyeshTaskPort,
  createInMemoryPooyeshTaskPort,
} from './pooyeshTask.port';

export {
  TASK_ASSIGNMENT_RULE,
  TASK_ASSIGNMENT_RULE_LABELS,
  resolveTaskAssignee,
} from './taskAssignment';

export {
  applyTemplatePlaceholders,
  resolveDueDateFromRule,
  mapTaskTemplateToFields,
} from './taskTemplateMapping';

export {
  SCHEDULE_KIND,
  SCHEDULE_KIND_LABELS,
  validateAutomationSchedule,
  normalizeAutomationSchedule,
  scheduleFromTriggerRule,
  validateDelayRule,
} from './schedule.contracts';

export {
  EXECUTION_INTENT_STATUS,
  buildAudienceReferenceFromEvent,
  normalizeExecutionIntent,
  validateExecutionIntent,
} from './executionIntent.types';

export {
  AUTOMATION_SUPPORTED_EVENTS,
  listTriggerCodesForEventType,
  evaluateTrigger,
  eventMatchesTriggerCode,
} from './triggerEvaluator';

export {
  AUTOMATION_ELIGIBLE_STATUSES,
  isCampaignEligibleForAutomation,
  matchEligibleCampaigns,
  matchCampaignsForEventType,
} from './campaignMatcher';

export {
  createEmptyCampaignAutomationRepository,
} from './campaignAutomation.ports';

export {
  createCampaignAutomationEngine,
  getCampaignAutomationStatus,
} from './campaignAutomationEngine';

export {
  EXECUTION_RESULT_STATUS,
  EXECUTION_RESULT_STATUS_LABELS,
  EXECUTOR_PIPELINE_STATUS,
  EXECUTOR_PIPELINE_STATUS_LABELS,
  normalizeExecutionResult,
  validateExecutionResult,
  resolveExecutorPipelineStatus,
} from './executionResult.types';

export {
  createEmptyExecutionResultRepository,
} from './executor.ports';

export {
  createDefaultExecutorRegistry,
  createExecutorRegistry,
  selectExecutor,
} from './executorRegistry';

export {
  createPooyeshTaskExecutor,
} from './executors/pooyeshTaskExecutor';

export {
  createUnsupportedActionExecutor,
  createBroadcastMessageExecutorPlaceholder,
  createSurveyRequestExecutorPlaceholder,
  createPhysicalDeliveryExecutorPlaceholder,
} from './executors/placeholderExecutors';

export {
  createCampaignExecutor,
} from './campaignExecutor';

export {
  ATTRIBUTION_ENTITY_TYPE,
  ATTRIBUTION_ENTITY_TYPE_LABELS,
  validateCampaignAttribution,
  normalizeCampaignAttribution,
} from './attribution.types';

export {
  resolveAttributionEntityFromEvent,
  ACQUISITION_ATTRIBUTION_EVENTS,
  RETENTION_ATTRIBUTION_EVENTS,
} from './attribution.mapping';

export {
  calculateCampaignKpiSummary,
  createCampaignKpiCalculator,
} from './campaignKpiCalculator';

export {
  createEmptyCampaignAnalyticsRepository,
} from './campaignAnalytics.ports';

export {
  createEmptyCampaignRepository,
} from './campaign.repository.ports';

export {
  createEmptyCampaignExecutionRepository,
} from './execution.repository.ports';

export {
  createEmptyExecutionIntentRepository,
} from './executionIntent.repository.ports';

export {
  createEmptyAudienceSnapshotRepository,
} from './audienceSnapshot.repository.ports';

export {
  MOWJ_DEFAULT_ACTOR,
  MOWJ_DEFAULT_ACTOR_NAME,
  getMowjTodayJalali,
} from './runtimeDefaults';

export {
  createCampaignAnalyticsService,
} from './campaignAnalytics';

export {
  DASHBOARD_EMPTY_MESSAGE,
  createCampaignDashboardService,
} from './campaignDashboard';

export {
  DASHBOARD_RANK_METRIC,
  DASHBOARD_RANK_METRIC_LABELS,
  normalizeCampaignPerformanceView,
  getPerformanceRankValue,
  rankCampaignPerformance,
} from './campaignPerformance.types';

export {
  CONDITION_OPERATOR,
  CONDITION_OPERATOR_LABELS,
  AUDIENCE_CONDITION_FIELD,
  AUDIENCE_CONDITION_FIELD_LABELS,
  FIELDS_BY_SOURCE,
  listOperatorsForField,
  listFieldsForSource,
  validateAudienceCondition,
  normalizeAudienceCondition,
  validateAudienceConditions,
} from './audienceCondition';

export {
  CONDITION_CATEGORY,
  CONDITION_CATEGORY_LABELS,
  CONDITION_SOURCE_MODULE,
  CONDITION_DATA_TYPE,
  AUDIENCE_CONDITION_REGISTRY,
  REMOVED_AUDIENCE_CONDITION_IDS,
  getConditionDefinition,
  listConditionDefinitions,
  listConditionCategories,
  listOperatorsForCondition,
  isConditionApplicableToLevel,
} from './conditionRegistry';

export {
  resolveValueProvider,
  listValueProviderIds,
  registerValueProvider,
  VALUE_PROVIDER_ALL,
} from './audienceValueProviders';

export {
  evaluateAudienceRule,
  evaluateRuleList,
  companyMatchesDefinition,
} from './audienceRuleEvaluate';

export {
  compileConditionsToFilters,
  compileAndValidateConditions,
} from './audienceSegment.compile';

export {
  AUDIENCE_SEGMENT_STATUS,
  AUDIENCE_SEGMENT_STATUS_LABELS,
  validateAudienceSegment,
  normalizeAudienceSegment,
  segmentToAudienceDefinition,
  createAudienceSegmentDraft,
  formatAudienceSegmentSummary,
} from './audienceSegment.types';

export {
  createEmptyAudienceRepository,
} from './audience.repository.ports';
