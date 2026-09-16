/**
 * Follow-up → canonical Task linkage (Gap 2).
 * Recording an Activity with a future follow-up date must create/link a
 * canonical Pooyesh Task, idempotently (no duplicates on retry/re-save).
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

process.env.JARIAN_SKIP_LISTEN = '1';

const { createApp } = await import('../index.js');
const { pool, query } = await import('../db/pool.js');

let server;
let baseUrl;
let token;
let dbOk = false;
let companyId;
let adminUserId;

async function json(method, path, body, authToken = token) {
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

function futureIso(days = 3) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

before(async () => {
  try {
    await pool.query('SELECT 1');
    dbOk = true;
  } catch (err) {
    console.warn('[followup-task-linkage] DB unavailable — skipping:', err.message);
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
  assert.equal(login.status, 200, 'admin login failed — run: cd backend && npm run setup');
  token = login.data.accessToken || login.data.token;
  const admin = await query(`SELECT id FROM users WHERE username = 'admin'`);
  adminUserId = admin.rows[0].id;

  const co = await json('POST', '/api/v1/companies', {
    name: `Followup-Co-${Date.now()}`,
    entityType: 'CUSTOMER',
  });
  assert.equal(co.status, 201, JSON.stringify(co.data));
  companyId = co.data.company.id;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await pool.end().catch(() => {});
});

describe('Create with future follow-up → linked Task', () => {
  let activityId;
  let taskId;

  it('creating an Activity with a future dueAt creates exactly one linked Task', async (t) => {
    if (!dbOk) return t.skip('no database');
    const due = futureIso(5);
    const res = await json('POST', '/api/v1/activities', {
      subjectType: 'COMPANY',
      subjectId: companyId,
      activityType: 'call',
      description: 'تماس با پیگیری آینده',
      dueAt: due,
      assignedTo: adminUserId,
    });
    assert.equal(res.status, 201, JSON.stringify(res.data));
    activityId = res.data.activity.id;

    const tasks = await query(
      `SELECT * FROM tasks WHERE source_activity_id = $1`,
      [activityId],
    );
    assert.equal(tasks.rows.length, 1, 'expected exactly one linked task');
    taskId = tasks.rows[0].id;
    assert.equal(tasks.rows[0].subject_type, 'COMPANY');
    assert.equal(tasks.rows[0].subject_id, companyId);
    assert.equal(tasks.rows[0].status, 'OPEN');
    assert.ok(tasks.rows[0].title.includes('پیگیری'));
  });

  it('the Task is queryable by subject via the canonical Task API', async (t) => {
    if (!dbOk) return t.skip('no database');
    const list = await json(
      'GET',
      `/api/v1/tasks?subjectType=COMPANY&subjectId=${encodeURIComponent(companyId)}`,
    );
    assert.equal(list.status, 200);
    assert.ok(list.data.items.some((tk) => tk.id === taskId));
  });

  it('re-saving the SAME activity with the same follow-up date does not duplicate the Task', async (t) => {
    if (!dbOk) return t.skip('no database');
    const due = futureIso(5);
    const res = await json('PATCH', `/api/v1/activities/${activityId}`, { dueAt: due });
    assert.equal(res.status, 200, JSON.stringify(res.data));

    const tasks = await query(
      `SELECT id FROM tasks WHERE source_activity_id = $1`,
      [activityId],
    );
    assert.equal(tasks.rows.length, 1, 'must still be exactly one linked task');
    assert.equal(tasks.rows[0].id, taskId);
  });

  it('editing the follow-up date to a new future date updates the same linked Task', async (t) => {
    if (!dbOk) return t.skip('no database');
    const newDue = futureIso(9);
    const res = await json('PATCH', `/api/v1/activities/${activityId}`, { dueAt: newDue });
    assert.equal(res.status, 200);

    const tasks = await query(`SELECT id, due_at FROM tasks WHERE source_activity_id = $1`, [activityId]);
    assert.equal(tasks.rows.length, 1);
    assert.equal(tasks.rows[0].id, taskId);
    assert.equal(new Date(tasks.rows[0].due_at).toISOString().slice(0, 10), new Date(newDue).toISOString().slice(0, 10));
  });

  it('clearing the follow-up date cancels the still-open linked Task (no destructive delete)', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('PATCH', `/api/v1/activities/${activityId}`, { dueAt: null });
    assert.equal(res.status, 200, JSON.stringify(res.data));

    const tasks = await query(`SELECT id, status FROM tasks WHERE source_activity_id = $1`, [activityId]);
    assert.equal(tasks.rows.length, 1, 'task row must still exist (never deleted)');
    assert.equal(tasks.rows[0].status, 'CANCELLED');
  });
});

describe('Follow-up linkage does not resurrect a completed Task', () => {
  it('completing the linked Task then re-editing the follow-up date leaves it COMPLETED', async (t) => {
    if (!dbOk) return t.skip('no database');
    const due = futureIso(2);
    const created = await json('POST', '/api/v1/activities', {
      subjectType: 'COMPANY',
      subjectId: companyId,
      activityType: 'call',
      description: 'برای تست عدم احیای وظیفه تکمیل‌شده',
      dueAt: due,
    });
    const activityId = created.data.activity.id;

    const linked = await query(`SELECT id FROM tasks WHERE source_activity_id = $1`, [activityId]);
    const taskId = linked.rows[0].id;
    const complete = await json('PATCH', `/api/v1/tasks/${taskId}/complete`);
    assert.equal(complete.status, 200);

    const newDue = futureIso(6);
    const upd = await json('PATCH', `/api/v1/activities/${activityId}`, { dueAt: newDue });
    assert.equal(upd.status, 200);

    const after = await query(`SELECT id, status, due_at FROM tasks WHERE source_activity_id = $1`, [activityId]);
    assert.equal(after.rows.length, 1, 'no second task must be created');
    assert.equal(after.rows[0].id, taskId);
    assert.equal(after.rows[0].status, 'COMPLETED');
  });
});
