import { Router } from 'express';
import { asyncHandler } from '../middleware/errors.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import * as rbacService from '../services/rbacService.js';

const router = Router();

router.use(requireAuth);
router.use(requirePermission('users:admin'));

router.get(
  '/permissions',
  asyncHandler(async (_req, res) => {
    const permissions = await rbacService.listPermissions();
    res.json({ permissions });
  }),
);

router.get(
  '/roles',
  asyncHandler(async (_req, res) => {
    const roles = await rbacService.listRoles();
    res.json({ roles });
  }),
);

router.post(
  '/roles',
  asyncHandler(async (req, res) => {
    const role = await rbacService.createRole(req.body, req.auth.userId);
    res.status(201).json({ role });
  }),
);

router.get(
  '/roles/:roleCode/users',
  asyncHandler(async (req, res) => {
    const users = await rbacService.listRoleUsers(req.params.roleCode);
    res.json({ users });
  }),
);

router.get(
  '/roles/:roleCode/permissions',
  asyncHandler(async (req, res) => {
    const permissions = await rbacService.listRolePermissions(req.params.roleCode);
    res.json({ permissions });
  }),
);

router.put(
  '/roles/:roleCode/permissions',
  asyncHandler(async (req, res) => {
    const permissions = await rbacService.replaceRolePermissions(
      req.params.roleCode,
      req.body,
      req.auth.userId,
    );
    res.json({ permissions });
  }),
);

router.get(
  '/roles/:code',
  asyncHandler(async (req, res) => {
    const role = await rbacService.getRole(req.params.code);
    res.json({ role });
  }),
);

router.patch(
  '/roles/:code',
  asyncHandler(async (req, res) => {
    const result = await rbacService.updateRole(req.params.code, req.body, req.auth.userId);
    res.json(result);
  }),
);

export default router;
