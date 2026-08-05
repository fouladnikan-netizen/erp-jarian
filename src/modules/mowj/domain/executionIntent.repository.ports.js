/**
 * ExecutionIntent repository contract.
 */

/**
 * @typedef {object} ExecutionIntentRepository
 * @property {(intent: object) => object|null} save
 * @property {() => object[]} findAll
 * @property {(campaignId: string) => object[]} findByCampaignId
 * @property {() => void} [reset]
 */

/**
 * @returns {ExecutionIntentRepository}
 */
export function createEmptyExecutionIntentRepository() {
  /** @type {object[]} */
  const rows = [];
  return {
    save(intent) {
      if (!intent?.id) return null;
      const index = rows.findIndex((row) => String(row.id) === String(intent.id));
      if (index === -1) rows.unshift({ ...intent });
      else rows[index] = { ...intent };
      return { ...intent };
    },
    findAll() {
      return rows.map((row) => ({ ...row }));
    },
    findByCampaignId(campaignId) {
      return rows.filter((row) => String(row.campaignId) === String(campaignId));
    },
    reset() {
      rows.length = 0;
    },
  };
}
