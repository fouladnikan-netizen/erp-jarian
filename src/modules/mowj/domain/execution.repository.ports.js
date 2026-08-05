/**
 * CampaignExecution repository contract (run attempts).
 */

/**
 * @typedef {object} CampaignExecutionRepository
 * @property {() => object[]} findAll
 * @property {(id: string) => object|null} findById
 * @property {(campaignId: string) => object[]} findByCampaignId
 * @property {(campaignId: string) => number} nextRunNumber
 * @property {(execution: object) => object|null} save
 */

/**
 * @returns {CampaignExecutionRepository}
 */
export function createEmptyCampaignExecutionRepository() {
  /** @type {object[]} */
  const rows = [];
  return {
    findAll() {
      return rows.map((row) => ({ ...row }));
    },
    findById(id) {
      return rows.find((row) => String(row.id) === String(id)) || null;
    },
    findByCampaignId(campaignId) {
      return rows.filter((row) => String(row.campaignId) === String(campaignId));
    },
    nextRunNumber(campaignId) {
      const list = rows.filter((row) => String(row.campaignId) === String(campaignId));
      if (!list.length) return 1;
      return Math.max(...list.map((row) => Number(row.runNumber) || 0)) + 1;
    },
    save(execution) {
      if (!execution?.id) return null;
      const index = rows.findIndex((row) => String(row.id) === String(execution.id));
      if (index === -1) rows.unshift({ ...execution });
      else rows[index] = { ...execution };
      return { ...execution };
    },
  };
}
