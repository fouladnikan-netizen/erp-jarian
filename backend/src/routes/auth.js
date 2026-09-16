import { Router } from 'express';
import { asyncHandler } from '../middleware/errors.js';
import { requireAuth } from '../middleware/auth.js';
import * as authService from '../services/authService.js';
import * as authLifecycle from '../services/authLifecycleService.js';

const router = Router();

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);
    res.json(result);
  }),
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await authService.me(req.auth.userId);
    res.json({ user });
  }),
);

router.get(
  '/invitation',
  asyncHandler(async (req, res) => {
    const result = await authLifecycle.peekInvitation(req.query.token);
    res.json(result);
  }),
);

router.post(
  '/set-password',
  asyncHandler(async (req, res) => {
    const result = await authLifecycle.setPasswordWithToken(req.body);
    res.json(result);
  }),
);

router.post(
  '/forgot-password',
  asyncHandler(async (req, res) => {
    const result = await authLifecycle.requestPasswordReset(req.body);
    res.json(result);
  }),
);

router.post(
  '/forgot-password/verify',
  asyncHandler(async (req, res) => {
    const result = await authLifecycle.verifyPasswordResetOtp(req.body);
    res.json(result);
  }),
);

export default router;
