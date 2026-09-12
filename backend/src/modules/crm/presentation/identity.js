import { Router } from 'express';
import { asyncHandler } from '../../../middleware/errors.js';
import { requireAuth, requirePermission } from '../../../middleware/auth.js';
import * as identityMatchingService from '../application/identityMatchingService.js';

const router = Router();

router.use(requireAuth);

router.post(
  '/matches/company',
  requirePermission('companies:read'),
  asyncHandler(async (req, res) => {
    const result = await identityMatchingService.checkCompanyDuplicates(req.body || {}, {
      actorUserId: req.auth.userId,
      audit: req.body?.audit !== false,
      action: 'api_duplicate_check',
    });
    res.json(result);
  }),
);

router.post(
  '/matches/lead',
  requirePermission('leads:read'),
  asyncHandler(async (req, res) => {
    const result = await identityMatchingService.checkLeadDuplicates(req.body || {}, {
      actorUserId: req.auth.userId,
      audit: req.body?.audit !== false,
      action: 'api_duplicate_check',
    });
    res.json(result);
  }),
);

router.post(
  '/matches/contact',
  requirePermission('companies:read'),
  asyncHandler(async (req, res) => {
    const result = await identityMatchingService.checkContactDuplicates(req.body || {}, {
      actorUserId: req.auth.userId,
      audit: req.body?.audit !== false,
      action: 'api_duplicate_check',
    });
    res.json(result);
  }),
);

export default router;
