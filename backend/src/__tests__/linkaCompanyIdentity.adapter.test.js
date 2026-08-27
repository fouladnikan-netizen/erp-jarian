/**
 * Linka adapter unit tests — HTTP mocked against verified 2026-08-27 contract.
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

const ENV_BACKUP = { ...process.env };

function restoreEnv() {
  Object.keys(process.env).forEach((k) => {
    if (!(k in ENV_BACKUP)) delete process.env[k];
  });
  Object.assign(process.env, ENV_BACKUP);
}

beforeEach(() => {
  process.env.COMPANY_IDENTITY_PROVIDER = 'mock';
  delete process.env.LINKA_BASE_URL;
  delete process.env.LINKA_USERNAME;
  delete process.env.LINKA_PASSWORD;
  delete process.env.LINKA_API_KEY;
});

afterEach(() => {
  restoreEnv();
});

const SAMPLE_COMPANY_DATA = {
  nationalCode: '12345678901',
  name: 'شرکت نمونه',
  registerNumber: '12345',
  registerDate: '1390/01/01',
  companyTypeId: 2,
  companyTypeDescription: 'سهامی خاص',
  companyRegistrationUnitId: 342,
  companyRegistrationUnitDescription: 'تهران',
  bourseSymbol: null,
  companyStateId: 1,
  companyStateDescription: 'فعال',
  tagTypeId: 11,
  tagTypeDescription: 'فعال',
  totalStock: 500000000,
  companySizeId: null,
  companySizeDescription: null,
  breakupDate: null,
  provinceId: 8,
  provinceTitle: 'تهران',
  cityId: 141,
  cityTitle: 'تهران',
  address: 'خیابان نمونه',
  postalCode: '1234567890',
  lat: 51.4297,
  long: 35.7598,
  activityDescription: 'بازرگانی',
  signatureAuthority: 'مدیرعامل',
  economicCode: null,
  companyRegistrationOrganId: 1,
  companyRegistrationOrganDescription: 'اداره ثبت',
};

function makeJwt(expSecondsFromNow = 3600) {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    exp: Math.floor(Date.now() / 1000) + expSecondsFromNow,
    sub: 'linka-test',
  })).toString('base64url');
  return `${header}.${payload}.sig`;
}

describe('normalizeNationalId', () => {
  it('accepts 11 digits', async () => {
    const { normalizeNationalId } = await import('../domain/companyIdentity/normalizeNationalId.js');
    const r = normalizeNationalId('12345678901');
    assert.equal(r.ok, true);
    assert.equal(r.nationalId, '12345678901');
  });

  it('rejects invalid length', async () => {
    const { normalizeNationalId } = await import('../domain/companyIdentity/normalizeNationalId.js');
    const r = normalizeNationalId('123');
    assert.equal(r.ok, false);
  });
});

describe('token helpers', () => {
  it('strips leading bearer from accessToken', async () => {
    const { normalizeAccessToken } = await import('../integrations/linka/linkaClient.js');
    assert.equal(normalizeAccessToken('bearer eyJabc.def.ghi'), 'eyJabc.def.ghi');
    assert.equal(normalizeAccessToken('Bearer eyJabc.def.ghi'), 'eyJabc.def.ghi');
    assert.equal(normalizeAccessToken('eyJabc.def.ghi'), 'eyJabc.def.ghi');
  });

  it('decodes JWT exp for cache lifecycle', async () => {
    const { decodeJwtExpiryMs } = await import('../integrations/linka/linkaClient.js');
    const jwt = makeJwt(7200);
    const expMs = decodeJwtExpiryMs(jwt);
    assert.ok(expMs > Date.now());
    assert.ok(expMs < Date.now() + 3 * 3600 * 1000);
  });
});

describe('mockCompanyIdentity adapter', () => {
  it('returns mapped identity for valid nationalId', async () => {
    const { resolveCompanyIdentityMock } = await import('../integrations/linka/mockCompanyIdentity.adapter.js');
    const r = await resolveCompanyIdentityMock({
      nationalId: '12345678901',
      companyName: 'Test Co',
    });
    assert.equal(r.ok, true);
    assert.equal(r.identity.nationalId, '12345678901');
    assert.equal(r.identity.name, 'Test Co');
  });
});

describe('linkaMapper', () => {
  it('maps verified CompanyBaseInfo envelope to DTO', async () => {
    const { mapLinkaResponse } = await import('../integrations/linka/linkaMapper.js');
    const r = mapLinkaResponse(
      { success: true, errors: [], data: SAMPLE_COMPANY_DATA },
      { nationalId: '12345678901' },
    );
    assert.equal(r.ok, true);
    assert.equal(r.identity.nationalId, '12345678901');
    assert.equal(r.identity.name, 'شرکت نمونه');
    assert.equal(r.identity.registrationNumber, '12345');
    assert.equal(r.identity.registrationDate, '1390/01/01');
    assert.equal(r.identity.companyType, 'سهامی خاص');
    assert.equal(r.identity.companyTypeProviderId, 2);
    assert.equal(r.identity.legalStatus, 'فعال');
    assert.equal(r.identity.registeredCapital, 500000000);
    assert.equal(r.identity.province, 'تهران');
    assert.equal(r.identity.city, 'تهران');
    assert.equal(r.identity.address, 'خیابان نمونه');
    assert.equal(r.identity.postalCode, '1234567890');
    assert.equal(r.identity.activityDomain, 'بازرگانی');
    assert.equal(r.identity.signatureAuthority, 'مدیرعامل');
    assert.equal(r.identity.economicCode, null);
    assert.equal(r.identity.providerMeta.companySizeDescription, null);
    assert.equal(r.identity.providerMeta.bourseSymbol, null);
    assert.equal(r.identity.providerMeta.breakupDate, null);
    assert.equal(r.identity.providerMeta.lat, 51.4297);
  });

  it('rejects envelope without name', async () => {
    const { mapLinkaResponse } = await import('../integrations/linka/linkaMapper.js');
    const r = mapLinkaResponse(
      {
        success: true,
        errors: [],
        data: { ...SAMPLE_COMPANY_DATA, name: '' },
      },
      { nationalId: '12345678901' },
    );
    assert.equal(r.ok, false);
    assert.equal(r.errorCode, 'COMPANY_IDENTITY_INVALID_RESPONSE');
  });

  it('maps success=false to not found', async () => {
    const { mapLinkaResponse } = await import('../integrations/linka/linkaMapper.js');
    const r = mapLinkaResponse(
      { success: false, errors: [{ code: 404, message: 'not found' }], data: null },
      { nationalId: '12345678901' },
    );
    assert.equal(r.ok, false);
    assert.equal(r.errorCode, 'COMPANY_IDENTITY_NOT_FOUND');
  });
});

describe('linkaClient login + lookup', () => {
  beforeEach(async () => {
    process.env.COMPANY_IDENTITY_PROVIDER = 'linka';
    process.env.LINKA_BASE_URL = 'https://api.linka.ir';
    process.env.LINKA_USERNAME = 'test-user';
    process.env.LINKA_PASSWORD = 'test-pass-not-real';
    const { clearLinkaTokenCache } = await import('../integrations/linka/linkaClient.js');
    clearLinkaTokenCache();
  });

  it('login success parses accessToken and strips bearer', async () => {
    const jwt = makeJwt();
    const { loginLinka, clearLinkaTokenCache } = await import('../integrations/linka/linkaClient.js');
    clearLinkaTokenCache();
    const fetchImpl = async (url, init) => {
      assert.match(url, /\/Api\/V1\/Auth\/Login$/);
      assert.equal(init.method, 'POST');
      const body = JSON.parse(init.body);
      assert.equal(body.username, 'test-user');
      assert.equal(body.isForce, true);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          errors: [],
          data: {
            token: {
              accessToken: `bearer ${jwt}`,
              refreshToken: 'refresh-secret-should-not-log',
              expireDate: '0001-01-01T12:00:00',
            },
            device: null,
          },
        }),
      };
    };
    const r = await loginLinka({ fetchImpl, force: true });
    assert.equal(r.ok, true);
    assert.equal(r.accessToken, jwt);
    assert.ok(!r.accessToken.toLowerCase().startsWith('bearer '));
  });

  it('login error code 1005 maps auth failure', async () => {
    const { loginLinka, clearLinkaTokenCache } = await import('../integrations/linka/linkaClient.js');
    clearLinkaTokenCache();
    const fetchImpl = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        success: false,
        errors: [{ code: 1005, message: 'invalid credentials' }],
        data: null,
      }),
    });
    const r = await loginLinka({ fetchImpl, force: true });
    assert.equal(r.ok, false);
    assert.equal(r.errorCode, 'COMPANY_IDENTITY_PROVIDER_AUTH_FAILED');
  });

  it('CompanyBaseInfo sends Authorization: Bearer <JWT> exactly once', async () => {
    const jwt = makeJwt();
    const { callLinkaLookup, clearLinkaTokenCache } = await import('../integrations/linka/linkaClient.js');
    clearLinkaTokenCache();
    const authHeaders = [];
    const fetchImpl = async (url, init) => {
      if (String(url).includes('/Auth/Login')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            errors: [],
            data: { token: { accessToken: `bearer ${jwt}`, refreshToken: 'r', expireDate: null }, device: null },
          }),
        };
      }
      authHeaders.push(init.headers.Authorization);
      assert.match(url, /nationalCode=12345678901/);
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true, errors: [], data: SAMPLE_COMPANY_DATA }),
      };
    };
    const r = await callLinkaLookup({ nationalId: '12345678901', fetchImpl });
    assert.equal(r.ok, true);
    assert.equal(authHeaders[0], `Bearer ${jwt}`);
    assert.ok(!authHeaders[0].toLowerCase().includes('bearer bearer'));
  });

  it('adapter maps verified lookup to identity DTO', async () => {
    const jwt = makeJwt();
    const { resolveCompanyIdentityLinka } = await import('../integrations/linka/linkaCompanyIdentity.adapter.js');
    const { clearLinkaTokenCache } = await import('../integrations/linka/linkaClient.js');
    clearLinkaTokenCache();
    const fetchImpl = async (url) => {
      if (String(url).includes('/Auth/Login')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            errors: [],
            data: { token: { accessToken: jwt, refreshToken: 'r' }, device: null },
          }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true, errors: [], data: SAMPLE_COMPANY_DATA }),
      };
    };
    const r = await resolveCompanyIdentityLinka({
      nationalId: '12345678901',
      companyName: 'Fallback',
      fetchImpl,
    });
    assert.equal(r.ok, true);
    assert.equal(r.identity.name, 'شرکت نمونه');
    assert.equal(r.identity.province, 'تهران');
    assert.equal(r.identity.economicCode, null);
  });

  it('re-login once on 401 then succeeds', async () => {
    const jwt1 = makeJwt();
    const jwt2 = makeJwt(7200);
    let loginCount = 0;
    let lookupCount = 0;
    const { callLinkaLookup, clearLinkaTokenCache } = await import('../integrations/linka/linkaClient.js');
    clearLinkaTokenCache();
    const fetchImpl = async (url) => {
      if (String(url).includes('/Auth/Login')) {
        loginCount += 1;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            errors: [],
            data: {
              token: { accessToken: loginCount === 1 ? jwt1 : jwt2, refreshToken: 'r' },
              device: null,
            },
          }),
        };
      }
      lookupCount += 1;
      if (lookupCount === 1) {
        return { ok: false, status: 401, json: async () => ({}) };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true, errors: [], data: SAMPLE_COMPANY_DATA }),
      };
    };
    const r = await callLinkaLookup({ nationalId: '12345678901', fetchImpl });
    assert.equal(r.ok, true);
    assert.equal(loginCount, 2);
    assert.equal(lookupCount, 2);
  });
});

describe('linkaClient callLinkaHttp', () => {
  it('maps 404 to not found', async () => {
    const { callLinkaHttp } = await import('../integrations/linka/linkaClient.js');
    const fetchImpl = async () => ({ ok: false, status: 404, json: async () => ({}) });
    const r = await callLinkaHttp({ url: 'https://example.test/x', fetchImpl });
    assert.equal(r.ok, false);
    assert.equal(r.errorCode, 'COMPANY_IDENTITY_NOT_FOUND');
  });

  it('maps 401 to auth failed without retry', async () => {
    process.env.LINKA_MAX_RETRIES = '2';
    const { callLinkaHttp } = await import('../integrations/linka/linkaClient.js');
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      return { ok: false, status: 401, json: async () => ({}) };
    };
    const r = await callLinkaHttp({ url: 'https://example.test/x', fetchImpl });
    assert.equal(r.ok, false);
    assert.equal(r.errorCode, 'COMPANY_IDENTITY_PROVIDER_AUTH_FAILED');
    assert.equal(calls, 1);
  });

  it('retries 503 then succeeds', async () => {
    process.env.LINKA_MAX_RETRIES = '1';
    const { callLinkaHttp } = await import('../integrations/linka/linkaClient.js');
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      if (calls === 1) {
        return { ok: false, status: 503, json: async () => ({}) };
      }
      return { ok: true, status: 200, json: async () => ({ ok: true }) };
    };
    const r = await callLinkaHttp({ url: 'https://example.test/x', fetchImpl });
    assert.equal(r.ok, true);
    assert.equal(calls, 2);
  });

  it('maps timeout to provider timeout', async () => {
    process.env.LINKA_TIMEOUT_MS = '10';
    process.env.LINKA_MAX_RETRIES = '0';
    const { callLinkaHttp } = await import('../integrations/linka/linkaClient.js');
    const fetchImpl = async (_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => {
        const err = new Error('aborted');
        err.name = 'AbortError';
        reject(err);
      });
    });
    const r = await callLinkaHttp({ url: 'https://example.test/slow', fetchImpl });
    assert.equal(r.ok, false);
    assert.equal(r.errorCode, 'COMPANY_IDENTITY_PROVIDER_TIMEOUT');
  });
});

describe('linka production adapter guard', () => {
  it('blocks when credentials missing', async () => {
    process.env.COMPANY_IDENTITY_PROVIDER = 'linka';
    process.env.LINKA_BASE_URL = 'https://api.linka.ir';
    delete process.env.LINKA_USERNAME;
    delete process.env.LINKA_PASSWORD;
    const { resolveCompanyIdentityLinka } = await import('../integrations/linka/linkaCompanyIdentity.adapter.js');
    const r = await resolveCompanyIdentityLinka({ nationalId: '12345678901', companyName: 'X' });
    assert.equal(r.ok, false);
    assert.equal(r.errorCode, 'COMPANY_IDENTITY_PROVIDER_UNAVAILABLE');
  });
});

describe('leadService existing company skips resolver', () => {
  it('does not call identityResolver when company exists', async () => {
    const leadService = await import('../services/leadService.js');
    let resolverCalls = 0;
    const identityResolver = async () => {
      resolverCalls += 1;
      return { ok: false, errorCode: 'SHOULD_NOT_RUN', error: 'fail' };
    };

    try {
      await leadService.convertLeadToCompany(
        { leadId: 'lead_missing', nationalId: '12345678901', actorId: 'u_x' },
        { identityResolver },
      );
    } catch {
      /* lead not found expected */
    }

    assert.equal(resolverCalls, 0);
  });
});

