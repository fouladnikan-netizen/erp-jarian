import { Router } from 'express';
import { asyncHandler } from '../middleware/errors.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import * as correspondenceService from '../services/correspondenceService.js';

const router = Router();

router.use(requireAuth);

router.get(
  '/',
  requirePermission('correspondence:read'),
  asyncHandler(async (req, res) => {
    const items = await correspondenceService.listCorrespondence({
      direction: req.query.direction,
      status: req.query.status,
      typeKey: req.query.typeKey,
      companyId: req.query.companyId,
      orderId: req.query.orderId,
      search: req.query.search,
      createdBy: req.query.createdBy,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      limit: req.query.limit,
      offset: req.query.offset,
    });
    res.json({ items });
  }),
);

router.get(
  '/:id',
  requirePermission('correspondence:read'),
  asyncHandler(async (req, res) => {
    const correspondence = await correspondenceService.getCorrespondence(req.params.id);
    res.json({ correspondence });
  }),
);

router.get(
  '/:id/attachments',
  requirePermission('correspondence:read'),
  asyncHandler(async (req, res) => {
    const items = await correspondenceService.listAttachments(req.params.id);
    res.json({ items });
  }),
);

router.get(
  '/:id/attachments/:attachmentId',
  requirePermission('correspondence:read'),
  asyncHandler(async (req, res) => {
    const attachment = await correspondenceService.getAttachment(req.params.id, req.params.attachmentId);
    res.json({ attachment });
  }),
);

router.post(
  '/',
  requirePermission('correspondence:write'),
  asyncHandler(async (req, res) => {
    const correspondence = await correspondenceService.createCorrespondence(req.body, req.auth.userId);
    res.status(201).json({ correspondence });
  }),
);

router.patch(
  '/:id',
  requirePermission('correspondence:write'),
  asyncHandler(async (req, res) => {
    const correspondence = await correspondenceService.updateCorrespondence(req.params.id, req.body, req.auth.userId);
    res.json({ correspondence });
  }),
);

router.post(
  '/:id/ai-rewrite',
  requirePermission('correspondence:write'),
  asyncHandler(async (req, res) => {
    const result = await correspondenceService.aiRewriteCorrespondence(req.params.id, req.body, req.auth.userId);
    res.json(result);
  }),
);

router.post(
  '/:id/finalize',
  requirePermission('correspondence:finalize'),
  asyncHandler(async (req, res) => {
    const correspondence = await correspondenceService.finalizeCorrespondence(req.params.id, req.body, req.auth.userId);
    res.json({ correspondence });
  }),
);

router.post(
  '/:id/attachments',
  requirePermission('correspondence:write'),
  asyncHandler(async (req, res) => {
    const attachment = await correspondenceService.addAttachment(req.params.id, req.body, req.auth.userId);
    res.status(201).json({ attachment });
  }),
);

router.delete(
  '/:id/attachments/:attachmentId',
  requirePermission('correspondence:write'),
  asyncHandler(async (req, res) => {
    const result = await correspondenceService.removeAttachment(req.params.id, req.params.attachmentId, req.auth.userId);
    res.json(result);
  }),
);

router.delete(
  '/:id',
  requirePermission('correspondence:write'),
  asyncHandler(async (req, res) => {
    const result = await correspondenceService.archiveCorrespondence(req.params.id, req.auth.userId);
    res.json(result);
  }),
);

export default router;
