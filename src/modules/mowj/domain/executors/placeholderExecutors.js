/**
 * Future channel / action executors — placeholders only.
 * Must not send SMS / WhatsApp / Email / Ads.
 */

import { CAMPAIGN_ACTION_TYPE } from '../action.rules';
import { EXECUTION_RESULT_STATUS } from '../executionResult.types';

/**
 * @param {string} actionType
 * @param {string} message
 * @returns {import('../executor.ports').ActionExecutor}
 */
export function createUnsupportedActionExecutor(actionType, message) {
  const type = String(actionType || '').toUpperCase();
  return {
    actionType: type,
    execute() {
      return {
        ok: false,
        status: EXECUTION_RESULT_STATUS.FAILED,
        referenceId: null,
        error: message || `Executor برای ${type} هنوز پیاده‌سازی نشده است.`,
        payload: null,
      };
    },
  };
}

export function createBroadcastMessageExecutorPlaceholder() {
  return createUnsupportedActionExecutor(
    CAMPAIGN_ACTION_TYPE.BROADCAST_MESSAGE,
    'BROADCAST_MESSAGE executor در دسترس نیست — کانال خارجی ارسال نمی‌شود.',
  );
}

export function createSurveyRequestExecutorPlaceholder() {
  return createUnsupportedActionExecutor(
    CAMPAIGN_ACTION_TYPE.SURVEY_REQUEST,
    'SURVEY_REQUEST executor در دسترس نیست — کانال خارجی ارسال نمی‌شود.',
  );
}

export function createPhysicalDeliveryExecutorPlaceholder() {
  return createUnsupportedActionExecutor(
    CAMPAIGN_ACTION_TYPE.PHYSICAL_DELIVERY,
    'PHYSICAL_DELIVERY executor در دسترس نیست — ارسال فیزیکی پیاده‌سازی نشده.',
  );
}
