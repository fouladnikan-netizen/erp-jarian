/**
 * Legacy AudienceRef helpers — prefer AudienceDefinition.
 * Kept for transitional imports; delegates to AudienceDefinition.
 */

import {
  AUDIENCE_SOURCE_TYPE,
  createAudienceDefinition,
  normalizeAudienceDefinition,
} from './audienceDefinition';
import { AUDIENCE_SOURCE } from './campaign.constants';

/**
 * @deprecated Use createAudienceDefinition
 * @param {string} [source]
 */
export function createEmptyAudienceRef(source = AUDIENCE_SOURCE.KANOON_CONTACTS) {
  const sourceType = source === AUDIENCE_SOURCE.OFOGH_LEADS
    ? AUDIENCE_SOURCE_TYPE.LEAD
    : AUDIENCE_SOURCE_TYPE.CONTACT;
  return createAudienceDefinition({
    name: 'مخاطب',
    sourceType,
    filters: {},
  });
}

/**
 * @deprecated Use normalizeAudienceDefinition
 * @param {unknown} input
 */
export function normalizeAudienceRef(input) {
  if (!input || typeof input !== 'object') return null;
  return normalizeAudienceDefinition(input);
}
