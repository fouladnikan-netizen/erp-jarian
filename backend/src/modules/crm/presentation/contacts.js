import { Router } from 'express';
import { asyncHandler } from '../../../middleware/errors.js';
import { requireAuth, requirePermission } from '../../../middleware/auth.js';
import * as contactService from '../application/contactService.js';

const router = Router();

router.use(requireAuth);

router.get(
  '/company/:companyId',
  requirePermission('companies:read'),
  asyncHandler(async (req, res) => {
    const items = await contactService.listContactsByCompany(req.params.companyId);
    res.json({ items });
  }),
);

router.get(
  '/:id',
  requirePermission('companies:read'),
  asyncHandler(async (req, res) => {
    const contact = await contactService.getContact(req.params.id);
    res.json({ contact });
  }),
);

router.post(
  '/',
  requirePermission('companies:write'),
  asyncHandler(async (req, res) => {
    const result = await contactService.createContact(req.body, req.auth.userId);
    res.status(result.linkedExisting ? 200 : 201).json(result);
  }),
);

router.post(
  '/link',
  requirePermission('companies:write'),
  asyncHandler(async (req, res) => {
    const result = await contactService.linkContactToCompany(req.body, req.auth.userId);
    res.status(result.created ? 201 : 200).json(result);
  }),
);

router.patch(
  '/relationships/:relationshipId',
  requirePermission('companies:write'),
  asyncHandler(async (req, res) => {
    const relationship = await contactService.updateRelationship(
      req.params.relationshipId,
      req.body,
      req.auth.userId,
    );
    res.json({ relationship });
  }),
);

router.post(
  '/relationships/:relationshipId/end',
  requirePermission('companies:write'),
  asyncHandler(async (req, res) => {
    const result = await contactService.endRelationship(req.params.relationshipId, req.auth.userId);
    res.json(result);
  }),
);

router.patch(
  '/:id',
  requirePermission('companies:write'),
  asyncHandler(async (req, res) => {
    const contact = await contactService.updateContact(req.params.id, req.body, req.auth.userId);
    res.json({ contact });
  }),
);

export default router;
