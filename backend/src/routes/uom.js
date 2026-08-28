import { Router } from 'express';
import { asyncHandler } from '../middleware/errors.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import * as uomService from '../services/uomService.js';

const router = Router();
router.use(requireAuth);

router.get('/', requirePermission('products:read'), asyncHandler(async (req, res) => {
  const includeInactive = req.query.includeInactive !== 'false';
  res.json({ items: await uomService.listUoms({ includeInactive }) });
}));
router.get('/:id', requirePermission('products:read'), asyncHandler(async (req, res) => {
  res.json({ uom: await uomService.getUom(req.params.id) });
}));
router.post('/', requirePermission('products:manage-taxonomy'), asyncHandler(async (req, res) => {
  res.status(201).json({ uom: await uomService.createUom(req.body, req.auth.userId) });
}));
router.patch('/:id', requirePermission('products:manage-taxonomy'), asyncHandler(async (req, res) => {
  res.json({ uom: await uomService.updateUom(req.params.id, req.body, req.auth.userId) });
}));

router.get('/:id/conversions', requirePermission('products:read'), asyncHandler(async (req, res) => {
  res.json({ items: await uomService.listConversions({ fromUomId: req.params.id }) });
}));
router.post('/conversions', requirePermission('products:manage-taxonomy'), asyncHandler(async (req, res) => {
  res.status(201).json({ conversion: await uomService.createConversion(req.body, req.auth.userId) });
}));

export default router;
