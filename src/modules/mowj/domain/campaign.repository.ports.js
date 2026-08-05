/**
 * CampaignRepository contract — domain-independent storage port.
 */

/**
 * @typedef {object} CampaignRepository
 * @property {() => object[]} findAll
 * @property {(id: string) => object|null} findById
 * @property {(campaign: object) => object|null} save
 * @property {() => object[]} [resetToSeed]
 */

/**
 * @returns {CampaignRepository}
 */
export function createEmptyCampaignRepository() {
  /** @type {Map<string, object>} */
  const map = new Map();
  return {
    findAll() {
      return [...map.values()].map((row) => ({ ...row }));
    },
    findById(id) {
      const row = map.get(String(id));
      return row ? { ...row } : null;
    },
    save(campaign) {
      if (!campaign?.id) return null;
      map.set(String(campaign.id), { ...campaign });
      return { ...campaign };
    },
    resetToSeed() {
      map.clear();
      return [];
    },
  };
}
