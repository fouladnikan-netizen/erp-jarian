/**
 * Taxonomy 2-digit code ceiling guard tests (legacy numeric GG/CC/TT
 * counters). Product SKU is mnemonic (DDL-24m) and is covered by
 * sku-code.test.js — these tests only verify allocateTaxonomyCode.
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createProductMasterFixtureTracker } from './helpers/productMasterFixtures.js';

process.env.JARIAN_SKIP_LISTEN = '1';

const { createApp } = await import('../index.js');
const { pool } = await import('../db/pool.js');
const { allocateTaxonomyCode, pad2 } = await import('../domain/productMaster/taxonomyCode.js');

let server;
let baseUrl;
let token;
let dbOk = false;
const fixtures = createProductMasterFixtureTracker();

async function requestJson(method, path, body, authToken = token) {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  return { status: res.status, data };
}

const json = fixtures.wrapJson(requestJson);

const uniq = () => Math.random().toString(36).slice(2, 9);

before(async () => {
  try {
    await pool.query('SELECT 1');
    dbOk = true;
  } catch (err) {
    console.warn('[product-master-taxonomy-ceiling] DB unavailable — skipping:', err.message);
    return;
  }
  const app = createApp();
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;

  const login = await json('POST', '/api/v1/auth/login', { username: 'admin', password: 'Admin123!' }, null);
  if (login.status !== 200) throw new Error(`Login failed (${login.status}). Run: cd backend && npm run setup`);
  token = login.data.accessToken || login.data.token;
});

after(async () => {
  try {
    if (dbOk) await fixtures.cleanup(json);
  } catch (err) {
    console.warn('[product-master-taxonomy-ceiling] cleanup failed:', err.message);
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    await pool.end().catch(() => {});
  }
});

/** Fast-forward a throwaway (non-FK) taxonomy scope's counter without 98 real allocations. */
async function seedTaxonomyScopeAt(scope, nextSeq) {
  await pool.query(
    `INSERT INTO product_taxonomy_code_counters (scope, next_seq) VALUES ($1, $2)
     ON CONFLICT (scope) DO UPDATE SET next_seq = $2`,
    [scope, nextSeq],
  );
}

describe('Taxonomy code ceiling — allocateTaxonomyCode boundary (98 / 99 / exhaustion)', () => {
  it('skips occupied codes when the counter was reset below existing rows', async (t) => {
    if (!dbOk) return t.skip('no database');
    const scope = `TEST_SKIP_TAKEN_${uniq()}`;
    await seedTaxonomyScopeAt(scope, 1);
    const code = await allocateTaxonomyCode(pool, scope, new Set(['01']));
    assert.equal(code, '02');
  });

  it('allocates code 98 when the counter is fast-forwarded to the boundary', async (t) => {
    if (!dbOk) return t.skip('no database');
    const scope = `TEST_BOUNDARY_98_${uniq()}`;
    await seedTaxonomyScopeAt(scope, 98);
    const code = await allocateTaxonomyCode(pool, scope);
    assert.equal(code, '98');
  });

  it('allocates code 99 (the last valid 2-digit code) without wrapping', async (t) => {
    if (!dbOk) return t.skip('no database');
    const scope = `TEST_BOUNDARY_99_${uniq()}`;
    await seedTaxonomyScopeAt(scope, 99);
    const code = await allocateTaxonomyCode(pool, scope);
    assert.equal(code, '99');
  });

  it('the 100th allocation attempt is rejected with a clear domain error, not a generic 500/silent value', async (t) => {
    if (!dbOk) return t.skip('no database');
    const scope = `TEST_BOUNDARY_100_${uniq()}`;
    await seedTaxonomyScopeAt(scope, 100);
    await assert.rejects(
      () => allocateTaxonomyCode(pool, scope),
      (err) => {
        assert.equal(err.code, 'TAXONOMY_CODE_EXHAUSTED');
        assert.equal(err.status, 409, 'must be a deterministic domain error status, not a generic 500');
        assert.equal(err.details.allocated, 100);
        return true;
      },
    );
  });

  it('sequential allocations 98 -> 99 -> exhausted never wrap back to 00/01 and never truncate to 3 digits', async (t) => {
    if (!dbOk) return t.skip('no database');
    const scope = `TEST_SEQUENCE_${uniq()}`;
    await seedTaxonomyScopeAt(scope, 98);
    const first = await allocateTaxonomyCode(pool, scope);
    const second = await allocateTaxonomyCode(pool, scope);
    assert.equal(first, '98');
    assert.equal(second, '99');
    assert.match(second, /^\d{2}$/, 'code must stay exactly 2 digits, never truncated/widened');
    await assert.rejects(() => allocateTaxonomyCode(pool, scope), { code: 'TAXONOMY_CODE_EXHAUSTED' });
    // A THIRD post-exhaustion attempt must keep failing deterministically —
    // never silently reset back to 00/01.
    await assert.rejects(() => allocateTaxonomyCode(pool, scope), { code: 'TAXONOMY_CODE_EXHAUSTED' });
  });

  it('pad2 never produces more than 2 characters for valid codes 1..99', () => {
    assert.equal(pad2(1), '01');
    assert.equal(pad2(9), '09');
    assert.equal(pad2(98), '98');
    assert.equal(pad2(99), '99');
  });
});

