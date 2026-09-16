import { Router } from 'express';
import { asyncHandler } from '../../../middleware/errors.js';
import { requireAuth, requirePermission } from '../../../middleware/auth.js';
import * as taskService from '../application/taskService.js';

const router = Router();

router.use(requireAuth);

function actorAuth(req) {
  return { userId: req.auth.userId, roles: req.user?.roles || req.auth.roles || [] };
}

router.get(
  '/',
  requirePermission('tasks:read'),
  asyncHandler(async (req, res) => {
    const items = await taskService.listTasks({
      subjectType: req.query.subjectType,
      subjectId: req.query.subjectId,
      assignedTo: req.query.assignedTo,
      status: req.query.status,
      limit: req.query.limit,
      offset: req.query.offset,
    });
    res.json({ items });
  }),
);

router.get(
  '/:id',
  requirePermission('tasks:read'),
  asyncHandler(async (req, res) => {
    const task = await taskService.getTask(req.params.id);
    res.json({ task });
  }),
);

router.post(
  '/',
  requirePermission('tasks:write'),
  asyncHandler(async (req, res) => {
    const task = await taskService.createTask(req.body, req.auth.userId);
    res.status(201).json({ task });
  }),
);

router.patch(
  '/:id',
  requirePermission('tasks:write'),
  asyncHandler(async (req, res) => {
    const task = await taskService.updateTask(req.params.id, req.body, actorAuth(req));
    res.json({ task });
  }),
);

router.patch(
  '/:id/status',
  requirePermission('tasks:write'),
  asyncHandler(async (req, res) => {
    const task = await taskService.changeTaskStatus(req.params.id, req.body, actorAuth(req));
    res.json({ task });
  }),
);

router.patch(
  '/:id/complete',
  requirePermission('tasks:write'),
  asyncHandler(async (req, res) => {
    const task = await taskService.completeTask(req.params.id, actorAuth(req));
    res.json({ task });
  }),
);

router.delete(
  '/:id',
  requirePermission('tasks:write'),
  asyncHandler(async (req, res) => {
    const result = await taskService.archiveTask(req.params.id, actorAuth(req));
    res.json(result);
  }),
);

export default router;
