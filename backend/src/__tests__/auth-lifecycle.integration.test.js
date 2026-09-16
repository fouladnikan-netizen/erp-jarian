/**
 * Auth lifecycle (DDL-41): invitation SMS, set-password, mobile login, forgot-password OTP.
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

process.env.JARIAN_SKIP_LISTEN = '1';
process.env.FARAZ_SMS_MODE = 'mock';

const { createApp } = await import('../index.js');
const { pool } = await import('../db/pool.js');
const { getMockSmsInbox, clearMockSmsInbox } = await import('../integrations/farazSms/farazSmsClient.js');

let server;
let baseUrl;
let dbOk = false;
let adminToken;

async function json(method, path, body, authToken = adminToken) {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  return { status: res.status, data };
}

function uniqueMobile() {
  const n = `${Date.now()}${Math.floor(Math.random() * 90 + 10)}`.slice(-9);
  return `09${n}`.slice(0, 11);
}

function lastSms(purpose) {
  const items = getMockSmsInbox().filter((row) => row.purpose === purpose);
  return items[items.length - 1] || null;
}

function tokenFromInviteSms(sms) {
  const match = String(sms?.text || '').match(/token=([A-Za-z0-9_-]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

function codeFromOtpSms(sms) {
  const match = String(sms?.text || '').match(/کد تأیید جریان:\s*(\d{6})/);
  return match ? match[1] : '';
}

before(async () => {
  try {
    await pool.query('SELECT 1');
    await pool.query('SELECT 1 FROM auth_challenges LIMIT 1');
    dbOk = true;
  } catch (err) {
    console.warn('[auth-lifecycle-integration] DB unavailable — skipping:', err.message);
    return;
  }

  const app = createApp();
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  const adminLogin = await json('POST', '/api/v1/auth/login', {
    username: 'admin',
    password: 'Admin123!',
  }, null);
  assert.equal(adminLogin.status, 200, 'admin login failed — run: cd backend && npm run setup');
  adminToken = adminLogin.data.accessToken;
  clearMockSmsInbox();
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await pool.end().catch(() => {});
});

describe('auth lifecycle invitation + mobile login', () => {
  it('INVITED user receives set-password link, becomes ACTIVE, then logs in with mobile', async (t) => {
    if (!dbOk) return t.skip('no database');
    const mobile = uniqueMobile();
    const create = await json('POST', '/api/v1/users', {
      fullName: 'کاربر دعوت تست',
      mobile,
      roles: ['sales'],
    });
    assert.equal(create.status, 201, JSON.stringify(create.data));
    assert.equal(create.data.user.status, 'INVITED');
    assert.equal(create.data.invitation?.sent, true);

    const blocked = await json('POST', '/api/v1/auth/login', { mobile, password: 'TempPass8!' }, null);
    assert.equal(blocked.status, 401);

    const inviteSms = lastSms('INVITATION');
    assert.ok(inviteSms, 'invitation SMS was not sent');
    assert.equal(inviteSms.mobile, mobile);
    const token = tokenFromInviteSms(inviteSms);
    assert.ok(token);

    const peek = await json('GET', `/api/v1/auth/invitation?token=${encodeURIComponent(token)}`, undefined, null);
    assert.equal(peek.status, 200, JSON.stringify(peek.data));
    assert.equal(peek.data.valid, true);

    const setPassword = await json('POST', '/api/v1/auth/set-password', {
      token,
      password: 'TempPass8!',
    }, null);
    assert.equal(setPassword.status, 200, JSON.stringify(setPassword.data));

    const reused = await json('POST', '/api/v1/auth/set-password', {
      token,
      password: 'OtherPass8!',
    }, null);
    assert.equal(reused.status, 400);

    const login = await json('POST', '/api/v1/auth/login', { mobile, password: 'TempPass8!' }, null);
    assert.equal(login.status, 200, JSON.stringify(login.data));
    assert.equal(login.data.user.displayName, 'کاربر دعوت تست');
    assert.ok(login.data.accessToken);
  });

  it('admin can resend invitation and previous token dies', async (t) => {
    if (!dbOk) return t.skip('no database');
    const mobile = uniqueMobile();
    const create = await json('POST', '/api/v1/users', {
      fullName: 'دعوت مجدد',
      mobile,
      roles: ['sales'],
    });
    assert.equal(create.status, 201, JSON.stringify(create.data));
    const firstToken = tokenFromInviteSms(lastSms('INVITATION'));
    const resend = await json('POST', `/api/v1/users/${create.data.user.id}/invitation`);
    assert.equal(resend.status, 200, JSON.stringify(resend.data));
    assert.equal(resend.data.invitation?.sent, true);
    const secondToken = tokenFromInviteSms(lastSms('INVITATION'));
    assert.ok(secondToken);
    assert.notEqual(secondToken, firstToken);

    const oldPeek = await json('GET', `/api/v1/auth/invitation?token=${encodeURIComponent(firstToken)}`, undefined, null);
    assert.equal(oldPeek.status, 400);
    const newPeek = await json('GET', `/api/v1/auth/invitation?token=${encodeURIComponent(secondToken)}`, undefined, null);
    assert.equal(newPeek.status, 200);
  });
});

describe('auth lifecycle forgot password', () => {
  it('OTP path resets password without revealing unknown mobiles', async (t) => {
    if (!dbOk) return t.skip('no database');
    const mobile = uniqueMobile();
    const create = await json('POST', '/api/v1/users', {
      fullName: 'بازیابی رمز',
      mobile,
      roles: ['sales'],
      password: 'OldPass88!',
    });
    assert.equal(create.status, 201, JSON.stringify(create.data));
    assert.equal(create.data.user.status, 'ACTIVE');

    const unknown = await json('POST', '/api/v1/auth/forgot-password', { mobile: uniqueMobile() }, null);
    assert.equal(unknown.status, 200);
    assert.equal(unknown.data.ok, true);

    const requested = await json('POST', '/api/v1/auth/forgot-password', { mobile }, null);
    assert.equal(requested.status, 200, JSON.stringify(requested.data));
    assert.equal(requested.data.ok, true);
    assert.equal(requested.data.resetToken, undefined);
    assert.equal(requested.data.code, undefined);

    const otpSms = lastSms('OTP');
    assert.ok(otpSms);
    const code = codeFromOtpSms(otpSms);
    assert.match(code, /^\d{6}$/);

    const bad = await json('POST', '/api/v1/auth/forgot-password/verify', { mobile, code: '000000' }, null);
    assert.equal(bad.status, 400);

    const verify = await json('POST', '/api/v1/auth/forgot-password/verify', { mobile, code }, null);
    assert.equal(verify.status, 200, JSON.stringify(verify.data));
    const resetToken = verify.data.resetToken;
    assert.ok(resetToken);

    const setPassword = await json('POST', '/api/v1/auth/set-password', {
      token: resetToken,
      password: 'NewPass88!',
    }, null);
    assert.equal(setPassword.status, 200, JSON.stringify(setPassword.data));

    const oldLogin = await json('POST', '/api/v1/auth/login', { mobile, password: 'OldPass88!' }, null);
    assert.equal(oldLogin.status, 401);
    const newLogin = await json('POST', '/api/v1/auth/login', { mobile, password: 'NewPass88!' }, null);
    assert.equal(newLogin.status, 200, JSON.stringify(newLogin.data));
  });

  it('does not send OTP for INVITED accounts but still returns the generic success', async (t) => {
    if (!dbOk) return t.skip('no database');
    const mobile = uniqueMobile();
    const create = await json('POST', '/api/v1/users', {
      fullName: 'دعوت‌شده بدون بازیابی',
      mobile,
      roles: ['sales'],
    });
    assert.equal(create.status, 201, JSON.stringify(create.data));
    const before = getMockSmsInbox().filter((row) => row.purpose === 'OTP').length;
    const requested = await json('POST', '/api/v1/auth/forgot-password', { mobile }, null);
    assert.equal(requested.status, 200);
    const after = getMockSmsInbox().filter((row) => row.purpose === 'OTP').length;
    assert.equal(after, before);
  });
});
