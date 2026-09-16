/**
 * AudienceDataPort — read-only ERP projections for segmentation.
 * Mowj never mutates company/order/finance/activity aggregates.
 */

/**
 * @typedef {object} CompanyAudienceProjection
 * @property {string} companyId
 * @property {string} [contactId]
 * @property {string|null} province
 * @property {string|null} city
 * @property {string|null} activityDomain
 * @property {string|null} personType
 * @property {number|null} registeredCapital
 * @property {string|null} behavioralStatus
 * @property {string|null} createdAt
 * @property {number|null} companyAgeDays
 * @property {string|null} leadSource
 * @property {string|null} lastContactAt
 * @property {string|null} lastActivityAt
 * @property {number} activityCount
 * @property {string|null} relationshipStatus
 * @property {number} orderCount
 * @property {number} totalPurchaseAmount
 * @property {number} totalPurchaseWeight
 * @property {string|null} firstPurchaseAt
 * @property {string|null} lastPurchaseAt
 * @property {string[]} purchasedProducts
 * @property {string[]} purchasedBrands
 * @property {boolean} isDebtor
 * @property {boolean} isCreditor
 * @property {number} accountBalance
 * @property {number} debtAmount
 * @property {boolean} hasOverdue
 * @property {string[]} orderStatuses
 * @property {string|null} latestDeliveryAt
 * @property {string[]} suppliers
 * @property {number} maxOrderAmount
 * @property {number} maxOrderWeight
 * @property {number} openOrderCount
 * @property {string|null} displayName
 */

/**
 * Person audience projection — company fields + ContactPerson attributes.
 * @typedef {CompanyAudienceProjection & {
 *   personId: string,
 *   contactPersonId: string,
 *   personGender: string|null,
 *   personPosition: string|null,
 *   personRelationType: string|null,
 *   personStatus: string|null,
 *   mobile?: string|null,
 * }} PersonAudienceProjection
 */

/**
 * @typedef {object} AudienceDataPort
 * @property {() => CompanyAudienceProjection[]} listCompanies
 * @property {() => PersonAudienceProjection[]} listRelatedPersons
 * @property {() => object[]} [listContacts]  legacy
 * @property {() => object[]} [listLeads]  legacy
 * @property {() => object[]} [listOrders]  legacy
 */

/**
 * @returns {AudienceDataPort}
 */
export function createEmptyAudiencePort() {
  return {
    listCompanies: () => [],
    listRelatedPersons: () => [],
    listContacts: () => [],
    listLeads: () => [],
    listOrders: () => [],
  };
}
