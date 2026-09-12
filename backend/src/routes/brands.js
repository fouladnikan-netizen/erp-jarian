import { Router } from 'express';
import { asyncHandler } from '../middleware/errors.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import * as brandService from '../services/brandService.js';

const router = Router();
router.use(requireAuth);

router.get('/', requirePermission('products:read'), asyncHandler(async (req, res) => {
  const includeInactive = req.query.includeInactive !== 'false';
  res.json({ items: await brandService.listBrands({ includeInactive }) });
}));
router.get('/:id', requirePermission('products:read'), asyncHandler(async (req, res) => {
  res.json({ brand: await brandService.getBrand(req.params.id) });
}));
router.post('/check-duplicate', requirePermission('products:read'), asyncHandler(async (req, res) => {
  const result = await brandService.checkBrandDuplicate(req.body.brandName || '');
  res.json(result);
}));
router.post('/', requirePermission('products:manage-brands'), asyncHandler(async (req, res) => {
  res.status(201).json({ brand: await brandService.createBrand(req.body, req.auth.userId) });
}));
router.patch('/:id', requirePermission('products:manage-brands'), asyncHandler(async (req, res) => {
  res.json({ brand: await brandService.updateBrand(req.params.id, req.body, req.auth.userId) });
}));
router.delete('/:id', requirePermission('products:manage-brands'), asyncHandler(async (req, res) => {
  res.json(await brandService.deleteBrand(req.params.id, req.auth.userId));
}));

export default router;
