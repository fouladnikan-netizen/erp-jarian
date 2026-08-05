/**
 * PooyeshTaskExecutor — CREATE_TASK via PooyeshTaskPort (real internal task).
 */

import { CAMPAIGN_ACTION_TYPE } from '../action.rules';
import {
  buildPooyeshCreateTaskIntent,
  validatePooyeshCreateTaskIntent,
  POOYESH_TASK_INTENT_KIND,
} from '../pooyeshTask.contract';
import {
  createEmptyPooyeshTaskPort,
  TASK_CREATION_RESULT_STATUS,
} from '../pooyeshTask.port';
import { EXECUTION_RESULT_STATUS } from '../executionResult.types';

/**
 * @param {{ pooyeshTaskPort?: import('../pooyeshTask.port').PooyeshTaskPort }} [options]
 * @returns {import('../executor.ports').ActionExecutor}
 */
export function createPooyeshTaskExecutor(options = {}) {
  const port = options.pooyeshTaskPort || createEmptyPooyeshTaskPort();

  return {
    actionType: CAMPAIGN_ACTION_TYPE.CREATE_TASK,

    /**
     * @param {import('../executor.ports').ExecutorContext} ctx
     * @returns {import('../executor.ports').ExecutorActionOutcome}
     */
    execute(ctx) {
      const intent = ctx?.intent;
      const action = ctx?.action;
      if (!intent) {
        return fail('CampaignExecutionIntent الزامی است.');
      }
      if (!action || action.actionType !== CAMPAIGN_ACTION_TYPE.CREATE_TASK) {
        return fail('اقدام CREATE_TASK روی کمپین یافت نشد.');
      }

      const audience = intent.audienceReference || {};
      const taskIntent = buildPooyeshCreateTaskIntent({
        campaignId: intent.campaignId,
        action,
        template: ctx.template,
        campaign: ctx.campaign,
        audienceMember: {
          companyId: audience.companyId || audience.customerId,
          contactId: audience.contactId,
          customerId: audience.customerId,
          orderId: audience.orderId,
        },
        customerOwner: ctx.customerOwner || null,
        contextVars: ctx.contextVars || {},
      });

      if (!taskIntent) {
        return fail('ساخت TaskCreationIntent ناموفق بود (عنوان یا قالب ناقص).');
      }

      const check = validatePooyeshCreateTaskIntent(taskIntent);
      if (!check.ok) {
        return fail(check.errors.join(' '));
      }

      let creation;
      try {
        creation = port.createTask(taskIntent);
      } catch (err) {
        return fail(err?.message || 'خطا در فراخوانی PooyeshTaskPort.');
      }

      if (!creation?.ok || !creation.taskId) {
        return {
          ok: false,
          status: EXECUTION_RESULT_STATUS.FAILED,
          referenceId: null,
          error: creation?.error || 'ایجاد وظیفه پویش ناموفق بود.',
          payload: {
            kind: POOYESH_TASK_INTENT_KIND,
            taskCreationIntent: taskIntent,
            taskCreationResult: creation || null,
          },
        };
      }

      return {
        ok: true,
        status: EXECUTION_RESULT_STATUS.SUCCESS,
        referenceId: String(creation.taskId),
        error: null,
        payload: {
          kind: POOYESH_TASK_INTENT_KIND,
          taskCreationIntent: taskIntent,
          taskCreationResult: {
            taskId: creation.taskId,
            status: creation.status || TASK_CREATION_RESULT_STATUS.CREATED,
            assignedTo: creation.assignedTo || taskIntent.assignedTo,
          },
          assignedTo: creation.assignedTo || taskIntent.assignedTo,
          taskId: creation.taskId,
        },
      };
    },
  };
}

function fail(error) {
  return {
    ok: false,
    status: EXECUTION_RESULT_STATUS.FAILED,
    referenceId: null,
    error,
    payload: null,
  };
}
