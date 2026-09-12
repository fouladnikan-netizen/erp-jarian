/**
 * Organization structure API — units / positions / assignments (DDL-37).
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

process.env.JARIAN_SKIP_LISTEN = '1';

const { createApp } = await import('../index.js');
const { pool, query } = await import('../db/pool.js');

let server;
let baseUrl;
let dbOk = false;
let adminToken;
let adminUserId;
let targetUser;

function stamp() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
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
    await pool.query('SELECT 1 FROM organization_units LIMIT 1');
    dbOk = true;
  } catch (err) {
    console.warn('[org-integration] DB unavailable — skipping:', err.message);
    return;
  }

  const app = createApp();
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  const login = await json('POST', '/api/v1/auth/login', {
    username: 'admin',
    password: 'Admin123!',
  }, null);
  assert.equal(login.status, 200, 'admin login failed');
  adminToken = login.data.accessToken || login.data.token;
  adminUserId = login.data.user.id;

  const users = await json('GET', '/api/v1/users');
  targetUser = (users.data.users || []).find((u) => u.username !== 'admin')
    || (users.data.users || [])[0];
});

after(async () => {
  try {
    await query(`DELETE FROM user_organization_assignments WHERE user_id = $1`, [targetUser?.id || '']);
    await query(`DELETE FROM organization_positions WHERE unit_id LIKE 'ou_qa_%'`);
    await query(`DELETE FROM organization_units WHERE id LIKE 'ou_qa_%'`);
  } catch {
    /* ignore */
  }
  if (server) await new Promise((resolve) => server.close(resolve));
  await pool.end().catch(() => {});
});

describe('organization structure API', () => {
  it('GET /tree returns seeded root without mock people', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('GET', '/api/v1/organization/tree');
    assert.equal(res.status, 200, JSON.stringify(res.data));
    assert.equal(res.data.tree.id, 'ou_root');
    assert.equal(res.data.tree.type, 'department');
    const codes = (res.data.units || []).map((u) => u.id);
    assert.ok(codes.includes('ou_root'));
    const people = JSON.stringify(res.data.tree).includes('سارا موسوی');
    assert.equal(people, false);
  });

  it('GET /tree without token → 401', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('GET', '/api/v1/organization/tree', undefined, null);
    assert.equal(res.status, 401);
  });

  it('assign / move / unassign real user without changing roles', async (t) => {
    if (!dbOk) return t.skip('no database');
    if (!targetUser) return t.skip('no second user');

    const beforeRoles = (targetUser.roles || []).map((r) => r.code).sort();
    const unitA = `ou_qa_${stamp()}_a`;
    const unitB = `ou_qa_${stamp()}_b`;

    const a = await json('POST', '/api/v1/organization/units', {
      id: unitA,
      parentId: 'ou_root',
      name: 'واحد آزمایشی آ',
      code: `QA_A_${stamp()}`,
    });
    assert.equal(a.status, 201, JSON.stringify(a.data));

    const b = await json('POST', '/api/v1/organization/units', {
      id: unitB,
      parentId: 'ou_root',
      name: 'واحد آزمایشی ب',
      code: `QA_B_${stamp()}`,
    });
    assert.equal(b.status, 201, JSON.stringify(b.data));

    const put = await json('PUT', '/api/v1/organization/assignments', {
      userId: targetUser.id,
      unitId: unitA,
      positionTitle: 'کارشناس فروش',
      isManager: false,
    });
    assert.equal(put.status, 200, JSON.stringify(put.data));
    assert.equal(put.data.assignment.userId, targetUser.id);
    assert.equal(put.data.assignment.unitId, unitA);
    assert.equal(put.data.assignment.positionTitle, 'کارشناس فروش');

    const listed = await json('GET', `/api/v1/users/${encodeURIComponent(targetUser.id)}`);
    assert.equal(listed.data.user.organization.unitId, unitA);
    assert.equal(listed.data.user.organization.positionTitle, 'کارشناس فروش');
    assert.deepEqual((listed.data.user.roles || []).map((r) => r.code).sort(), beforeRoles);

    const moved = await json('PUT', '/api/v1/organization/assignments', {
      userId: targetUser.id,
      unitId: unitB,
      positionTitle: 'کارشناس فروش',
    });
    assert.equal(moved.status, 200, JSON.stringify(moved.data));
    assert.equal(moved.data.assignment.unitId, unitB);

    const afterMove = await json('GET', `/api/v1/users/${encodeURIComponent(targetUser.id)}`);
    assert.deepEqual((afterMove.data.user.roles || []).map((r) => r.code).sort(), beforeRoles);

    const del = await json('DELETE', `/api/v1/organization/assignments/${encodeURIComponent(targetUser.id)}`);
    assert.equal(del.status, 200, JSON.stringify(del.data));

    const still = await json('GET', `/api/v1/users/${encodeURIComponent(targetUser.id)}`);
    assert.equal(still.status, 200);
    assert.equal(still.data.user.organization, null);
    assert.equal(still.data.user.username, targetUser.username);
    assert.deepEqual((still.data.user.roles || []).map((r) => r.code).sort(), beforeRoles);
  });

  it('PUT /tree round-trips a child unit + assignment', async (t) => {
    if (!dbOk) return t.skip('no database');
    if (!targetUser) return t.skip('no second user');

    const unitId = `ou_qa_${stamp()}_t`;
    const snapshot = await json('PUT', '/api/v1/organization/tree', {
      tree: {
        id: 'ou_root',
        type: 'department',
        name: 'سازمان',
        code: 'ROOT',
        children: [
          {
            id: unitId,
            type: 'department',
            name: 'واحد درخت',
            code: `QA_T_${stamp()}`,
            children: [
              {
                id: targetUser.id,
                type: 'user',
                userId: targetUser.id,
                name: targetUser.displayName,
                position: 'مسئول ارسال',
                isManager: true,
              },
            ],
          },
        ],
      },
    });
    assert.equal(snapshot.status, 200, JSON.stringify(snapshot.data));
    const found = (snapshot.data.assignments || []).find((row) => row.userId === targetUser.id);
    assert.ok(found);
    assert.equal(found.positionTitle, 'مسئول ارسال');
    assert.equal(found.isManager, true);

    await json('DELETE', `/api/v1/organization/assignments/${encodeURIComponent(targetUser.id)}`);
  });
});