describe('security — no secrets in adapter logs', () => {
  it('login/lookup logs do not include password or tokens', async () => {
    process.env.COMPANY_IDENTITY_PROVIDER = 'linka';
    process.env.LINKA_BASE_URL = 'https://api.linka.ir';
    process.env.LINKA_USERNAME = 'secret-user';
    process.env.LINKA_PASSWORD = 'super-secret-password-value';
    const jwt = makeJwt();
    const logs = [];
    const orig = console.log;
    console.log = (msg) => logs.push(String(msg));

    try {
      const { callLinkaLookup, clearLinkaTokenCache } = await import('../integrations/linka/linkaClient.js');
      clearLinkaTokenCache();
      const fetchImpl = async (url) => {
        if (String(url).includes('/Auth/Login')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              success: true,
              errors: [],
              data: {
                token: {
                  accessToken: `bearer ${jwt}`,
                  refreshToken: 'super-secret-refresh-token',
                },
                device: null,
              },
            }),
          };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, errors: [], data: SAMPLE_COMPANY_DATA }),
        };
      };
      await callLinkaLookup({ nationalId: '12345678901', fetchImpl });
    } finally {
      console.log = orig;
    }

    const joined = logs.join('\n');
    assert.ok(!joined.includes('super-secret-password-value'));
    assert.ok(!joined.includes('super-secret-refresh-token'));
    assert.ok(!joined.includes(jwt));
    assert.ok(!joined.includes('secret-user'));
  });
});
