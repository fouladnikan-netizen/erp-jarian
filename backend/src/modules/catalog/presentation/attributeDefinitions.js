import { Router } from 'express';
import { asyncHandler } from '../../../middleware/errors.js';
import { requireAuth, requirePermission } from '../../../middleware/auth.js';
import * as attributeDefinitionService from '../application/attributeDefinitionService.js';

const router = Router();
router.use(requireAuth);

router.get('/', requirePermission('products:read'), asyncHandler(async (req, res) => {
  const includeInactive = req.query.includeInactive !== 'false';
  res.json({ items: await attributeDefinitionService.listDefinitions({ includeInactive }) });
}));
router.get('/:id', requirePermission('products:read'), asyncHandler(async (req, res) => {
  res.json({ attributeDefinition: await attributeDefinitionService.getDefinition(req.params.id) });
}));
router.post('/', requirePermission('products:manage-taxonomy'), asyncHandler(async (req, res) => {
  res.status(201).json({ attributeDefinition: await attributeDefinitionService.createDefinition(req.body, req.auth.userId) });
}));
router.patch('/:id', requirePermission('products:manage-taxonomy'), asyncHandler(async (req, res) => {
  res.json({ attributeDefinition: await attributeDefinitionService.updateDefinition(req.params.id, req.body, req.auth.userId) });
}));
router.delete('/:id', requirePermission('products:manage-taxonomy'), asyncHandler(async (req, res) => {
  res.json(await attributeDefinitionService.deleteDefinition(req.params.id, req.auth.userId));
}));

// Product Type <-> Attribute schema binding
router.get('/schema/:productTypeId', requirePermission('products:read'), asyncHandler(async (req, res) => {
  const includeInactive = req.query.includeInactive === 'true';
  res.json({ schema: await attributeDefinitionService.getEffectiveSchema(req.params.productTypeId, { includeInactive }) });
}));
router.post('/bindings', requirePermission('products:manage-taxonomy'), asyncHandler(async (req, res) => {
  res.status(201).json({ binding: await attributeDefinitionService.bindAttributeToType(req.body, req.auth.userId) });
}));
router.patch('/bindings/:id', requirePermission('products:manage-taxonomy'), asyncHandler(async (req, res) => {
  res.json({ binding: await attributeDefinitionService.updateBinding(req.params.id, req.body, req.auth.userId) });
}));
router.delete('/bindings/:id', requirePermission('products:manage-taxonomy'), asyncHandler(async (req, res) => {
  res.json(await attributeDefinitionService.deleteBinding(req.params.id, req.auth.userId));
}));

export default router;
