#!/usr/bin/env node
/**
 * Linka Phase 2 contract probe — development only.
 *
 * Usage:
 *   node scripts/linka-phase2-probe.js <nationalId>
 *   npm run probe:linka-phase2 -- <nationalId>
 *
 * Calls (page 1):
 *   GET /API/V1/CompanyPerson?NationalCode=&PageIndex=1
 *   GET /API/V1/Gazette?NationalCode=&PageIndex=1
 *
 * Does not persist data. Redacts credentials/tokens from output.
 */
import '../src/config.js';
import {
  loginLinka,
  callLinkaHttp,
  clearLinkaTokenCache,
} from '../src/integrations/linka/linkaClient.js';
import { loadLinkaConfig, LINKA_DEFAULT_BASE_URL } from '../src/integrations/linka/linkaConfig.js';
import {
  classifyProviderError,
  userMessageForCode,
} from '../src/integrations/linka/linkaErrors.js';

/** Suppress linkaClient structured logs — probe prints its own JSON blocks. */
const origLog = console.log;
console.log = (...args) => {
  const first = args[0];
  if (typeof first === 'string' && first.startsWith('{"provider":"LINKA"')) return;
  origLog(...args);
};

const SENSITIVE_KEY_RE = /^(password|username|token|accesstoken|refreshtoken|authorization|jwt|apikey|secret|bearer)$/i;
const JWT_RE = /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/;

/**
 * @param {unknown} value
 * @param {number} depth
 */
function sanitize(value, depth = 0) {
  if (depth > 14) return '[MaxDepth]';
  if (value == null || typeof value !== 'object') {
    if (typeof value === 'string' && JWT_RE.test(value)) return '[REDACTED_JWT]';
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitize(item, depth + 1));
  }
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [key, val] of Object.entries(value)) {
    if (SENSITIVE_KEY_RE.test(key)) {
      out[key] = '[REDACTED]';
    } else {
      out[key] = sanitize(val, depth + 1);
    }
  }
  return out;
}

function joinUrl(baseUrl, path) {
  return `${String(baseUrl).replace(/\/+$/, '')}${path}`;
}

/**
 * @param {{ label: string, path: string, nationalId: string }} input
 */
async function probeEndpoint(input) {
  const cfg = loadLinkaConfig();
  const baseUrl = cfg.baseUrl || LINKA_DEFAULT_BASE_URL;
  const query = new URLSearchParams({
    NationalCode: input.nationalId,
    PageIndex: '1',
  });
  const url = `${joinUrl(baseUrl, input.path)}?${query.toString()}`;

  console.log(`\n=== ${input.label} ===`);
  console.log(`GET ${input.path}?NationalCode=***&PageIndex=1`);

  const login = await loginLinka({ requestId: `probe-${input.label}` });
  if (!login.ok) {
    const payload = {
      ok: false,
      httpStatus: login.status ?? null,
      errorCode: login.errorCode,
      message: userMessageForCode(login.errorCode),
      details: login.details ? sanitize(login.details) : null,
    };
    console.log(JSON.stringify(payload, null, 2));
    return { ok: false, label: input.label, result: payload };
  }

  async function doGet(accessToken) {
    return callLinkaHttp({
      url,
      requestId: `probe-${input.label}`,
      init: {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });
  }

  let http = await doGet(login.accessToken);

  if (!http.ok && http.status === 401) {
    clearLinkaTokenCache();
    const relogin = await loginLinka({ requestId: `probe-${input.label}`, force: true });
    if (relogin.ok) {
      http = await doGet(relogin.accessToken);
    }
  }

  if (!http.ok) {
    const errorCode = http.errorCode || classifyProviderError({ status: http.status });
    const payload = {
      ok: false,
      httpStatus: http.status ?? null,
      errorCode,
      message: userMessageForCode(errorCode),
      body: http.data ? sanitize(http.data) : null,
    };
    console.log(JSON.stringify(payload, null, 2));
    return { ok: false, label: input.label, result: payload, http };
  }

  const payload = {
    ok: true,
    httpStatus: http.status,
    body: sanitize(http.data),
  };
  console.log(JSON.stringify(payload, null, 2));
  return { ok: true, label: input.label, result: payload, data: http.data };
}

async function main() {
  const nationalId = String(process.argv[2] || '').replace(/\D/g, '');
  if (!nationalId || nationalId.length !== 11) {
    console.error('Usage: node scripts/linka-phase2-probe.js <11-digit nationalId>');
    process.exit(1);
  }

  const cfg = loadLinkaConfig();
  if (!cfg.baseUrl || !cfg.username || !cfg.password) {
    console.error('Linka credentials missing — set LINKA_BASE_URL, LINKA_USERNAME, LINKA_PASSWORD in backend/.env');
    process.exit(1);
  }

  console.log('Linka Phase 2 contract probe');
  console.log(`nationalId=${nationalId}`);
  console.log(`baseUrl=${cfg.baseUrl || LINKA_DEFAULT_BASE_URL}`);

  const companyPerson = await probeEndpoint({
    label: 'CompanyPerson',
    path: '/API/V1/CompanyPerson',
    nationalId,
  });

  const gazette = await probeEndpoint({
    label: 'Gazette',
    path: '/API/V1/Gazette',
    nationalId,
  });

  const allOk = companyPerson.ok && gazette.ok;
  process.exit(allOk ? 0 : 1);
}

main().catch((err) => {
  console.error(err?.message || String(err));
  process.exit(1);
});
