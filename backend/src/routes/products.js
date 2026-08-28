import { Router } from 'express';
import { asyncHandler } from '../middleware/errors.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import * as productService from '../services/productService.js';
import * as relationshipService from '../services/productRelationshipService.js';
import * as bulkImportService from '../services/productBulkImportService.js';

const router = Router();
router.use(requireAuth);

router.get('/', requirePermission('products:read'), asyncHandler(async (req, res) => {
  const {
    sku, text, groupId, categoryId, productTypeId, brandId, lifecycleStatus, includeInactive, limit,
    attributeCode, attributeValue, attributeFilters,
  } = req.query;
  // attributeFilters query param (when present) is a JSON-encoded array of
  // { code, value } pairs — lets the frontend combine multiple structured
  // attribute clauses (product contract "PRODUCT SEARCH" — e.g. thickness=2
  // AND width=1250) alongside the single attributeCode/attributeValue pair.
  let parsedAttributeFilters;
  if (attributeFilters) {
    try {
      parsedAttributeFilters = JSON.parse(attributeFilters);
    } catch {
      return res.status(400).json({ error: 'INVALID_ATTRIBUTE_FILTERS', message: 'پارامتر attributeFilters باید آرایه JSON معتبر باشد.' });
    }
  }
  const items = await productService.searchProducts({
    sku, text, groupId, categoryId, productTypeId, brandId, lifecycleStatus,
    includeInactive: includeInactive === 'true', limit,
    attributeCode, attributeValue, attributeFilters: parsedAttributeFilters,
  });
  res.json({ items });
}));

router.get('/:id', requirePermission('products:read'), asyncHandler(async (req, res) => {
  res.json({ product: await productService.getProduct(req.params.id) });
}));

router.post('/', requirePermission('products:write'), asyncHandler(async (req, res) => {
  const product = await productService.createProduct(req.body, req.auth.userId);
  res.status(201).json({ product });
}));

router.patch('/:id', requirePermission('products:write'), asyncHandler(async (req, res) => {
  const product = await productService.updateProduct(req.params.id, req.body, req.auth.userId);
  res.json({ product });
}));

router.patch('/:id/activate', requirePermission('products:lifecycle'), asyncHandler(async (req, res) => {
  res.json({ product: await productService.setLifecycle(req.params.id, 'ACTIVE', req.auth.userId) });
}));
router.patch('/:id/deactivate', requirePermission('products:lifecycle'), asyncHandler(async (req, res) => {
  res.json({ product: await productService.setLifecycle(req.params.id, 'INACTIVE', req.auth.userId) });
}));

// Relationships
router.get('/:id/relationships', requirePermission('products:read'), asyncHandler(async (req, res) => {
  res.json({ items: await relationshipService.listForProduct(req.params.id) });
}));
router.post('/relationships', requirePermission('products:manage-relationships'), asyncHandler(async (req, res) => {
  res.status(201).json({ relationship: await relationshipService.createRelationship(req.body, req.auth.userId) });
}));
router.patch('/relationships/:id/deactivate', requirePermission('products:manage-relationships'), asyncHandler(async (req, res) => {
  res.json({ relationship: await relationshipService.deactivateRelationship(req.params.id, req.auth.userId) });
}));

// Bulk import / mass update
router.post('/bulk-import', requirePermission('products:bulk-import'), asyncHandler(async (req, res) => {
  const batch = await bulkImportService.runBulkImport(req.body, req.auth.userId);
  res.status(201).json({ batch });
}));
router.get('/bulk-import/:id', requirePermission('products:bulk-import'), asyncHandler(async (req, res) => {
  const batch = await bulkImportService.getBatch(req.params.id);
  if (!batch) return res.status(404).json({ error: 'NOT_FOUND', message: 'دسته وارد شده یافت نشد.' });
  res.json({ batch });
}));
router.get('/bulk-import', requirePermission('products:bulk-import'), asyncHandler(async (req, res) => {
  res.json({ items: await bulkImportService.listBatches() });
}));

export default router;
