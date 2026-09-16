/**
 * Campaign Template foundation — first-class reusable entities.
 * No render engine / no channel send.
 */

import { createEntityId, ENTITY_ID_PREFIX } from '../../../domain/identity';
import { MOWJ_DEFAULT_ACTOR_NAME as CURRENT_USER } from './runtimeDefaults';
import {
  validateTemplateVariables,
  extractVariableTokens,
  validateContentVariables,
} from './template.variables';

export const TEMPLATE_TYPE = Object.freeze({
  MESSAGE_TEMPLATE: 'MESSAGE_TEMPLATE',
  SURVEY_TEMPLATE: 'SURVEY_TEMPLATE',
  TASK_TEMPLATE: 'TASK_TEMPLATE',
  PHYSICAL_TEMPLATE: 'PHYSICAL_TEMPLATE',
});

export const TEMPLATE_TYPE_LABELS = Object.freeze({
  MESSAGE_TEMPLATE: 'قالب پیام',
  SURVEY_TEMPLATE: 'قالب نظرسنجی',
  TASK_TEMPLATE: 'قالب وظیفه پویش',
  PHYSICAL_TEMPLATE: 'قالب اقدام فیزیکی',
});

export const TEMPLATE_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED',
});

export const TEMPLATE_STATUS_LABELS = Object.freeze({
  DRAFT: 'پیش‌نویس',
  ACTIVE: 'فعال',
  ARCHIVED: 'بایگانی',
});

const TYPE_SET = new Set(Object.values(TEMPLATE_TYPE));
const STATUS_SET = new Set(Object.values(TEMPLATE_STATUS));

/**
 * @typedef {object} CampaignTemplate
 * @property {string} id
 * @property {string} name
 * @property {string} type
 * @property {object} content
 * @property {string[]} variables
 * @property {string} status
 * @property {number} version
 * @property {{ userId: string, name: string }|null} createdBy
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {object} TemplateVersionSnapshot
 * @property {string} id
 * @property {string} templateId
 * @property {number} version
 * @property {string} name
 * @property {string} type
 * @property {object} content
 * @property {string[]} variables
 * @property {string} status
 * @property {{ userId: string, name: string }|null} createdBy
 * @property {string} createdAt
 */

/**
 * @param {unknown} input
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateTemplate(input) {
  const errors = [];
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: ['قالب نامعتبر است.'] };
  }
  if (!String(input.name || '').trim()) errors.push('نام قالب الزامی است.');
  const type = String(input.type || '').toUpperCase();
  if (!TYPE_SET.has(type)) errors.push(`نوع قالب نامعتبر: ${input.type || '—'}`);

  if (type === TEMPLATE_TYPE.SURVEY_TEMPLATE) {
    const surveyFormId = input.content?.surveyFormId || input.surveyFormId;
    if (!surveyFormId) {
      errors.push('قالب نظرسنجی باید surveyFormId داشته باشد (بدون کپی اسکیما).');
    }
  }
  if (type === TEMPLATE_TYPE.MESSAGE_TEMPLATE) {
    if (!String(input.content?.body || input.body || '').trim()) {
      errors.push('متن پیام قالب الزامی است.');
    }
  }
  if (type === TEMPLATE_TYPE.TASK_TEMPLATE) {
    if (!String(input.content?.title || input.title || '').trim()) {
      errors.push('عنوان وظیفه قالب الزامی است.');
    }
  }
  if (type === TEMPLATE_TYPE.PHYSICAL_TEMPLATE) {
    if (!String(input.content?.instructions || input.instructions || input.body || '').trim()) {
      errors.push('دستورالعمل قالب فیزیکی الزامی است.');
    }
  }

  if (input.status != null && input.status !== '') {
    const status = String(input.status).toUpperCase();
    if (!STATUS_SET.has(status)) errors.push(`وضعیت قالب نامعتبر: ${input.status}`);
  }

  const variables = Array.isArray(input.variables) ? input.variables : [];
  const varCheck = validateTemplateVariables(variables);
  if (!varCheck.ok) errors.push(...varCheck.errors);

  const contentText = [
    input.content?.body,
    input.content?.title,
    input.content?.description,
    input.content?.intro,
    input.content?.instructions,
    input.content?.subject,
  ].filter(Boolean).join(' ');
  if (contentText) {
    const contentCheck = validateContentVariables(contentText);
    if (!contentCheck.ok) errors.push(...contentCheck.errors);
  }

  return { ok: errors.length === 0, errors };
}

/**
 * @param {object} input
 * @returns {CampaignTemplate|null}
 */
