import { Router } from 'express';
import { asyncHandler } from '../middleware/errors.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import * as companyService from '../services/companyService.js';

const router = Router();

router.use(requireAuth);

router.get(
  '/',
  requirePermission('companies:read'),
  asyncHandler(async (req, res) => {
    const items = await companyService.listCompanies({
      q: req.query.q,
      entityType: req.query.entityType,
      limit: req.query.limit,
      offset: req.query.offset,
    });
    res.json({ items });
  }),
);

router.post(
  '/from-identity',
  requirePermission('companies:write'),
  asyncHandler(async (req, res) => {
    const result = await companyService.createCompanyFromIdentity(
      {
        nationalId: req.body?.nationalId,
        entityType: req.body?.entityType,
        activityDomain: req.body?.activityDomain,
        requestId: req.requestId || null,
      },
      req.auth.userId,
    );
    res.status(result.created ? 201 : 200).json(result);
  }),
);

router.post(
  '/',
  requirePermission('companies:write'),
  asyncHandler(async (req, res) => {
    const company = await companyService.createCompany(req.body, req.auth.userId);
    res.status(201).json({ company });
  }),
);

router.get(
  '/:id',
  requirePermission('companies:read'),
  asyncHandler(async (req, res) => {
    const company = await companyService.getCompany(req.params.id);
    res.json({ company });
  }),
);

router.post(
  '/:id/enrich-from-linka',
  requirePermission('companies:write'),
  asyncHandler(async (req, res) => {
    const result = await companyService.enrichCompanyFromLinka(
      {
        companyId: req.params.id,
        requestId: req.requestId || null,
      },
      req.auth.userId,
    );
    res.json(result);
  }),
);

router.patch(
  '/:id',
  requirePermission('companies:write'),
  asyncHandler(async (req, res) => {
    const company = await companyService.updateCompany(req.params.id, req.body, req.auth.userId);
    res.json({ company });
  }),
);

router.post(
  '/:id/lifecycle/recompute',
  requirePermission('companies:write'),
  asyncHandler(async (req, res) => {
    const result = await companyService.recomputeCompanyLifecycle(
      req.params.id,
      req.body || {},
      req.auth.userId,
    );
    res.json(result);
  }),
);

router.delete(
  '/:id',
  requirePermission('companies:write'),
  asyncHandler(async (req, res) => {
    const result = await companyService.archiveCompany(req.params.id, req.auth.userId);
    res.json(result);
  }),
);

export default router;
