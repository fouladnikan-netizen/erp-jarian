/**
 * AudienceSegment — reusable audience definition (KANOON_PERSON recipients).
 */

import { createEntityId, ENTITY_ID_PREFIX } from '../../../domain/identity';
import { MOWJ_DEFAULT_ACTOR_NAME as CURRENT_USER } from './runtimeDefaults';
import {
  AUDIENCE_BASE_SELECTION,
  AUDIENCE_SOURCE_TYPE,
  AUDIENCE_TARGET_LEVEL,
  createAudienceDefinition,
  formatAudienceRule,
  isCanonicalAudienceSource,
  migrateLegacyConditionToRule,
  migrateLegacyAudienceInput,
  normalizeAudienceDefinition,
  normalizeAudienceRule,
  normalizeAudienceRuleGroup,
  resolveAudienceSourceAndLevel,
} from './audienceDefinition';
import { validateAudienceConditions } from './audienceCondition';

export const AUDIENCE_SEGMENT_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED',
});

export const AUDIENCE_SEGMENT_STATUS_LABELS = Object.freeze({
  ACTIVE: 'فعال',
  ARCHIVED: 'بایگانی',
});

const SEGMENT_STATUS_SET = new Set(Object.values(AUDIENCE_SEGMENT_STATUS));

/**
 * @typedef {object} AudienceSegment
 * @property {string} id
 * @property {string} name
 * @property {string|null} description
 * @property {string} source  KANOON_PERSON
 * @property {string} sourceType  alias of source
 * @property {string} targetLevel  PERSON
 * @property {string} baseSelection
 * @property {string} status  ACTIVE | ARCHIVED
 * @property {object[]} rules
 * @property {object[]} groups
 * @property {object[]} conditions  legacy alias of rules
 * @property {{ userId: string, name: string }|null} createdBy
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @param {unknown} input
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateAudienceSegment(input) {
  const errors = [];
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: ['سگمنت مخاطب نامعتبر است.'] };
  }
  if (!String(input.name || '').trim()) errors.push('نام سگمنت الزامی است.');

  const migrated = migrateLegacyAudienceInput(input);
  const { source } = resolveAudienceSourceAndLevel(migrated);
  if (migrated.source || migrated.sourceType) {
    const raw = String(migrated.source || migrated.sourceType || '').toUpperCase();
    if (
      !isCanonicalAudienceSource(raw)
      && !Object.values(AUDIENCE_SOURCE_TYPE).includes(raw)
      && !['COMPANY', 'PERSON'].includes(raw)
    ) {
      errors.push(`منبع نامعتبر: ${input.sourceType || input.source || '—'}`);
    }
  }

  const rules = Array.isArray(migrated.rules) ? migrated.rules : [];
  const condCheck = validateAudienceConditions(rules, { sourceType: source });
  if (!condCheck.ok && rules.length) errors.push(...condCheck.errors);
  return { ok: errors.length === 0, errors };
}

/**
 * @param {object} input
 * @returns {AudienceSegment|null}
 */
export function normalizeAudienceSegment(input = {}) {
  const migrated = migrateLegacyAudienceInput(input);
  const name = String(migrated.name || '').trim();
  if (!name) return null;

  const rulesFromLegacy = (Array.isArray(migrated.conditions) ? migrated.conditions : [])
    .map((item) => migrateLegacyConditionToRule(item))
    .filter(Boolean);
  const rules = (Array.isArray(migrated.rules) && migrated.rules.length
    ? migrated.rules
    : rulesFromLegacy)
    .map((item) => normalizeAudienceRule(item))
    .filter(Boolean);

  const groups = (Array.isArray(migrated.groups) ? migrated.groups : [])
    .map((item) => normalizeAudienceRuleGroup(item))
    .filter(Boolean);

  const baseRaw = String(
    migrated.baseSelection
    || (rules.length || groups.some((g) => g.rules?.length)
      ? AUDIENCE_BASE_SELECTION.MATCHING_CONDITIONS
      : AUDIENCE_BASE_SELECTION.ALL_COMPANIES),
  ).toUpperCase();
  const baseSelection = Object.values(AUDIENCE_BASE_SELECTION).includes(baseRaw)
    ? baseRaw
    : AUDIENCE_BASE_SELECTION.ALL_COMPANIES;

  const { source, targetLevel } = resolveAudienceSourceAndLevel(migrated);
  const groupCombinatorRaw = String(migrated.groupCombinator || 'AND').toUpperCase();
  const groupCombinator = groupCombinatorRaw === 'OR' ? 'OR' : 'AND';

  const nowIso = new Date().toISOString();
  const createdBy = migrated.createdBy && typeof migrated.createdBy === 'object'
    ? {
      userId: String(migrated.createdBy.userId || 'user-current'),
      name: String(migrated.createdBy.name || CURRENT_USER),
    }
    : { userId: 'user-current', name: CURRENT_USER };

  const statusRaw = String(migrated.status || AUDIENCE_SEGMENT_STATUS.ACTIVE).toUpperCase();
  const status = SEGMENT_STATUS_SET.has(statusRaw)
    ? statusRaw
    : AUDIENCE_SEGMENT_STATUS.ACTIVE;

  const description = migrated.description != null && String(migrated.description).trim()
    ? String(migrated.description).trim()
    : null;

  return {
    id: migrated.id != null && migrated.id !== ''
      ? String(migrated.id)
      : createEntityId(ENTITY_ID_PREFIX.CAMPAIGN, 'seg'),
    name,
    description,
    source,
    sourceType: source,
    targetLevel,
    baseSelection,
    status,
    rules,
    groups,
    groupCombinator,
    conditions: rules,
    createdBy,
    createdAt: migrated.createdAt || nowIso,
    updatedAt: migrated.updatedAt || nowIso,
  };
}

/**
 * @param {AudienceSegment|object} segment
 */
export function segmentToAudienceDefinition(segment) {
  if (!segment) return null;
  const normalized = normalizeAudienceSegment(segment) || segment;
  return normalizeAudienceDefinition({
    id: `aud-from-${normalized.id}`,
    name: normalized.name,
    source: normalized.source,
    targetLevel: normalized.targetLevel || AUDIENCE_TARGET_LEVEL.PERSON,
    baseSelection: normalized.baseSelection,
    rules: normalized.rules,
    groups: normalized.groups,
    groupCombinator: normalized.groupCombinator,
    createdAt: normalized.createdAt,
  }) || createAudienceDefinition({
    name: normalized.name,
    source: normalized.source,
    targetLevel: normalized.targetLevel,
    baseSelection: normalized.baseSelection,
    rules: normalized.rules,
    groups: normalized.groups,
    groupCombinator: normalized.groupCombinator,
  });
}

/**
 * @param {Partial<AudienceSegment>} [partial]
 */
export function createAudienceSegmentDraft(partial = {}) {
  return normalizeAudienceSegment({
    name: 'سگمنت جدید',
    source: AUDIENCE_SOURCE_TYPE.KANOON_PERSON,
    targetLevel: AUDIENCE_TARGET_LEVEL.PERSON,
    baseSelection: AUDIENCE_BASE_SELECTION.ALL_COMPANIES,
    rules: [],
    groups: [],
    ...partial,
  });
}

/**
 * @param {AudienceSegment} segment
 */
export function formatAudienceSegmentSummary(segment) {
  if (!segment) return '—';
  const def = segmentToAudienceDefinition(segment);
  return def ? formatAudienceRule(def) : segment.name;
}
