/**
 * Executor layer ports — no store imports.
 */

/**
 * @typedef {object} ActionExecutor
 * @property {string} actionType
 * @property {(ctx: ExecutorContext) => ExecutorActionOutcome} execute
 */

/**
 * @typedef {object} ExecutorContext
 * @property {object} intent  CampaignExecutionIntent
 * @property {object|null} campaign
 * @property {object|null} template
 * @property {object|null} action
 */

/**
 * @typedef {object} ExecutorActionOutcome
 * @property {boolean} ok
 * @property {string} status  SUCCESS | FAILED | PENDING
 * @property {string|null} [referenceId]
 * @property {string|null} [error]
 * @property {object|null} [payload]
 */

/**
 * @typedef {object} ExecutionResultRepository
 * @property {(result: object) => object|null} save
 * @property {(id: string) => object|null} findById
 * @property {(campaignId: string) => object[]} findByCampaignId
 * @property {(executionIntentId: string) => object|null} findByIntentId
 * @property {() => object[]} findAll
 */

/**
 * @typedef {object} CampaignExecutorPorts
 * @property {(campaignId: string) => object|null} findCampaign
 * @property {(templateId: string) => object|null} findTemplate
 * @property {(intentId: string) => object|null} [findExecutionIntent]
 * @property {(intent: object) => object|null} [saveExecutionIntent]
 * @property {ExecutionResultRepository} results
 */

/**
 * @returns {ExecutionResultRepository}
 */
export function createEmptyExecutionResultRepository() {
  /** @type {object[]} */
  const rows = [];
  return {
    save(result) {
      if (!result) return null;
      const index = rows.findIndex((item) => String(item.id) === String(result.id));
      if (index === -1) rows.unshift(result);
      else rows[index] = result;
      return result;
    },
    findById(id) {
      return rows.find((item) => String(item.id) === String(id)) || null;
    },
    findByCampaignId(campaignId) {
      return rows.filter((item) => String(item.campaignId) === String(campaignId));
    },
    findByIntentId(executionIntentId) {
      return rows.find((item) => (
        String(item.executionIntentId) === String(executionIntentId)
      )) || null;
    },
    findAll() {
      return [...rows];
    },
  };
}
