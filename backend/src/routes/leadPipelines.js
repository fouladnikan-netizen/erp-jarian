import { Router } from 'express';
import { asyncHandler } from '../middleware/errors.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import * as leadPipelineService from '../services/leadPipelineService.js';

const router = Router();

router.use(requireAuth);

/** GET /api/v1/lead-pipelines/me — ensure + return personal pipeline */
router.get(
  '/me',
  requirePermission('leads:read'),
  asyncHandler(async (req, res) => {
    const result = await leadPipelineService.ensurePersonalPipeline(req.auth.userId);
    res.json(result);
  }),
);

router.post(
  '/me/stages',
  requirePermission('leads:write'),
  asyncHandler(async (req, res) => {
    const result = await leadPipelineService.createStage(req.auth.userId, req.body);
    res.status(201).json(result);
  }),
);

router.patch(
  '/me/stages/:stageId',
  requirePermission('leads:write'),
  asyncHandler(async (req, res) => {
    const result = await leadPipelineService.renameStage(
      req.auth.userId,
      req.params.stageId,
      req.body,
    );
    res.json(result);
  }),
);

router.put(
  '/me/stages/reorder',
  requirePermission('leads:write'),
  asyncHandler(async (req, res) => {
    const result = await leadPipelineService.reorderStages(req.auth.userId, req.body);
    res.json(result);
  }),
);

router.delete(
  '/me/stages/:stageId',
  requirePermission('leads:write'),
  asyncHandler(async (req, res) => {
    const result = await leadPipelineService.deleteStage(
      req.auth.userId,
      req.params.stageId,
      req.body || {},
    );
    res.json(result);
  }),
);

export default router;
