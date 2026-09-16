import { Router } from 'express';
import { asyncHandler } from '../middleware/errors.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import * as userService from '../services/userService.js';

const router = Router();

router.use(requireAuth);
router.use(requirePermission('users:admin'));

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const users = await userService.listUsers();
    res.json({ users });
  }),
);

router.get(
  '/meta/roles',
  asyncHandler(async (_req, res) => {
    const roles = await userService.listAssignableRoles();
    res.json({ roles });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = await userService.getUser(req.params.id);
    res.json({ user });
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const result = await userService.createUser(req.body, req.auth.userId);
    res.status(201).json({
      user: result.user,
      invitation: result.invitation,
    });
  }),
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = await userService.updateUser(req.params.id, req.body, req.auth.userId);
    res.json({ user });
  }),
);

router.post(
  '/:id/invitation',
  asyncHandler(async (req, res) => {
    const invitation = await userService.resendInvitation(req.params.id, req.auth.userId);
    const user = await userService.getUser(req.params.id);
    res.json({ ok: true, user, invitation });
  }),
);

router.post(
  '/:id/password',
  asyncHandler(async (req, res) => {
    const result = await userService.resetPassword(req.params.id, req.body, req.auth.userId);
    res.json(result);
  }),
);

export default router;
