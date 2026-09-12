import { Router } from 'express';
import { asyncHandler } from '../../../middleware/errors.js';
import { requireAuth, requirePermission } from '../../../middleware/auth.js';
import * as leadService from '../application/leadService.js';

const router = Router();

router.use(requireAuth);

router.get(
  '/company-matches',
  requirePermission('leads:read'),
  asyncHandler(async (req, res) => {
    const items = await leadService.findCompanyMatches(req.query.q, {
      limit: req.query.limit,
    });
    res.json({ items });
  }),
);

router.get(
  '/',
  requirePermission('leads:read'),
  asyncHandler(async (req, res) => {
    const items = await leadService.listLeads({
      q: req.query.q,
      status: req.query.status,
      leadSource: req.query.leadSource,
      convertedCompanyId: req.query.convertedCompanyId,
      createdBy: req.query.createdBy || (req.query.mine === '1' ? req.auth.userId : undefined),
      openOnly: req.query.openOnly === '1' || req.query.openOnly === 'true',
      limit: req.query.limit,
      offset: req.query.offset,
    });
    res.json({ items });
  }),
);

router.get(
  '/:id',
  requirePermission('leads:read'),
  asyncHandler(async (req, res) => {
    const lead = await leadService.getLead(req.params.id);
    res.json({ lead });
  }),
);

router.post(
  '/',
  requirePermission('leads:write'),
  asyncHandler(async (req, res) => {
    const lead = await leadService.createLead(req.body, req.auth.userId);
    res.status(201).json({ lead });
  }),
);

router.patch(
  '/:id',
  requirePermission('leads:write'),
  asyncHandler(async (req, res) => {
    const lead = await leadService.updateLead(req.params.id, req.body, req.auth.userId);
    res.json({ lead });
  }),
);

router.patch(
  '/:id/status',
  requirePermission('leads:write'),
  asyncHandler(async (req, res) => {
    const lead = await leadService.changeLeadStatus(req.params.id, req.body, req.auth.userId);
    res.json({ lead });
  }),
);

router.post(
  '/:id/archive',
  requirePermission('leads:write'),
  asyncHandler(async (req, res) => {
    const result = await leadService.archiveLead(req.params.id, req.auth.userId, req.body || {});
    res.json(result);
  }),
);

router.delete(
  '/:id',
  requirePermission('leads:write'),
  asyncHandler(async (req, res) => {
    const result = await leadService.archiveLead(req.params.id, req.auth.userId, req.body || {});
    res.json(result);
  }),
);

router.patch(
  '/:id/pipeline-stage',
  requirePermission('leads:write'),
  asyncHandler(async (req, res) => {
    const { moveLeadToStage } = await import('../application/leadPipelineService.js');
    const lead = await moveLeadToStage(
      req.params.id,
      req.body?.stageId || req.body?.pipelineStageId,
      req.auth.userId,
    );
    res.json({ lead });
  }),
);

router.post(
  '/:id/convert',
  requirePermission('leads:convert'),
  asyncHandler(async (req, res) => {
    const result = await leadService.convertLeadToCompany({
      leadId: req.params.id,
      nationalId: req.body?.nationalId,
      actorId: req.auth.userId,
      requestId: req.requestId || null,
    });
    res.json(result);
  }),
);

export default router;
