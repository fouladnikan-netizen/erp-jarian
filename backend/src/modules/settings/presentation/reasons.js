import { Router } from 'express';
import { asyncHandler } from '../../../middleware/errors.js';
import { requireAuth } from '../../../middleware/auth.js';
import { listReasons, REASON_SCOPES } from '../domain/reasonRegistry.js';
import { DOCUMENT_CHROME_TAGLINE } from '../domain/documentChrome.js';

const router = Router();
router.use(requireAuth);

router.get('/reasons', asyncHandler(async (req, res) => {
  const scope = typeof req.query.scope === 'string' ? req.query.scope : undefined;
  const items = listReasons(scope);
  res.json({
    items,
    scopes: Object.values(REASON_SCOPES),
  });
}));

router.get('/document-chrome', asyncHandler(async (_req, res) => {
  res.json({
    tagline: DOCUMENT_CHROME_TAGLINE,
    organizationIdentityPath: '/api/v1/organization-identity',
  });
}));

export default router;
