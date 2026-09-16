import { Router } from 'express';
import { asyncHandler } from '../middleware/errors.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import * as organizationService from '../services/organizationService.js';

const router = Router();

router.use(requireAuth);
router.use(requirePermission('users:admin'));

router.get(
  '/tree',
  asyncHandler(async (_req, res) => {
    const snapshot = await organizationService.getSnapshot();
    res.json(snapshot);
  }),
);

router.put(
  '/tree',
  asyncHandler(async (req, res) => {
    const snapshot = await organizationService.replaceTree(req.body, req.auth.userId);
    res.json(snapshot);
  }),
);

router.get(
  '/units',
  asyncHandler(async (_req, res) => {
    const units = await organizationService.listUnits();
    res.json({ units });
  }),
);

router.post(
  '/units',
  asyncHandler(async (req, res) => {
    const unit = await organizationService.createUnit(req.body, req.auth.userId);
    res.status(201).json({ unit });
  }),
);

router.patch(
  '/units/:id',
  asyncHandler(async (req, res) => {
    const unit = await organizationService.updateUnit(req.params.id, req.body, req.auth.userId);
    res.json({ unit });
  }),
);

router.get(
  '/positions',
  asyncHandler(async (req, res) => {
    const positions = await organizationService.listPositions(req.query.unitId);
    res.json({ positions });
  }),
);

router.post(
  '/positions',
  asyncHandler(async (req, res) => {
    const position = await organizationService.createPosition(req.body, req.auth.userId);
    res.status(201).json({ position });
  }),
);

router.patch(
  '/positions/:id',
  asyncHandler(async (req, res) => {
    const position = await organizationService.updatePosition(req.params.id, req.body, req.auth.userId);
    res.json({ position });
  }),
);

router.get(
  '/assignments',
  asyncHandler(async (_req, res) => {
    const assignments = await organizationService.listAssignments();
    res.json({ assignments });
  }),
);

router.put(
  '/assignments',
  asyncHandler(async (req, res) => {
    const assignment = await organizationService.upsertAssignment(req.body, req.auth.userId);
    res.json({ assignment });
  }),
);

router.delete(
  '/assignments/:userId',
  asyncHandler(async (req, res) => {
    const result = await organizationService.removeAssignment(req.params.userId, req.auth.userId);
    res.json(result);
  }),
);

export default router;
