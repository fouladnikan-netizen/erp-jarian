/**
 * QUARANTINE — glued frontend AI rewrite router.
 *
 * Canonical file remains `src/server/api/aiRoutes.js` (Liara rewrite).
 * Core bootstrap must not import that tree inline. This adapter is the
 * only allowed mount point. Correspondence AI stays in the correspondence
 * module (`correspondenceAiService`) and is a separate, authenticated path.
 *
 * Disable with AI_ROUTES_ENABLED=0.
 */
import aiRoutes from '../../../../../src/server/api/aiRoutes.js';

export function isLegacyAiGatewayEnabled(env = process.env) {
  const flag = env.AI_ROUTES_ENABLED;
  if (flag === '0' || flag === 'false') return false;
  if (flag === '1' || flag === 'true') return true;
  return (env.NODE_ENV || 'development') !== 'production';
}

export function mountLegacyAiGateway(app) {
  if (!isLegacyAiGatewayEnabled()) return { mounted: false };
  app.use('/api/ai', aiRoutes);
  return { mounted: true, path: '/api/ai' };
}
