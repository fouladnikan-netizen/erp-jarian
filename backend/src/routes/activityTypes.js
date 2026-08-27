import { Router } from 'express';
import { asyncHandler } from '../middleware/errors.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import * as activityTypeService from '../services/activityTypeService.js';

const router = Router();

router.use(requireAuth);

// Read: anyone who can read Activities needs the type list for creation pickers.
router.get(
  '/',
  requirePermission('activities:read'),
  asyncHandler(async (req, res) => {
    const includeInactive = req.query.includeInactive !== 'false';
    const items = await activityTypeService.listActivityTypes({ includeInactive });
    res.json({ items });
  }),
);

router.get(
  '/:key',
  requirePermission('activities:read'),
  asyncHandler(async (req, res) => {
    const item = await activityTypeService.getActivityType(req.params.key);
    res.json({ activityType: item });
  }),
);

// Mutations: Shirazeh (settings) admin surface — reuse existing users:admin
// permission rather than inventing a parallel settings:write code.
router.post(
  '/',
  requirePermission('users:admin'),
  asyncHandler(async (req, res) => {
    const item = await activityTypeService.createActivityType(req.body, req.auth.userId);
    res.status(201).json({ activityType: item });
  }),
);

router.patch(
  '/:key',
  requirePermission('users:admin'),
  asyncHandler(async (req, res) => {
    const item = await activityTypeService.updateActivityType(req.params.key, req.body, req.auth.userId);
    res.json({ activityType: item });
  }),
);

router.patch(
  '/:key/activate',
  requirePermission('users:admin'),
  asyncHandler(async (req, res) => {
    const item = await activityTypeService.activateActivityType(req.params.key, req.auth.userId);
    res.json({ activityType: item });
  }),
);

router.patch(
  '/:key/deactivate',
  requirePermission('users:admin'),
  asyncHandler(async (req, res) => {
    const item = await activityTypeService.deactivateActivityType(req.params.key, req.auth.userId);
    res.json({ activityType: item });
  }),
);

export default router;
