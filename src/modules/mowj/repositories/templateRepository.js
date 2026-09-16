/**
 * TemplateRepository — independent template catalog + version history.
 * No store imports.
 */

import {
  TEMPLATE_TYPE,
  TEMPLATE_STATUS,
  normalizeTemplate,
  validateTemplate,
  createTemplateVersionSnapshot,
} from '../domain/template.types';
import { MOWJ_DEFAULT_ACTOR_NAME as CURRENT_USER } from '../domain/runtimeDefaults';

/** @type {Array<object>} */
let templates = [];
/** @type {Array<object>} */
let versions = [];

function seedTemplates() {
  const owner = { userId: 'user-current', name: CURRENT_USER };
  const raw = [
    {
      id: 'tpl-msg-inventory',
      name: 'اعلام موجودی جدید',
      type: TEMPLATE_TYPE.MESSAGE_TEMPLATE,
      status: TEMPLATE_STATUS.ACTIVE,
      version: 1,
      createdBy: owner,
      content: {
        subject: 'موجودی جدید',
        body: 'سلام {{customerName}} از {{companyName}}، موجودی جدید {{productName}} اعلام شد.',
      },
      variables: ['customerName', 'companyName', 'productName'],
      createdAt: '2026-07-01T00:00:00.000Z',
    },
    {
      id: 'tpl-survey-delivery',
      name: 'رضایت مشتری',
      type: TEMPLATE_TYPE.SURVEY_TEMPLATE,
      status: TEMPLATE_STATUS.ACTIVE,
      version: 1,
      createdBy: owner,
      content: {
        surveyFormId: 'nps_delivery',
        intro: 'لطفاً رضایت خود از سفارش {{orderNumber}} را اعلام کنید. تحویل: {{deliveryDate}}',
      },
      variables: ['orderNumber', 'customerName', 'campaignName', 'deliveryDate'],
      createdAt: '2026-07-01T00:00:00.000Z',
    },
    {
      id: 'tpl-survey-support',
      name: 'رضایت پشتیبانی',
      type: TEMPLATE_TYPE.SURVEY_TEMPLATE,
      status: TEMPLATE_STATUS.ACTIVE,
      version: 1,
      createdBy: owner,
      content: {
        surveyFormId: 'csat_support',
        intro: null,
      },
      variables: ['customerName', 'companyName'],
      createdAt: '2026-07-01T00:00:00.000Z',
    },
    {
      id: 'tpl-task-call',
      name: 'تماس با مشتری',
      type: TEMPLATE_TYPE.TASK_TEMPLATE,
      status: TEMPLATE_STATUS.ACTIVE,
      version: 1,
      createdBy: owner,
      content: {
        title: 'تماس پیگیری مشتری — {{companyName}}',
        description: 'مرتبط با کمپین {{campaignName}}',
        priority: 'normal',
        dueInDays: 2,
      },
      variables: ['customerName', 'companyName', 'campaignName'],
      createdAt: '2026-07-01T00:00:00.000Z',
    },
    {
      id: 'tpl-physical-gift',
      name: 'ارسال هدیه فیزیکی',
      type: TEMPLATE_TYPE.PHYSICAL_TEMPLATE,
      status: TEMPLATE_STATUS.ACTIVE,
      version: 1,
      createdBy: owner,
      content: {
        itemLabel: 'بسته هدیه',
        instructions: 'ارسال بسته فیزیکی برای {{companyName}} مرتبط با سفارش {{orderNumber}}',
      },
      variables: ['companyName', 'orderNumber'],
      createdAt: '2026-07-01T00:00:00.000Z',
    },
  ];
  return raw.map((item) => normalizeTemplate(item)).filter(Boolean);
}

function seedVersions(seededTemplates) {
  return seededTemplates.map((tpl) => createTemplateVersionSnapshot(tpl, {
    version: tpl.version,
    createdAt: tpl.createdAt,
  })).filter(Boolean);
}

templates = seedTemplates();
versions = seedVersions(templates);

function copyTemplate(item) {
  return {
    ...item,
    content: { ...item.content },
    variables: [...item.variables],
    createdBy: item.createdBy ? { ...item.createdBy } : null,
  };
}

function copyVersion(item) {
  return {
    ...item,
    content: { ...item.content },
    variables: [...item.variables],
    createdBy: item.createdBy ? { ...item.createdBy } : null,
  };
}