export function normalizeTemplate(input = {}) {
  const type = String(input.type || '').toUpperCase();
  if (!TYPE_SET.has(type)) return null;
  if (!String(input.name || '').trim() && !input.id) return null;

  const content = normalizeTemplateContent(type, input.content || input);
  const declared = Array.isArray(input.variables)
    ? input.variables.map((v) => String(v).replace(/^\{\{\s*/, '').replace(/\s*\}\}$/, ''))
    : [];
  const fromBody = extractVariableTokens(
    [
      content.body,
      content.title,
      content.description,
      content.intro,
      content.instructions,
      content.subject,
    ].filter(Boolean).join(' '),
  ).map((t) => t.replace(/^\{\{\s*/, '').replace(/\s*\}\}$/, ''));
  const variables = [...new Set([...declared, ...fromBody])];

  const statusRaw = String(input.status || TEMPLATE_STATUS.ACTIVE).toUpperCase();
  const status = STATUS_SET.has(statusRaw) ? statusRaw : TEMPLATE_STATUS.ACTIVE;
  const version = Number.isFinite(Number(input.version)) && Number(input.version) > 0
    ? Math.floor(Number(input.version))
    : 1;

  const createdBy = input.createdBy && typeof input.createdBy === 'object'
    ? {
      userId: String(input.createdBy.userId || 'user-current'),
      name: String(input.createdBy.name || CURRENT_USER),
    }
    : { userId: 'user-current', name: CURRENT_USER };

  const nowIso = new Date().toISOString();
  return {
    id: input.id != null && input.id !== ''
      ? String(input.id)
      : createEntityId(ENTITY_ID_PREFIX.CAMPAIGN, 'tpl'),
    name: String(input.name || '').trim() || 'قالب بدون نام',
    type,
    content,
    variables,
    status,
    version,
    createdBy,
    createdAt: input.createdAt || nowIso,
    updatedAt: input.updatedAt || nowIso,
  };
}

function normalizeTemplateContent(type, raw = {}) {
  if (type === TEMPLATE_TYPE.MESSAGE_TEMPLATE) {
    return {
      body: String(raw.body || '').trim(),
      subject: raw.subject != null ? String(raw.subject).trim() || null : null,
    };
  }
  if (type === TEMPLATE_TYPE.SURVEY_TEMPLATE) {
    return {
      surveyFormId: String(raw.surveyFormId || '').trim(),
      intro: raw.intro != null ? String(raw.intro).trim() || null : null,
    };
  }
  if (type === TEMPLATE_TYPE.TASK_TEMPLATE) {
    return {
      title: String(raw.title || '').trim(),
      description: raw.description != null ? String(raw.description).trim() || null : null,
      priority: raw.priority != null ? String(raw.priority) : 'normal',
    };
  }
  if (type === TEMPLATE_TYPE.PHYSICAL_TEMPLATE) {
    return {
      instructions: String(raw.instructions || raw.body || '').trim(),
      itemLabel: raw.itemLabel != null ? String(raw.itemLabel).trim() || null : null,
    };
  }
  return { ...raw };
}

/**
 * Snapshot of a template at a specific version (immutable history row).
 * @param {CampaignTemplate|object} template
 * @param {{ version?: number, createdAt?: string }} [meta]
 * @returns {TemplateVersionSnapshot|null}
 */
export function createTemplateVersionSnapshot(template, meta = {}) {
  const normalized = normalizeTemplate(template);
  if (!normalized) return null;
  const version = meta.version != null
    ? Math.floor(Number(meta.version))
    : normalized.version;
  return {
    id: createEntityId(ENTITY_ID_PREFIX.CAMPAIGN, 'tplver'),
    templateId: normalized.id,
    version,
    name: normalized.name,
    type: normalized.type,
    content: { ...normalized.content },
    variables: [...normalized.variables],
    status: normalized.status,
    createdBy: normalized.createdBy ? { ...normalized.createdBy } : null,
    createdAt: meta.createdAt || new Date().toISOString(),
  };
}

/**
 * Soft create helper for seeds / drafts.
 * @param {Partial<CampaignTemplate>} partial
 */
export function createTemplateDraft(partial = {}) {
  return normalizeTemplate({
    name: 'قالب جدید',
    type: TEMPLATE_TYPE.MESSAGE_TEMPLATE,
    content: { body: '' },
    variables: [],
    status: TEMPLATE_STATUS.DRAFT,
    version: 1,
    ...partial,
  });
}