describe('Taxonomy code ceiling — concurrency at/near exhaustion (no duplicate codes)', () => {
  it('exactly 1 remaining code: N concurrent requests -> exactly 1 success, 0 duplicates, rest get the exhaustion error', async (t) => {
    if (!dbOk) return t.skip('no database');
    const scope = `TEST_CONCURRENT_1LEFT_${uniq()}`;
    await seedTaxonomyScopeAt(scope, 99); // only code "99" left before exhaustion
    const attempts = 10;
    const results = await Promise.allSettled(
      Array.from({ length: attempts }, () => allocateTaxonomyCode(pool, scope)),
    );
    const fulfilled = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
    const rejected = results.filter((r) => r.status === 'rejected');

    assert.equal(fulfilled.length, 1, `expected exactly 1 successful allocation, got ${fulfilled.length}: ${JSON.stringify(fulfilled)}`);
    assert.equal(fulfilled[0], '99');
    assert.equal(rejected.length, attempts - 1);
    for (const r of rejected) {
      assert.equal(r.reason.code, 'TAXONOMY_CODE_EXHAUSTED', 'every losing concurrent request must get the deterministic exhaustion error, not a 500 or a duplicate code');
    }
  });

  it('exactly 2 remaining codes: N concurrent requests -> exactly 2 successes with DISTINCT codes {98,99}, rest exhausted', async (t) => {
    if (!dbOk) return t.skip('no database');
    const scope = `TEST_CONCURRENT_2LEFT_${uniq()}`;
    await seedTaxonomyScopeAt(scope, 98); // codes "98" and "99" left
    const attempts = 12;
    const results = await Promise.allSettled(
      Array.from({ length: attempts }, () => allocateTaxonomyCode(pool, scope)),
    );
    const fulfilled = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
    const rejected = results.filter((r) => r.status === 'rejected');

    assert.equal(fulfilled.length, 2, `expected exactly 2 successful allocations, got ${fulfilled.length}: ${JSON.stringify(fulfilled)}`);
    assert.deepEqual([...fulfilled].sort(), ['98', '99'], 'the two successful codes must be exactly {98,99} — no duplicates, no skipped/invalid values');
    assert.equal(new Set(fulfilled).size, 2, 'no two concurrent winners must ever receive the same code');
    assert.equal(rejected.length, attempts - 2);
    for (const r of rejected) {
      assert.equal(r.reason.code, 'TAXONOMY_CODE_EXHAUSTED');
    }
  });
});

describe('Taxonomy code ceiling — end-to-end via the real API (pre-seeded exhaustion, no 500)', () => {
  it('creating a Type under a Category whose TYPE: scope is already exhausted returns 409 TAXONOMY_CODE_EXHAUSTED via HTTP, not a 500', async (t) => {
    if (!dbOk) return t.skip('no database');
    const g = await json('POST', '/api/v1/product-taxonomy/groups', { name: `گروه-e2e-ceiling-${uniq()}` });
    const c = await json('POST', '/api/v1/product-taxonomy/categories', { groupId: g.data.group.id, name: `دسته-e2e-ceiling-${uniq()}` });
    await seedTaxonomyScopeAt(`TYPE:${c.data.category.id}`, 100); // simulate this Category's Type-code scope already exhausted
    const res = await json('POST', '/api/v1/product-taxonomy/types', { categoryId: c.data.category.id, name: `نوع-e2e-ceiling-${uniq()}` });
    assert.equal(res.status, 409, JSON.stringify(res.data));
    assert.equal(res.data.error, 'TAXONOMY_CODE_EXHAUSTED');
  });

  it('creating a Type after the TYPE counter was reset below occupied codes returns 201, not a unique-constraint 500', async (t) => {
    if (!dbOk) return t.skip('no database');
    const suffix = uniq();
    const g = await json('POST', '/api/v1/product-taxonomy/groups', { name: `گروه-skip-${suffix}` });
    const c = await json('POST', '/api/v1/product-taxonomy/categories', { groupId: g.data.group.id, name: `دسته-skip-${suffix}` });
    const first = await json('POST', '/api/v1/product-taxonomy/types', { categoryId: c.data.category.id, name: `نوع-skip-a-${suffix}` });
    assert.equal(first.status, 201, JSON.stringify(first.data));
    await seedTaxonomyScopeAt(`TYPE:${c.data.category.id}`, 1);
    const second = await json('POST', '/api/v1/product-taxonomy/types', { categoryId: c.data.category.id, name: `نوع-skip-b-${suffix}` });
    assert.equal(second.status, 201, JSON.stringify(second.data));
    assert.notEqual(second.data.productType.code, first.data.productType.code);
  });
});