export function templateRepositoryFindAll() {
  return templates.map(copyTemplate).sort((a, b) => (
    String(a.name).localeCompare(String(b.name), 'fa')
  ));
}

export function templateRepositoryFindById(id) {
  if (id == null || id === '') return null;
  const row = templates.find((item) => String(item.id) === String(id));
  return row ? copyTemplate(row) : null;
}

export function templateRepositoryFindByType(type) {
  const key = String(type || '').toUpperCase();
  return templates.map(copyTemplate).filter((item) => item.type === key);
}

/** Alias: saveTemplate */
export function templateRepositorySave(record) {
  const check = validateTemplate(record);
  if (!check.ok) return null;
  const next = normalizeTemplate(record);
  if (!next) return null;
  next.updatedAt = new Date().toISOString();
  const index = templates.findIndex((item) => String(item.id) === String(next.id));
  if (index === -1) {
    next.version = next.version || 1;
    templates = [next, ...templates];
    const snap = createTemplateVersionSnapshot(next, {
      version: next.version,
      createdAt: next.createdAt,
    });
    if (snap) versions = [snap, ...versions];
  } else {
    const prev = templates[index];
    templates = templates.slice();
    templates[index] = {
      ...prev,
      ...next,
      version: prev.version,
      createdAt: prev.createdAt,
      updatedAt: next.updatedAt,
    };
  }
  return templateRepositoryFindById(next.id);
}

/**
 * Freeze current template as a version snapshot and bump version.
 * Old campaigns/executions keep templateVersion reference.
 * @param {string} templateId
 * @param {object} [nextContent]  optional updates applied as the new current version
 */
export function templateRepositoryCreateVersion(templateId, nextContent = null) {
  const existing = templateRepositoryFindById(templateId);
  if (!existing) return null;

  // Ensure current state is recorded before bump (idempotent if already present)
  const already = versions.some((row) => (
    String(row.templateId) === String(existing.id)
    && Number(row.version) === Number(existing.version)
  ));
  if (!already) {
    const snap = createTemplateVersionSnapshot(existing, {
      version: existing.version,
      createdAt: existing.updatedAt || existing.createdAt,
    });
    if (snap) versions = [snap, ...versions];
  }

  const bumped = normalizeTemplate({
    ...existing,
    ...(nextContent && typeof nextContent === 'object' ? nextContent : {}),
    id: existing.id,
    version: existing.version + 1,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  });
  if (!bumped) return null;

  const check = validateTemplate(bumped);
  if (!check.ok) return null;

  const index = templates.findIndex((item) => String(item.id) === String(templateId));
  if (index === -1) return null;
  templates = templates.slice();
  templates[index] = bumped;

  const newSnap = createTemplateVersionSnapshot(bumped, {
    version: bumped.version,
    createdAt: bumped.updatedAt,
  });
  if (newSnap) versions = [newSnap, ...versions];

  return {
    template: copyTemplate(bumped),
    version: newSnap ? copyVersion(newSnap) : null,
    history: templateRepositoryListVersions(templateId),
  };
}

export function templateRepositoryListVersions(templateId) {
  if (templateId == null || templateId === '') return [];
  return versions
    .filter((row) => String(row.templateId) === String(templateId))
    .map(copyVersion)
    .sort((a, b) => Number(b.version) - Number(a.version));
}

export function templateRepositoryGetVersion(templateId, version) {
  const ver = Number(version);
  return templateRepositoryListVersions(templateId)
    .find((row) => Number(row.version) === ver) || null;
}

export function templateRepositoryDelete(id) {
  if (id == null || id === '') return false;
  const before = templates.length;
  templates = templates.filter((item) => String(item.id) !== String(id));
  versions = versions.filter((item) => String(item.templateId) !== String(id));
  return templates.length < before;
}

export function templateRepositoryResetToSeed() {
  templates = seedTemplates();
  versions = seedVersions(templates);
  return templateRepositoryFindAll();
}

/**
 * @returns {import('../domain/template.repository.ports').TemplateRepository}
 */
export function createTemplateRepository() {
  return {
    saveTemplate: templateRepositorySave,
    getTemplate: templateRepositoryFindById,
    listTemplates: (filters = {}) => {
      if (filters.type) return templateRepositoryFindByType(filters.type);
      return templateRepositoryFindAll();
    },
    createVersion: templateRepositoryCreateVersion,
    listVersions: templateRepositoryListVersions,
    getVersion: templateRepositoryGetVersion,
  };
}
