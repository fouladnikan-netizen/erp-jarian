import { Router } from 'express';
import { asyncHandler } from '../middleware/errors.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import * as organizationIdentityService from '../services/organizationIdentityService.js';

const router = Router();

router.use(requireAuth);

// Live document surfaces need the singleton; any authenticated session may GET.
// Mutations stay admin-only (same capability as correspondence-type writes).
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const organizationIdentity = await organizationIdentityService.getOrganizationIdentity();
    res.json({ organizationIdentity });
  }),
);

router.get(
  '/logo',
  asyncHandler(async (_req, res) => {
    const logo = await organizationIdentityService.getOrganizationLogo();
    res.json({ logo });
  }),
);

router.put(
  '/',
  requirePermission('users:admin'),
  asyncHandler(async (req, res) => {
    const organizationIdentity = await organizationIdentityService.putOrganizationIdentity(
      req.body,
      req.auth.userId,
    );
    res.json({ organizationIdentity });
  }),
);

router.put(
  '/logo',
  requirePermission('users:admin'),
  asyncHandler(async (req, res) => {
    const organizationIdentity = await organizationIdentityService.putOrganizationLogo(
      req.body,
      req.auth.userId,
    );
    res.json({ organizationIdentity });
  }),
);

export default router;
