/**
 * Linka integration configuration — credentials from ENV only.
 *
 * Contract verified 2026-08-27 against production HTTPS:
 *   POST /Api/V1/Auth/Login
 *   GET  /API/V1/CompanyBaseInfo?nationalCode=
 * Auth: username/password → JWT (Bearer). No x-key. LINKA_API_KEY deprecated.
 *
 * Phase 2 (wired via enrichCompanyFromLinka):
 *   GET /API/V1/CompanyPerson?NationalCode=&PageIndex=
 *   GET /API/V1/Gazette?NationalCode=&PageIndex=
 */

import { config } from '../../config.js';

/** Verified Login + CompanyBaseInfo request/response shapes (2026-08-27). */
export const LINKA_CONTRACT_DOCUMENTED = true;

export const LINKA_DEFAULT_BASE_URL = 'https://api.linka.ir';

/**
 * @typedef {Object} LinkaConfig
 * @property {boolean} enabled
 * @property {string|null} baseUrl
 * @property {string|null} username
 * @property {string|null} password
 * @property {string|null} apiKeyDeprecated
 * @property {number} timeoutMs
 * @property {number} maxRetries
 * @property {boolean} isProductionMode
 * @property {boolean} contractReady
 */

/**
 * @returns {LinkaConfig}
 */
export function loadLinkaConfig() {
  const provider = String(process.env.COMPANY_IDENTITY_PROVIDER || '').trim().toLowerCase();
  const nodeEnv = config.nodeEnv || 'development';
  const isProductionMode = nodeEnv === 'production';

  const baseUrl = String(process.env.LINKA_BASE_URL || '').trim() || null;
  const username = String(process.env.LINKA_USERNAME || '').trim() || null;
  const password = String(process.env.LINKA_PASSWORD || '').trim() || null;
  /** @deprecated Prefer LINKA_USERNAME / LINKA_PASSWORD login JWT */
  const apiKeyDeprecated = String(process.env.LINKA_API_KEY || '').trim() || null;
  const timeoutMs = Number(process.env.LINKA_TIMEOUT_MS || 8000);
  const maxRetries = Number(process.env.LINKA_MAX_RETRIES ?? 1);

  const hasCredentials = Boolean(username && password);
  const useLinka = provider === 'linka'
    || (provider !== 'mock' && isProductionMode && (baseUrl || hasCredentials));

  return {
    enabled: useLinka,
    baseUrl,
    username,
    password,
    apiKeyDeprecated,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 8000,
    maxRetries: Number.isFinite(maxRetries) && maxRetries >= 0 ? Math.min(maxRetries, 2) : 1,
    isProductionMode,
    contractReady: LINKA_CONTRACT_DOCUMENTED && Boolean(baseUrl && hasCredentials),
  };
}

/**
 * Production guard — refuse silent mock fallback when linka provider selected without config.
 * @returns {{ ok: true } | { ok: false, errorCode: string, message: string }}
 */
export function assertLinkaProductionReady() {
  const cfg = loadLinkaConfig();
  if (!cfg.enabled) {
    return { ok: true };
  }
  if (!cfg.baseUrl || !cfg.username || !cfg.password) {
    return {
      ok: false,
      errorCode: 'COMPANY_IDENTITY_PROVIDER_UNAVAILABLE',
      message: 'پیکربندی Linka ناقص است (LINKA_BASE_URL / LINKA_USERNAME / LINKA_PASSWORD).',
    };
  }
  if (!cfg.contractReady) {
    return {
      ok: false,
      errorCode: 'COMPANY_IDENTITY_CONTRACT_REQUIRED',
      message: 'قرارداد HTTP Linka در repo مستند نشده — Production integration مسدود است.',
    };
  }
  return { ok: true };
}

export default { loadLinkaConfig, assertLinkaProductionReady, LINKA_CONTRACT_DOCUMENTED, LINKA_DEFAULT_BASE_URL };
