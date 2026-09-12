import { Router } from 'express';
import { asyncHandler } from '../../../middleware/errors.js';
import { requireAuth, requirePermission } from '../../../middleware/auth.js';
import * as orderService from '../application/orderService.js';

const router = Router();

router.use(requireAuth);

router.get(
  '/',
  requirePermission('orders:read'),
  asyncHandler(async (req, res) => {
    const items = await orderService.listOrders({
      q: req.query.q,
      companyId: req.query.companyId,
      stageId: req.query.stageId,
      status: req.query.status,
      limit: req.query.limit,
      offset: req.query.offset,
    });
    res.json({ items });
  }),
);

router.get(
  '/:id',
  requirePermission('orders:read'),
  asyncHandler(async (req, res) => {
    const order = await orderService.getOrder(req.params.id);
    res.json({ order });
  }),
);

router.post(
  '/',
  requirePermission('orders:write'),
  asyncHandler(async (req, res) => {
    const order = await orderService.createOrder(req.body, req.auth.userId);
    res.status(201).json({ order });
  }),
);

router.patch(
  '/:id',
  requirePermission('orders:write'),
  asyncHandler(async (req, res) => {
    const order = await orderService.updateOrder(req.params.id, req.body, req.auth.userId);
    res.json({ order });
  }),
);

router.delete(
  '/:id',
  requirePermission('orders:write'),
  asyncHandler(async (req, res) => {
    const result = await orderService.archiveOrder(req.params.id, req.auth.userId);
    res.json(result);
  }),
);

export default router;
