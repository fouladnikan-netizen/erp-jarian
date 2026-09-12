/**
 * Persona Definitions API (DDL-42) — data only, not authorization.
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

process.env.JARIAN_SKIP_LISTEN = '1';

const { createApp } = await import('../index.js');
const { pool, query } = await import('../db/pool.js');
const { seedInitialPersonas } = await import('../db/seedPersonas.js');
const { INITIAL_PERSONAS } = await import('../domain/persona/initialPersonas.js');

let server;
let baseUrl;
let dbOk = false;
let adminToken;
let salesToken;

function stamp() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
}

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

before(async () => {
  try {
    await pool.query('SELECT 1');
    dbOk = true;
  } catch (err) {
    console.warn('[persona-integration] DB unavailable — skipping:', err.message);
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
  adminToken = adminLogin.data.accessToken || adminLogin.data.token;

  const salesLogin = await json('POST', '/api/v1/auth/login', {
    username: 'sales_b',
    password: 'SalesB123!',
  }, null);
  if (salesLogin.status === 200) {
    salesToken = salesLogin.data.accessToken || salesLogin.data.token;
  }
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await pool.end().catch(() => {});
});

describe('Persona seed', () => {
  it('lists the six canonical personas without duplicates', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('GET', '/api/v1/personas');
    assert.equal(res.status, 200, JSON.stringify(res.data));
    const codes = res.data.personas.map((p) => p.code);
    for (const expected of INITIAL_PERSONAS.map((p) => p.code)) {
      assert.ok(codes.includes(expected), `expected seed code ${expected}`);
    }
    const canonical = codes.filter((code) => INITIAL_PERSONAS.some((p) => p.code === code));
    assert.equal(canonical.length, 6);
    assert.equal(new Set(canonical).size, 6);
  });

  it('re-seeding does not overwrite an edited name', async (t) => {
    if (!dbOk) return t.skip('no database');
    const edited = `شوالیه-آزمایش-${stamp()}`;
    const patch = await json('PATCH', '/api/v1/personas/SALES', { name: edited });
    assert.equal(patch.status, 200, JSON.stringify(patch.data));
    assert.equal(patch.data.persona.name, edited);

    await seedInitialPersonas(query);

    const again = await json('GET', '/api/v1/personas/SALES');
    assert.equal(again.status, 200);
    assert.equal(again.data.persona.name, edited);

    const listed = await json('GET', '/api/v1/personas');
    const salesRows = listed.data.personas.filter((p) => p.code === 'SALES');
    assert.equal(salesRows.length, 1);

    await json('PATCH', '/api/v1/personas/SALES', { name: 'شوالیه' });
  });

  it('re-seeding does not overwrite a manual role link', async (t) => {
    if (!dbOk) return t.skip('no database');
    const token = stamp();
    const roleRes = await json('POST', '/api/v1/rbac/roles', {
      labelFa: `QA-PERSONA-seed-${token}`,
    });
    assert.equal(roleRes.status, 201, JSON.stringify(roleRes.data));
    const roleCode = roleRes.data.role.code;

    const attached = await json('POST', '/api/v1/personas/SALES/roles', { roleCode });
    assert.equal(attached.status, 200, JSON.stringify(attached.data));
    assert.ok(attached.data.persona.roles.some((role) => role.code === roleCode));

    await seedInitialPersonas(query);

    const again = await json('GET', '/api/v1/personas/SALES');
    assert.equal(again.status, 200);
    assert.ok(again.data.persona.roles.some((role) => role.code === roleCode));

    await json('DELETE', `/api/v1/personas/SALES/roles/${roleCode}`);
  });
});

describe('Persona CRUD', () => {
  let createdCode;
  let roleA;
  let roleB;
  let roleC;

  function roleCodesOf(persona) {
    return (persona?.roles || []).map((role) => role.code).sort();
  }

  async function snapshotRole(roleCode) {
    const perms = await query(
      `SELECT permission_code FROM role_permissions WHERE role_code = $1 ORDER BY 1`,
      [roleCode],
    );
    const users = await query(
      `SELECT user_id FROM user_roles WHERE role_code = $1 ORDER BY 1`,
      [roleCode],
    );
    const role = await query(`SELECT code, is_active FROM roles WHERE code = $1`, [roleCode]);
    return {
      perms: perms.rows.map((row) => row.permission_code),
      users: users.rows.map((row) => row.user_id),
      exists: role.rowCount === 1,
      active: role.rows[0]?.is_active,
    };
  }

  it('rejects client-supplied code', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('POST', '/api/v1/personas', {
      code: `E2E_${stamp()}`,
      name: 'آزمایش',
      roleCode: 'admin',
    });
    assert.equal(res.status, 400, JSON.stringify(res.data));
    assert.equal(res.data.error, 'VALIDATION');
  });

  it('creates a persona with allocated persona_N and a bound role', async (t) => {
    if (!dbOk) return t.skip('no database');
    const token = stamp();
    const firstRole = await json('POST', '/api/v1/rbac/roles', {
      labelFa: `QA-PERSONA-نقش-${token}-ا`,
    });
    assert.equal(firstRole.status, 201, JSON.stringify(firstRole.data));
    roleA = firstRole.data.role;

    const secondRole = await json('POST', '/api/v1/rbac/roles', {
      labelFa: `QA-PERSONA-نقش-${token}-ب`,
    });
    assert.equal(secondRole.status, 201, JSON.stringify(secondRole.data));
    roleB = secondRole.data.role;

    const thirdRole = await json('POST', '/api/v1/rbac/roles', {
      labelFa: `QA-PERSONA-نقش-${token}-ج`,
    });
    assert.equal(thirdRole.status, 201, JSON.stringify(thirdRole.data));
    roleC = thirdRole.data.role;

    const listed = await json('GET', '/api/v1/personas');
    const max = (listed.data.personas || [])
      .map((p) => Number(String(p.code).replace(/^persona_/, '')) || 0)
      .reduce((acc, n) => Math.max(acc, n), 0);

    const res = await json('POST', '/api/v1/personas', {
      name: 'آزمایش',
      roleCode: roleA.code,
    });
    assert.equal(res.status, 201, JSON.stringify(res.data));
    assert.equal(res.data.persona.code, `persona_${max + 1}`);
    assert.match(res.data.persona.code, /^persona_[0-9]+$/);
    assert.equal(res.data.persona.name, 'آزمایش');
    assert.equal(res.data.persona.isActive, true);
    assert.deepEqual(roleCodesOf(res.data.persona), [roleA.code].sort());
    createdCode = res.data.persona.code;
  });

  it('rejects a second persona on the same role', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('POST', '/api/v1/personas', {
      name: 'هویت دوم',
      roleCode: roleA.code,
    });
    assert.equal(res.status, 409, JSON.stringify(res.data));
    assert.equal(res.data.error, 'ROLE_ALREADY_HAS_PERSONA');
  });

  it('attaches a second role to the same persona', async (t) => {
    if (!dbOk) return t.skip('no database');
    const beforeA = await snapshotRole(roleA.code);
    const beforeB = await snapshotRole(roleB.code);
    const res = await json('POST', `/api/v1/personas/${createdCode}/roles`, {
      roleCode: roleB.code,
    });
    assert.equal(res.status, 200, JSON.stringify(res.data));
    assert.deepEqual(roleCodesOf(res.data.persona), [roleA.code, roleB.code].sort());
    assert.deepEqual(await snapshotRole(roleA.code), beforeA);
    assert.deepEqual(await snapshotRole(roleB.code), beforeB);
  });

  it('rejects attaching a taken role to another persona', async (t) => {
    if (!dbOk) return t.skip('no database');
    const other = await json('POST', '/api/v1/personas', {
      name: 'هویت دیگر',
      roleCode: roleC.code,
    });
    assert.equal(other.status, 201, JSON.stringify(other.data));
    const res = await json('POST', `/api/v1/personas/${other.data.persona.code}/roles`, {
      roleCode: roleA.code,
    });
    assert.equal(res.status, 409, JSON.stringify(res.data));
    assert.equal(res.data.error, 'ROLE_ALREADY_HAS_PERSONA');
  });

  it('lists occupied roles in meta/roles', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('GET', '/api/v1/personas/meta/roles');
    assert.equal(res.status, 200, JSON.stringify(res.data));
    const occupied = res.data.roles.find((role) => role.code === roleA.code);
    assert.ok(occupied);
    assert.equal(occupied.persona?.code, createdCode);
    const freeish = res.data.roles.filter((role) => role.isActive !== false && !role.persona);
    assert.ok(Array.isArray(freeish));
  });

  it('detaches a role without changing RBAC or user_roles', async (t) => {
    if (!dbOk) return t.skip('no database');
    const beforeB = await snapshotRole(roleB.code);
    const res = await json('DELETE', `/api/v1/personas/${createdCode}/roles/${roleB.code}`);
    assert.equal(res.status, 200, JSON.stringify(res.data));
    assert.deepEqual(roleCodesOf(res.data.persona), [roleA.code].sort());
    assert.deepEqual(await snapshotRole(roleB.code), beforeB);
  });

  it('rejects roleCode on PATCH', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('PATCH', `/api/v1/personas/${createdCode}`, { roleCode: roleB.code });
    assert.equal(res.status, 400);
    assert.equal(res.data.error, 'VALIDATION');
  });

  it('patches name and domain', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('PATCH', `/api/v1/personas/${createdCode}`, {
      name: 'نام ویرایش‌شده',
      domain: 'حوزه ویرایش‌شده',
    });
    assert.equal(res.status, 200, JSON.stringify(res.data));
    assert.equal(res.data.persona.name, 'نام ویرایش‌شده');
    assert.equal(res.data.persona.domain, 'حوزه ویرایش‌شده');
    assert.equal(res.data.persona.code, createdCode);
    assert.deepEqual(roleCodesOf(res.data.persona), [roleA.code].sort());
  });

  it('rejects code changes on PATCH', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('PATCH', `/api/v1/personas/${createdCode}`, { code: 'OTHER' });
    assert.equal(res.status, 400);
    assert.equal(res.data.error, 'VALIDATION');
  });

  it('deactivates and reactivates without hard delete', async (t) => {
    if (!dbOk) return t.skip('no database');
    const off = await json('PATCH', `/api/v1/personas/${createdCode}/deactivate`);
    assert.equal(off.status, 200);
    assert.equal(off.data.persona.isActive, false);

    const hidden = await json('GET', '/api/v1/personas?includeInactive=false');
    assert.equal(hidden.status, 200);
    assert.equal(hidden.data.personas.some((p) => p.code === createdCode), false);

    const on = await json('PATCH', `/api/v1/personas/${createdCode}/activate`);
    assert.equal(on.status, 200);
    assert.equal(on.data.persona.isActive, true);
  });
});

describe('Persona RBAC', () => {
  it('gates mutations and list behind users:admin', async (t) => {
    if (!dbOk || !salesToken) return t.skip('no sales token');
    const list = await json('GET', '/api/v1/personas', undefined, salesToken);
    assert.equal(list.status, 403);

    const create = await json('POST', '/api/v1/personas', {
      name: 'ممنوع',
      roleCode: 'admin',
    }, salesToken);
    assert.equal(create.status, 403);

    const patch = await json('PATCH', '/api/v1/personas/SALES', { name: 'هک' }, salesToken);
    assert.equal(patch.status, 403);
  });

  it('does not attach persona to users or change roles', async (t) => {
    if (!dbOk) return t.skip('no database');
    const users = await json('GET', '/api/v1/users');
    assert.equal(users.status, 200);
    const sample = users.data.users?.[0] || users.data.items?.[0] || users.data[0];
    if (sample) {
      assert.equal(Object.prototype.hasOwnProperty.call(sample, 'personaId'), false);
      assert.equal(Object.prototype.hasOwnProperty.call(sample, 'persona'), false);
    }
    const roles = await json('GET', '/api/v1/rbac/roles');
    assert.equal(roles.status, 200);
    assert.ok(Array.isArray(roles.data.roles));
    assert.equal(roles.data.roles.some((r) => r.code === 'SALES'), false);
  });
});
