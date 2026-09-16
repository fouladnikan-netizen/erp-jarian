/**
 * AudienceSnapshot repository contract.
 */

/**
 * @typedef {object} AudienceSnapshotRepository
 * @property {(snapshot: object) => object|null} save
 * @property {(id: string) => object|null} findById
 * @property {(campaignId: string) => object[]} findByCampaignId
 */

/**
 * @returns {AudienceSnapshotRepository}
 */
export function createEmptyAudienceSnapshotRepository() {
  /** @type {Map<string, object>} */
  const map = new Map();
  return {
    save(snapshot) {
      if (!snapshot?.id) return null;
      map.set(String(snapshot.id), { ...snapshot });
      return { ...snapshot };
    },
    findById(id) {
      const row = map.get(String(id));
      return row ? { ...row } : null;
    },
    findByCampaignId(campaignId) {
      return [...map.values()].filter((row) => String(row.campaignId) === String(campaignId));
    },
  };
}
