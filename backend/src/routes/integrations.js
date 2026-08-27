import { Router } from 'express';
import { asyncHandler } from '../middleware/errors.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { loadLinkaConfig, assertLinkaProductionReady } from '../integrations/linka/linkaConfig.js';
import { loginLinka, clearLinkaTokenCache } from '../integrations/linka/linkaClient.js';
import { userMessageForCode } from '../integrations/linka/linkaErrors.js';

const router = Router();

router.use(requireAuth);

/**
 * Linka integration status — no secrets; for Shirazeh admin UI.
 */
router.get(
  '/linka/status',
  requirePermission('users:admin'),
  asyncHandler(async (_req, res) => {
    const cfg = loadLinkaConfig();
    const provider = String(process.env.COMPANY_IDENTITY_PROVIDER || '').trim().toLowerCase() || 'mock';
    const ready = assertLinkaProductionReady();
    const configured = Boolean(cfg.baseUrl && cfg.username && cfg.password);

    res.json({
      provider,
      mode: cfg.enabled ? 'linka' : 'mock',
      configured,
      enabled: cfg.enabled,
      baseUrl: cfg.baseUrl,
      contractReady: cfg.contractReady,
      ready: cfg.enabled ? ready.ok : true,
      errorCode: cfg.enabled && !ready.ok ? ready.errorCode : null,
      message: cfg.enabled && !ready.ok
        ? ready.message
        : (cfg.enabled
          ? 'Linka از طریق backend/.env فعال است.'
          : 'حالت mock — COMPANY_IDENTITY_PROVIDER=linka و اعتبارنامه Linka را در backend/.env تنظیم کنید.'),
    });
  }),
);

/**
 * Test Linka login JWT — uses backend ENV credentials only.
 */
router.post(
  '/linka/test',
  requirePermission('users:admin'),
  asyncHandler(async (req, res) => {
    const cfg = loadLinkaConfig();
    if (!cfg.enabled) {
      return res.status(422).json({
        ok: false,
        error: 'COMPANY_IDENTITY_PROVIDER_UNAVAILABLE',
        message: 'Linka فعال نیست. در backend/.env مقدار COMPANY_IDENTITY_PROVIDER=linka و LINKA_USERNAME/LINKA_PASSWORD را تنظیم کنید.',
      });
    }

    const ready = assertLinkaProductionReady();
    if (!ready.ok) {
      return res.status(422).json({
        ok: false,
        error: ready.errorCode,
        message: ready.message,
      });
    }

    clearLinkaTokenCache();
    const result = await loginLinka({ requestId: req.requestId || null });
    if (!result?.ok) {
      const code = result?.errorCode || 'COMPANY_IDENTITY_PROVIDER_AUTH_FAILED';
      return res.status(422).json({
        ok: false,
        error: code,
        message: userMessageForCode(code) || result?.error || 'اتصال Linka ناموفق بود.',
      });
    }

    res.json({
      ok: true,
      message: 'اتصال به Linka برقرار شد.',
    });
  }),
);

export default router;
