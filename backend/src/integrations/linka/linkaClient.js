/**
 * Linka HTTP client — Login JWT + CompanyBaseInfo lookup.
 * Timeout, limited retry, memory token cache, safe structured logging.
 * Contract verified 2026-08-27 (production HTTPS).
 */
import { loadLinkaConfig } from './linkaConfig.js';
import { classifyProviderError, COMPANY_IDENTITY_ERRORS } from './linkaErrors.js';

const RETRYABLE_STATUS = new Set([502, 503, 504]);
const LOGIN_PATH = '/Api/V1/Auth/Login';
const COMPANY_PATH = '/API/V1/CompanyBaseInfo';
const COMPANY_PERSON_PATH = '/API/V1/CompanyPerson';
const GAZETTE_PATH = '/API/V1/Gazette';

/** @type {{ accessToken: string|null, expiresAtMs: number }} */
let tokenCache = { accessToken: null, expiresAtMs: 0 };

/** Serialize login to avoid parallel isForce logins invalidating JWTs. */
/** @type {Promise<{ ok: boolean, accessToken?: string, errorCode?: string, status?: number, details?: unknown, fromCache?: boolean }>|null} */
let loginInFlight = null;

/**
 * @param {Record<string, unknown>} entry
 */
function logLinka(entry) {
  console.log(JSON.stringify({ provider: 'LINKA', ...entry }));
}

/**
 * Strip leading "bearer " so Authorization header is never "Bearer bearer …".
 * @param {unknown} raw
 * @returns {string}
 */
export function normalizeAccessToken(raw) {
  let token = String(raw || '').trim();
  if (/^bearer\s+/i.test(token)) {
    token = token.replace(/^bearer\s+/i, '').trim();
  }
  return token;
}

/**
 * Decode JWT payload `exp` without signature verification (cache lifecycle only).
 * @param {string} jwt
 * @returns {number|null} expiry epoch ms
 */
