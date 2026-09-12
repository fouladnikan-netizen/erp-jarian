import { Router } from 'express';
import { asyncHandler } from '../../../middleware/errors.js';
import { requireAuth, requirePermission } from '../../../middleware/auth.js';
import * as activityService from '../application/activityService.js';

const router = Router();

router.use(requireAuth);

function actorAuth(req) {
  return { userId: req.auth.userId, roles: req.user?.roles || req.auth.roles || [] };
}

router.get(
  '/',
  requirePermission('activities:read'),
  asyncHandler(async (req, res) => {
    const items = await activityService.listActivities({
      subjectType: req.query.subjectType,
      subjectId: req.query.subjectId,
      status: req.query.status,
      limit: req.query.limit,
      offset: req.query.offset,
    });
    res.json({ items });
  }),
);

router.get(
  '/:id',
  requirePermission('activities:read'),
  asyncHandler(async (req, res) => {
    const activity = await activityService.getActivity(req.params.id);
    res.json({ activity });
  }),
);

router.post(
  '/',
  requirePermission('activities:write'),
  asyncHandler(async (req, res) => {
    const activity = await activityService.createActivity(req.body, actorAuth(req));
    res.status(201).json({ activity });
  }),
);

router.patch(
  '/:id',
  requirePermission('activities:write'),
  asyncHandler(async (req, res) => {
    const activity = await activityService.updateActivity(
      req.params.id,
      req.body,
      actorAuth(req),
    );
    res.json({ activity });
  }),
);

router.patch(
  '/:id/complete',
  requirePermission('activities:write'),
  asyncHandler(async (req, res) => {
    const activity = await activityService.completeActivity(req.params.id, actorAuth(req));
    res.json({ activity });
  }),
);

router.delete(
  '/:id',
  requirePermission('activities:write'),
  asyncHandler(async (req, res) => {
    const result = await activityService.archiveActivity(req.params.id, actorAuth(req));
    res.json(result);
  }),
);

export default router;
