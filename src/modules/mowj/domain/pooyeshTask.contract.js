/**
 * Pooyesh task creation contract — TaskCreationIntent shape + builders.
 * Creation happens only via PooyeshTaskPort (adapter), never direct store access.
 */

import { MODULE_REF_KIND } from './moduleRefs.contracts';
import { CAMPAIGN_ACTION_TYPE } from './action.rules';
import { mapTaskTemplateToFields } from './taskTemplateMapping';
import { resolveTaskAssignee } from './taskAssignment';
import { POOYESH_TASK_INTENT_KIND } from './pooyeshTask.constants';

export { POOYESH_TASK_INTENT_KIND } from './pooyeshTask.constants';

/**
 * Build a TaskCreationIntent from CREATE_TASK action + template + campaign context.
 *
 * @param {{
 *   campaignId: string,
 *   action: object,
 *   template?: object|null,
 *   campaign?: object|null,
 *   audienceMember?: { companyId?: string, contactId?: string, customerId?: string, orderId?: string },
 *   customerOwner?: { userId?: string, name?: string }|null,
 *   contextVars?: Record<string, string>,
 * }} input
 * @returns {import('./pooyeshTask.port').TaskCreationIntent|null}
 */
export function buildPooyeshCreateTaskIntent(input = {}) {
  const action = input.action;
  if (!action || action.actionType !== CAMPAIGN_ACTION_TYPE.CREATE_TASK) return null;

  const member = input.audienceMember || {};
  const mapped = mapTaskTemplateToFields({
    template: input.template,
    action,
    campaign: input.campaign,
    audienceReference: member,
    contextVars: input.contextVars,
  });

  if (!mapped.title) return null;

  const assignedTo = resolveTaskAssignee({
    campaign: input.campaign,
    customerOwner: input.customerOwner,
    actionConfiguration: action.configuration,
  });

  const companyId = member.companyId || member.customerId || action.configuration?.companyId || null;
  const contactId = member.contactId || action.configuration?.contactId || null;
  const campaignId = String(input.campaignId || action.campaignId || input.campaign?.id || '');

  return Object.freeze({
    kind: POOYESH_TASK_INTENT_KIND,
    title: mapped.title,
    description: mapped.description,
    assignedTo: assignedTo ? Object.freeze({ ...assignedTo }) : null,
    contactReference: contactId
      ? Object.freeze({ contactId: String(contactId) })
      : null,
    companyReference: companyId
      ? Object.freeze({ companyId: String(companyId) })
      : null,
    campaignReference: campaignId
      ? Object.freeze({
        campaignId,
        campaignName: input.campaign?.name || null,
      })
      : null,
    dueDate: mapped.dueDate,
    priority: mapped.priority,
    campaignId,
    actionId: String(action.id || ''),
    templateId: action.templateId || input.template?.id || null,
    meta: Object.freeze({
      sourceModule: 'mowj',
      taskRefKind: MODULE_REF_KIND.POOYESH_TASK,
      assignmentRule: action.configuration?.assignmentRule || 'CAMPAIGN_OWNER',
    }),
  });
}

/**
 * @param {unknown} intent
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validatePooyeshCreateTaskIntent(intent) {
  const errors = [];
  if (!intent || typeof intent !== 'object') {
    return { ok: false, errors: ['intent نامعتبر است.'] };
  }
  if (intent.kind !== POOYESH_TASK_INTENT_KIND) {
    errors.push('kind باید pooyesh.createTask باشد.');
  }
  if (!String(intent.title || '').trim()) errors.push('title الزامی است.');
  const campaignId = intent.campaignId || intent.campaignReference?.campaignId;
  if (!String(campaignId || '').trim()) errors.push('campaignReference / campaignId الزامی است.');
  return { ok: errors.length === 0, errors };
}
