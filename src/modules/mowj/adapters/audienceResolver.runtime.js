/**
 * Composition root for AudienceResolver (ERP port).
 */

import { createAudienceResolver } from '../domain/audienceResolver';
import { createErpAudiencePort } from './erpAudiencePort';

let defaultResolver = createAudienceResolver(createErpAudiencePort());

export function getDefaultAudienceResolver() {
  return defaultResolver;
}

/** @param {ReturnType<typeof createAudienceResolver>} resolver */
export function __setDefaultAudienceResolverForTests(resolver) {
  defaultResolver = resolver;
}

export function __resetDefaultAudienceResolver() {
  defaultResolver = createAudienceResolver(createErpAudiencePort());
}
