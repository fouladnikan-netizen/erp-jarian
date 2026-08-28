import { Router } from 'express';
import { asyncHandler } from '../middleware/errors.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import * as correspondenceTypeService from '../services/correspondenceTypeService.js';

const router = Router();

router.use(requireAuth);

// Read: anyone who can read Correspondence needs the type list for creation pickers.
router.get(
  '/',
  requirePermission('correspondence:read'),
  asyncHandler(async (req, res) => {
    const includeInactive = req.query.includeInactive !== 'false';
    const items = await correspondenceTypeService.listCorrespondenceTypes({ includeInactive });
    res.json({ items });
  }),
);

router.get(
  '/:key',
  requirePermission('correspondence:read'),
  asyncHandler(async (req, res) => {
    const item = await correspondenceTypeService.getCorrespondenceType(req.params.key);
    res.json({ correspondenceType: item });
  }),
);

// Mutations: Shirazeh (settings) admin surface — reuse existing users:admin
// permission rather than inventing a parallel settings:write code.
router.post(
  '/',
  requirePermission('users:admin'),
  asyncHandler(async (req, res) => {
    const item = await correspondenceTypeService.createCorrespondenceType(req.body, req.auth.userId);
    res.status(201).json({ correspondenceType: item });
  }),
);

router.patch(
  '/:key',
  requirePermission('users:admin'),
  asyncHandler(async (req, res) => {
    const item = await correspondenceTypeService.updateCorrespondenceType(req.params.key, req.body, req.auth.userId);
    res.json({ correspondenceType: item });
  }),
);

router.patch(
  '/:key/activate',
  requirePermission('users:admin'),
  asyncHandler(async (req, res) => {
    const item = await correspondenceTypeService.activateCorrespondenceType(req.params.key, req.auth.userId);
    res.json({ correspondenceType: item });
  }),
);

router.patch(
  '/:key/deactivate',
  requirePermission('users:admin'),
  asyncHandler(async (req, res) => {
    const item = await correspondenceTypeService.deactivateCorrespondenceType(req.params.key, req.auth.userId);
    res.json({ correspondenceType: item });
  }),
);

export default router;
