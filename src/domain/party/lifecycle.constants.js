/**
 * Ofogh / Company lifecycle stages — shared business constants.
 * Opportunity is not a separate entity; it is Company + lifecycle_stage.
 * @see Docs/architecture/ENTITY_OWNERSHIP.md
 */

export const LIFECYCLE_STAGES = Object.freeze({
  COLD_LEAD: 'cold_lead',
  PITCHED: 'pitched',
  NURTURING: 'nurturing',
  SALES_QUALIFIED: 'sales_qualified',
  FIRST_TIME_BUYER: 'first_time_buyer',
  LOYAL: 'loyal',
  ARCHIVED: 'archived',
});

export const LIFECYCLE_STAGE_ORDER = Object.freeze([
  LIFECYCLE_STAGES.COLD_LEAD,
  LIFECYCLE_STAGES.PITCHED,
  LIFECYCLE_STAGES.NURTURING,
  LIFECYCLE_STAGES.SALES_QUALIFIED,
  LIFECYCLE_STAGES.FIRST_TIME_BUYER,
  LIFECYCLE_STAGES.LOYAL,
  LIFECYCLE_STAGES.ARCHIVED,
]);
