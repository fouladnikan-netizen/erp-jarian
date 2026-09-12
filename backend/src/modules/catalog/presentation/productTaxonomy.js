import { Router } from 'express';
import { asyncHandler } from '../../../middleware/errors.js';
import { requireAuth, requirePermission } from '../../../middleware/auth.js';
import * as taxonomyService from '../application/productTaxonomyService.js';

const router = Router();
router.use(requireAuth);

// ---- Tree (master-detail navigation) ----
router.get('/tree', requirePermission('products:read'), asyncHandler(async (req, res) => {
  const includeInactive = req.query.includeInactive !== 'false';
  res.json({ tree: await taxonomyService.getTaxonomyTree({ includeInactive }) });
}));

// ---- Groups ----
router.get('/groups', requirePermission('products:read'), asyncHandler(async (req, res) => {
  const includeInactive = req.query.includeInactive !== 'false';
  res.json({ items: await taxonomyService.listGroups({ includeInactive }) });
}));
router.get('/groups/:id', requirePermission('products:read'), asyncHandler(async (req, res) => {
  res.json({ group: await taxonomyService.getGroup(req.params.id) });
}));
router.post('/groups', requirePermission('products:manage-taxonomy'), asyncHandler(async (req, res) => {
  res.status(201).json({ group: await taxonomyService.createGroup(req.body, req.auth.userId) });
}));
router.patch('/groups/:id', requirePermission('products:manage-taxonomy'), asyncHandler(async (req, res) => {
  res.json({ group: await taxonomyService.updateGroup(req.params.id, req.body, req.auth.userId) });
}));
router.delete('/groups/:id', requirePermission('products:manage-taxonomy'), asyncHandler(async (req, res) => {
  res.json(await taxonomyService.deleteGroup(req.params.id, req.auth.userId));
}));

// ---- Categories ----
router.get('/categories', requirePermission('products:read'), asyncHandler(async (req, res) => {
  const includeInactive = req.query.includeInactive !== 'false';
  res.json({ items: await taxonomyService.listCategories({ groupId: req.query.groupId || null, includeInactive }) });
}));
router.get('/categories/:id', requirePermission('products:read'), asyncHandler(async (req, res) => {
  res.json({ category: await taxonomyService.getCategory(req.params.id) });
}));
router.post('/categories', requirePermission('products:manage-taxonomy'), asyncHandler(async (req, res) => {
  res.status(201).json({ category: await taxonomyService.createCategory(req.body, req.auth.userId) });
}));
router.patch('/categories/:id', requirePermission('products:manage-taxonomy'), asyncHandler(async (req, res) => {
  res.json({ category: await taxonomyService.updateCategory(req.params.id, req.body, req.auth.userId) });
}));
router.delete('/categories/:id', requirePermission('products:manage-taxonomy'), asyncHandler(async (req, res) => {
  res.json(await taxonomyService.deleteCategory(req.params.id, req.auth.userId));
}));

// ---- Product Types ----
router.get('/types', requirePermission('products:read'), asyncHandler(async (req, res) => {
  const includeInactive = req.query.includeInactive !== 'false';
  res.json({ items: await taxonomyService.listTypes({ categoryId: req.query.categoryId || null, includeInactive }) });
}));
router.get('/types/:id', requirePermission('products:read'), asyncHandler(async (req, res) => {
  res.json({ productType: await taxonomyService.getType(req.params.id) });
}));
router.post('/types', requirePermission('products:manage-taxonomy'), asyncHandler(async (req, res) => {
  res.status(201).json({ productType: await taxonomyService.createType(req.body, req.auth.userId) });
}));
router.patch('/types/:id', requirePermission('products:manage-taxonomy'), asyncHandler(async (req, res) => {
  res.json({ productType: await taxonomyService.updateType(req.params.id, req.body, req.auth.userId) });
}));
router.delete('/types/:id', requirePermission('products:manage-taxonomy'), asyncHandler(async (req, res) => {
  res.json(await taxonomyService.deleteType(req.params.id, req.auth.userId));
}));

export default router;
