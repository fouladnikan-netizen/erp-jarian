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

router.get(
  '/:id',
  requirePermission('companies:read'),
  asyncHandler(async (req, res) => {
    const company = await companyService.getCompany(req.params.id);
    res.json({ company });
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

router.patch(
  '/:id',
  requirePermission('companies:write'),
  asyncHandler(async (req, res) => {
    const company = await companyService.updateCompany(req.params.id, req.body, req.auth.userId);
    res.json({ company });
  }),
);

export default router;
