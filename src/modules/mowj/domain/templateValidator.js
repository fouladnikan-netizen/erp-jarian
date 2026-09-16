/**
 * TemplateValidator — required fields, variables, action↔type compatibility.
 * Validation only — no render / no send.
 */

import {
  validateTemplate,
  normalizeTemplate,
  TEMPLATE_TYPE,
} from './template.types';
import {
  assertActionTemplateCompatibility,
  getCompatibleTemplateType,
  CAMPAIGN_ACTION_TYPE,
} from './action.rules';
import { validateContentVariables, validateTemplateVariables } from './template.variables';

/**
 * Full template validation (entity rules + content variables).
 * @param {unknown} input
 */
export function validateCampaignTemplate(input) {
  return validateTemplate(input);
}

/**
 * Validate template for use with a campaign action.
 * @param {{
 *   template?: object|null,
 *   actionType?: string,
 *   templateType?: string,
 * }} input
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateTemplateForAction(input = {}) {
  const errors = [];
  const actionType = String(input.actionType || '').toUpperCase();
  const template = input.template || null;
  const templateType = String(
    input.templateType || template?.type || '',
  ).toUpperCase();

  if (!actionType) {
    errors.push('actionType الزامی است.');
    return { ok: false, errors };
  }

  if (template) {
    const entityCheck = validateTemplate(template);
    if (!entityCheck.ok) errors.push(...entityCheck.errors);
  }

  if (!templateType) {
    errors.push('نوع قالب مشخص نیست.');
  } else {
    const compat = assertActionTemplateCompatibility(actionType, templateType);
    if (!compat.ok) errors.push(compat.error);
  }

  // Explicit product rules
  if (actionType === CAMPAIGN_ACTION_TYPE.SURVEY_REQUEST
    && templateType
    && templateType !== TEMPLATE_TYPE.SURVEY_TEMPLATE) {
    errors.push('SURVEY_REQUEST فقط با SURVEY_TEMPLATE مجاز است.');
  }
  if (actionType === CAMPAIGN_ACTION_TYPE.CREATE_TASK
    && templateType
    && templateType !== TEMPLATE_TYPE.TASK_TEMPLATE) {
    errors.push('CREATE_TASK فقط با TASK_TEMPLATE مجاز است.');
  }

  return { ok: errors.length === 0, errors };
}

/**
 * TemplateValidator facade object.
 */
export const TemplateValidator = Object.freeze({
  validate: validateCampaignTemplate,
  validateVariables: validateTemplateVariables,
  validateContentVariables,
  validateForAction: validateTemplateForAction,
  getCompatibleType: getCompatibleTemplateType,
  normalize: normalizeTemplate,
});

export default TemplateValidator;