export function decodeJwtExpiryMs(jwt) {
  try {
    const parts = String(jwt || '').split('.');
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
    const json = Buffer.from(b64 + pad, 'base64').toString('utf8');
    const payload = JSON.parse(json);
    if (typeof payload.exp === 'number' && Number.isFinite(payload.exp)) {
      return payload.exp * 1000;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearLinkaTokenCache() {
  tokenCache = { accessToken: null, expiresAtMs: 0 };
}

function getCachedToken() {
  if (!tokenCache.accessToken) return null;
  if (tokenCache.expiresAtMs > 0 && Date.now() >= tokenCache.expiresAtMs - 30_000) {
    return null;
  }
  return tokenCache.accessToken;
}

function setCachedToken(accessToken) {
  const jwt = normalizeAccessToken(accessToken);
  const expMs = decodeJwtExpiryMs(jwt);
  tokenCache = {
    accessToken: jwt,
    // Conservative: if no exp, treat as short-lived (5 min) so we re-login often
    expiresAtMs: expMs || (Date.now() + 5 * 60 * 1000),
  };
  return jwt;
}

/**
 * @param {string} url
 * @param {RequestInit} init
 * @param {number} timeoutMs
 * @param {typeof fetch} fetchImpl
 */
async function fetchWithTimeout(url, init, timeoutMs, fetchImpl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err?.name === 'AbortError') {
      const timeoutErr = new Error('Linka request timeout');
      timeoutErr.code = 'LINKA_TIMEOUT';
      timeoutErr.name = 'AbortError';
      throw timeoutErr;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function shouldRetry(status, attempt, maxRetries) {
  if (attempt >= maxRetries) return false;
  if (status == null) return true;
  return RETRYABLE_STATUS.has(status) || status >= 500;
}

function joinUrl(baseUrl, path) {
  return `${String(baseUrl).replace(/\/+$/, '')}${path}`;
}

/**
 * Test / low-level HTTP helper with retry policy.
 * @param {{ url: string, init?: RequestInit, requestId?: string|null, fetchImpl?: typeof fetch }} input
 */
export async function callLinkaHttp(input) {
  const cfg = loadLinkaConfig();
  const fetchImpl = input.fetchImpl || globalThis.fetch;
  const started = Date.now();
  let attempt = 0;
  let lastStatus;

  while (attempt <= cfg.maxRetries) {
    try {
      const res = await fetchWithTimeout(
        input.url,
        {
          ...input.init,
          headers: {
            Accept: 'application/json',
            ...(input.init?.headers || {}),
          },
        },
        cfg.timeoutMs,
        fetchImpl,
      );
      lastStatus = res.status;
      const durationMs = Date.now() - started;

      let data = null;
      try {
        data = await res.json();
      } catch {
        if (res.ok) {
          logLinka({
            level: 'warn',
            operation: input.init?.method || 'GET',
            requestId: input.requestId || null,
            outcome: 'invalid_json',
            status: res.status,
            durationMs,
          });
          return { ok: false, errorCode: COMPANY_IDENTITY_ERRORS.INVALID_RESPONSE, status: res.status };
        }
      }

      if (res.ok) {
        logLinka({
          level: 'info',
          operation: input.init?.method || 'GET',
          requestId: input.requestId || null,
          outcome: 'success',
          status: res.status,
          durationMs,
        });
        return { ok: true, data, durationMs, status: res.status };
      }

      if (!shouldRetry(res.status, attempt, cfg.maxRetries)) {
        const errorCode = classifyProviderError({ status: res.status });
        logLinka({
          level: 'warn',
          operation: input.init?.method || 'GET',
          requestId: input.requestId || null,
          outcome: 'http_error',
          status: res.status,
          errorCode,
          durationMs,
        });
        return { ok: false, errorCode, status: res.status, data };
      }
    } catch (err) {
      const durationMs = Date.now() - started;
      if (!shouldRetry(null, attempt, cfg.maxRetries)) {
        const errorCode = classifyProviderError(err);
        logLinka({
          level: 'warn',
          operation: input.init?.method || 'GET',
          requestId: input.requestId || null,
          outcome: 'network_error',
          errorCode,
          durationMs,
        });
        return { ok: false, errorCode, status: lastStatus };
      }
    }
    attempt += 1;
  }

  return { ok: false, errorCode: COMPANY_IDENTITY_ERRORS.PROVIDER_UNAVAILABLE, status: lastStatus };
}

/**
 * @param {{ requestId?: string|null, fetchImpl?: typeof fetch, force?: boolean }} [input]
 */
export async function loginLinka(input = {}) {
  // One login at a time — Linka isForce invalidates concurrent sibling tokens.
  if (loginInFlight) {
    const inFlight = await loginInFlight;
    if (!input.force && inFlight?.ok) {
      return inFlight;
    }
    // force (re-login after 401): wait for sibling to finish, then continue
  }
  loginInFlight = doLoginLinka(input).finally(() => {
    loginInFlight = null;
  });
  return loginInFlight;
}

/**
 * @param {{ requestId?: string|null, fetchImpl?: typeof fetch, force?: boolean }} [input]
 */
async function doLoginLinka(input = {}) {
  const cfg = loadLinkaConfig();
  const started = Date.now();
  const requestId = input.requestId || null;

  if (!cfg.baseUrl || !cfg.username || !cfg.password) {
    logLinka({
      level: 'error',
      operation: 'login',
      requestId,
      outcome: 'config_missing',
      durationMs: Date.now() - started,
    });
    return { ok: false, errorCode: COMPANY_IDENTITY_ERRORS.PROVIDER_UNAVAILABLE };
  }

  if (!input.force) {
    const cached = getCachedToken();
    if (cached) {
      return { ok: true, accessToken: cached, fromCache: true };
    }
  }

  const http = await callLinkaHttp({
    url: joinUrl(cfg.baseUrl, LOGIN_PATH),
    requestId,
    fetchImpl: input.fetchImpl,
    init: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: cfg.username,
        password: cfg.password,
        refresh: null,
        isForce: true,
        captchaCode: null,
      }),
    },
  });

  if (!http.ok) {
    return { ok: false, errorCode: http.errorCode, status: http.status };
  }

  const body = http.data;
  if (!body || body.success !== true) {
    const first = Array.isArray(body?.errors) ? body.errors[0] : null;
    const code = first?.code === 1005
      ? COMPANY_IDENTITY_ERRORS.PROVIDER_AUTH_FAILED
      : COMPANY_IDENTITY_ERRORS.PROVIDER_AUTH_FAILED;
    logLinka({
      level: 'warn',
      operation: 'login',
      requestId,
      outcome: 'login_rejected',
      providerCode: first?.code ?? null,
      durationMs: Date.now() - started,
    });
    return {
      ok: false,
      errorCode: code,
      details: { providerCode: first?.code ?? null },
    };
  }

  const rawToken = body?.data?.token?.accessToken;
  if (!rawToken) {
    return { ok: false, errorCode: COMPANY_IDENTITY_ERRORS.INVALID_RESPONSE };
  }

  const accessToken = setCachedToken(rawToken);
  logLinka({
    level: 'info',
    operation: 'login',
    requestId,
    outcome: 'success',
    durationMs: Date.now() - started,
  });
  return { ok: true, accessToken, fromCache: false };
}

/**
 * Company base-info lookup by national code (company national id).
 * @param {{ nationalId: string, requestId?: string|null, fetchImpl?: typeof fetch }} input
 */
export async function callLinkaLookup(input) {
  const cfg = loadLinkaConfig();
  const started = Date.now();
  const requestId = input.requestId || null;
  const nationalId = String(input.nationalId || '').replace(/\D/g, '');

  if (!cfg.baseUrl || !cfg.username || !cfg.password) {
    logLinka({
      level: 'error',
      operation: 'lookup',
      requestId,
      outcome: 'config_missing',
      durationMs: Date.now() - started,
    });
    return { ok: false, errorCode: COMPANY_IDENTITY_ERRORS.PROVIDER_UNAVAILABLE };
  }

  const login = await loginLinka({ requestId, fetchImpl: input.fetchImpl });
  if (!login.ok) {
    return { ok: false, errorCode: login.errorCode, status: login.status, details: login.details };
  }

  const url = `${joinUrl(cfg.baseUrl, COMPANY_PATH)}?nationalCode=${encodeURIComponent(nationalId)}`;

  async function doLookup(accessToken) {
    return callLinkaHttp({
      url,
      requestId,
      fetchImpl: input.fetchImpl,
      init: {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });
  }

  let http = await doLookup(login.accessToken);

  // Controlled single re-login on 401 — no loop
  if (!http.ok && http.status === 401) {
    clearLinkaTokenCache();
    const relogin = await loginLinka({ requestId, fetchImpl: input.fetchImpl, force: true });
    if (!relogin.ok) {
      return { ok: false, errorCode: relogin.errorCode, status: relogin.status };
    }
    http = await doLookup(relogin.accessToken);
  }

  if (!http.ok) {
    return { ok: false, errorCode: http.errorCode, status: http.status };
  }

  const body = http.data;
  if (!body || body.success !== true || !body.data) {
    const first = Array.isArray(body?.errors) ? body.errors[0] : null;
    logLinka({
      level: 'warn',
      operation: 'lookup',
      requestId,
      outcome: 'provider_rejected',
      providerCode: first?.code ?? null,
      durationMs: Date.now() - started,
    });
    if (!body?.data && body?.success === false) {
      return {
        ok: false,
        errorCode: COMPANY_IDENTITY_ERRORS.NOT_FOUND,
        details: { providerCode: first?.code ?? null },
      };
    }
    return {
      ok: false,
      errorCode: COMPANY_IDENTITY_ERRORS.INVALID_RESPONSE,
      details: { providerCode: first?.code ?? null },
    };
  }

  return {
    ok: true,
    data: body,
    durationMs: Date.now() - started,
  };
}

/**
 * Authenticated GET with query + single 401 re-login.
 * @param {{ path: string, query: Record<string, string>, requestId?: string|null, fetchImpl?: typeof fetch }} input
 */
async function callLinkaAuthedGet(input) {
  const cfg = loadLinkaConfig();
  const requestId = input.requestId || null;

  if (!cfg.baseUrl || !cfg.username || !cfg.password) {
    return { ok: false, errorCode: COMPANY_IDENTITY_ERRORS.PROVIDER_UNAVAILABLE };
  }

  const login = await loginLinka({ requestId, fetchImpl: input.fetchImpl });
  if (!login.ok) {
    return { ok: false, errorCode: login.errorCode, status: login.status, details: login.details };
  }

  const qs = new URLSearchParams(input.query).toString();
  const url = `${joinUrl(cfg.baseUrl, input.path)}?${qs}`;

  async function doGet(accessToken) {
    return callLinkaHttp({
      url,
      requestId,
      fetchImpl: input.fetchImpl,
      init: {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    });
  }

  let http = await doGet(login.accessToken);
  if (!http.ok && http.status === 401) {
    clearLinkaTokenCache();
    const relogin = await loginLinka({ requestId, fetchImpl: input.fetchImpl, force: true });
    if (!relogin.ok) {
      return { ok: false, errorCode: relogin.errorCode, status: relogin.status };
    }
    http = await doGet(relogin.accessToken);
  }

  if (!http.ok) {
    return { ok: false, errorCode: http.errorCode, status: http.status, data: http.data };
  }

  return { ok: true, data: http.data, status: http.status };
}

/**
 * @param {{ nationalId: string, pageIndex?: number, requestId?: string|null, fetchImpl?: typeof fetch }} input
 */
export async function callLinkaCompanyPerson(input) {
  const nationalId = String(input.nationalId || '').replace(/\D/g, '');
  return callLinkaAuthedGet({
    path: COMPANY_PERSON_PATH,
    query: {
      NationalCode: nationalId,
      PageIndex: String(input.pageIndex || 1),
    },
    requestId: input.requestId,
    fetchImpl: input.fetchImpl,
  });
}

/**
 * @param {{ nationalId: string, pageIndex?: number, requestId?: string|null, fetchImpl?: typeof fetch }} input
 */
export async function callLinkaGazette(input) {
  const nationalId = String(input.nationalId || '').replace(/\D/g, '');
  return callLinkaAuthedGet({
    path: GAZETTE_PATH,
    query: {
      NationalCode: nationalId,
      PageIndex: String(input.pageIndex || 1),
    },
    requestId: input.requestId,
    fetchImpl: input.fetchImpl,
  });
}

export default {
  callLinkaLookup,
  callLinkaCompanyPerson,
  callLinkaGazette,
  callLinkaHttp,
  loginLinka,
  normalizeAccessToken,
  decodeJwtExpiryMs,
  clearLinkaTokenCache,
};
