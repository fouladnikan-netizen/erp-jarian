/**
 * Vitrin public contract for order-time Product offer settings (DDL-47).
 * Order forms consume these; they must not be defined per line.
 */
export {
  isCustomLengthAllowed,
  resolveProductOfferSettings,
  seedOfferSettingsFromType,
} from '../../../domain/productMaster/offerSettings.js';
