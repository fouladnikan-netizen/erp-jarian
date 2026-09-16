import { Router } from 'express';
import { asyncHandler } from '../middleware/errors.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import * as personaService from '../services/personaService.js';

const router = Router();

router.use(requireAuth);
router.use(requirePermission('users:admin'));

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const includeInactive = req.query.includeInactive !== 'false';
    const personas = await personaService.listPersonas({ includeInactive });
    res.json({ personas });
  }),
);

router.get(
  '/meta/roles',
  asyncHandler(async (_req, res) => {
    const roles = await personaService.listRoleOptions();
    res.json({ roles });
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const persona = await personaService.createPersona(req.body, req.auth.userId);
    res.status(201).json({ persona });
  }),
);

router.get(
  '/:code',
  asyncHandler(async (req, res) => {
    const persona = await personaService.getPersona(req.params.code);
    res.json({ persona });
  }),
);

router.patch(
  '/:code',
  asyncHandler(async (req, res) => {
    const persona = await personaService.updatePersona(
      req.params.code,
      req.body,
      req.auth.userId,
    );
    res.json({ persona });
  }),
);

router.post(
  '/:code/roles',
  asyncHandler(async (req, res) => {
    const persona = await personaService.attachRole(req.params.code, req.body, req.auth.userId);
    res.json({ persona });
  }),
);

router.delete(
  '/:code/roles/:roleCode',
  asyncHandler(async (req, res) => {
    const persona = await personaService.detachRole(
      req.params.code,
      req.params.roleCode,
      req.auth.userId,
    );
    res.json({ persona });
  }),
);

router.patch(
  '/:code/activate',
  asyncHandler(async (req, res) => {
    const persona = await personaService.activatePersona(req.params.code, req.auth.userId);
    res.json({ persona });
  }),
);

router.patch(
  '/:code/deactivate',
  asyncHandler(async (req, res) => {
    const persona = await personaService.deactivatePersona(req.params.code, req.auth.userId);
    res.json({ persona });
  }),
);

export default router;
