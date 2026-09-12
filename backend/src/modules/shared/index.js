/**
 * Cross-cutting kernel used by bounded contexts.
 * Not a dumping ground for domain rules.
 */
export {
  jsonRecord,
  jsonValue,
  attributeValueRecord,
  weightCoefficientRecord,
} from './schemas/jsonRecord.js';
export { createCorsOptions, isLocalDevEnv } from './http/corsOptions.js';
export { resolveJwtSecret, resolveJwtExpiresIn } from './http/jwtPolicy.js';
export { mountLegacyAiGateway, isLegacyAiGatewayEnabled } from './ai/legacyAiGateway.js';
