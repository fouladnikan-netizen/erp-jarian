/**
 * In-memory AudienceRepository (segments) — COMPANY source seeds.
 */

import {
  normalizeAudienceSegment,
  segmentToAudienceDefinition,
  validateAudienceSegment,
} from '../domain/audienceSegment.types';
import { CONDITION_OPERATOR } from '../domain/audienceCondition';
import {
  AUDIENCE_BASE_SELECTION,
  AUDIENCE_SOURCE_TYPE,
  AUDIENCE_TARGET_LEVEL,
} from '../domain/audienceDefinition';
import { MOWJ_DEFAULT_ACTOR_NAME as CURRENT_USER } from '../domain/runtimeDefaults';

/** @type {Array<object>} */
let segments = seedSegments();

function seedSegments() {
  const owner = { userId: 'user-current', name: CURRENT_USER };
  const raw = [
    {
      id: 'seg-all-companies',
      name: 'همه افراد مرتبط کانون',
      source: AUDIENCE_SOURCE_TYPE.KANOON_PERSON,
      targetLevel: AUDIENCE_TARGET_LEVEL.PERSON,
      baseSelection: AUDIENCE_BASE_SELECTION.ALL_COMPANIES,
      rules: [],
      createdBy: owner,
    },
    {
      id: 'seg-with-orders',
      name: 'افراد شرکت‌های دارای سفارش',
      source: AUDIENCE_SOURCE_TYPE.KANOON_PERSON,
      targetLevel: AUDIENCE_TARGET_LEVEL.PERSON,
      baseSelection: AUDIENCE_BASE_SELECTION.WITH_ORDERS,
      rules: [],
      createdBy: owner,
    },
    {
      id: 'seg-tehran-companies',
      name: 'افراد مرتبط شرکت‌های تهران',
      source: AUDIENCE_SOURCE_TYPE.KANOON_PERSON,
      targetLevel: AUDIENCE_TARGET_LEVEL.PERSON,
      baseSelection: AUDIENCE_BASE_SELECTION.MATCHING_CONDITIONS,
      rules: [
        {
          id: 'c1',
          conditionId: 'province',
          operator: CONDITION_OPERATOR.EQUALS,
          value: 'تهران',
        },
      ],
      createdBy: owner,
    },
    {
      id: 'seg-sheet-buyers',
      name: 'افراد مرتبط خریداران ورق',
      source: AUDIENCE_SOURCE_TYPE.KANOON_PERSON,
      targetLevel: AUDIENCE_TARGET_LEVEL.PERSON,
      baseSelection: AUDIENCE_BASE_SELECTION.MATCHING_CONDITIONS,
      rules: [
        {
          id: 'c3',
          conditionId: 'purchasedProduct',
          operator: CONDITION_OPERATOR.CONTAINS,
          value: 'ورق',
        },
      ],
      createdBy: owner,
    },
    {
      id: 'seg-women-persons',
      name: 'اشخاص مرتبط زن',
      source: AUDIENCE_SOURCE_TYPE.KANOON_PERSON,
      targetLevel: AUDIENCE_TARGET_LEVEL.PERSON,
      baseSelection: AUDIENCE_BASE_SELECTION.MATCHING_CONDITIONS,
      rules: [
        {
          id: 'c-gender',
          conditionId: 'personGender',
          operator: CONDITION_OPERATOR.EQUALS,
          value: 'female',
        },
      ],
      createdBy: owner,
    },
  ];
  return raw.map((item) => normalizeAudienceSegment(item)).filter(Boolean);
}

function copy() {
  return segments.map((item) => ({
    ...item,
    description: item.description ?? null,
    status: item.status || 'ACTIVE',
    rules: (item.rules || []).map((rule) => ({ ...rule })),
    groups: (item.groups || []).map((group) => ({
      ...group,
      rules: (group.rules || []).map((rule) => ({ ...rule })),
    })),
    conditions: (item.conditions || item.rules || []).map((cond) => ({ ...cond })),
    createdBy: item.createdBy ? { ...item.createdBy } : null,
  }));
}

export function audienceRepositorySaveSegment(record) {
  const check = validateAudienceSegment(record);
  if (!check.ok) return null;
  const next = normalizeAudienceSegment({
    ...record,
    updatedAt: new Date().toISOString(),
  });
  if (!next) return null;
  const index = segments.findIndex((item) => String(item.id) === String(next.id));
  if (index === -1) {
    segments = [next, ...segments];
  } else {
    next.createdAt = segments[index].createdAt;
    segments = segments.slice();
    segments[index] = next;
  }
  return copy().find((item) => item.id === next.id) || null;
}

export function audienceRepositoryGetSegment(id) {
  if (id == null || id === '') return null;
  return copy().find((item) => String(item.id) === String(id)) || null;
}

export function audienceRepositoryListSegments() {
  return copy().sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

export function audienceRepositoryDeleteSegment(id) {
  if (id == null || id === '') return false;
  const before = segments.length;
  segments = segments.filter((item) => String(item.id) !== String(id));
  return segments.length < before;
}

export function audienceRepositoryReset() {
  segments = seedSegments();
  return audienceRepositoryListSegments();
}

/**
 * @param {(definition: object) => { ok: boolean, count: number, error?: string }} [previewFn]
 * @returns {import('../domain/audience.repository.ports').AudienceRepository}
 */
export function createAudienceRepository(previewFn) {
  return {
    saveSegment: audienceRepositorySaveSegment,
    getSegment: audienceRepositoryGetSegment,
    listSegments: audienceRepositoryListSegments,
    deleteSegment: audienceRepositoryDeleteSegment,
    previewSegment(segmentOrId) {
      const segment = typeof segmentOrId === 'string'
        ? audienceRepositoryGetSegment(segmentOrId)
        : normalizeAudienceSegment(segmentOrId);
      if (!segment) return { ok: false, count: 0, error: 'سگمنت یافت نشد.' };
      const definition = segmentToAudienceDefinition(segment);
      if (typeof previewFn === 'function') {
        return previewFn(definition);
      }
      return { ok: true, count: 0 };
    },
  };
}
