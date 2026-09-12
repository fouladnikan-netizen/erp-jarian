/**
 * Bulk Import scale / N+1 regression tests (DDL-24g hardening pass).
 *
 * Proves productBulkImportService.resolveRow no longer re-queries reference
 * data (Groups/Categories/Product Types/Brands/UOM) once per row — the
 * fix scopes a single in-memory lookup cache to each import request
 * (built fresh per call, discarded after — see buildBatchLookupCache in
 * productBulkImportService.js). Requires PostgreSQL + seeded admin
 * (run: cd backend && npm run setup).
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createProductMasterFixtureTracker } from './helpers/productMasterFixtures.js';

process.env.JARIAN_SKIP_LISTEN = '1';

const { createApp } = await import('../index.js');
const { pool } = await import('../db/pool.js');

let server;
let baseUrl;
let token;
let dbOk = false;
let sharedGroupId;
let sharedGroupName;
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
    console.warn('[product-master-bulk-import-scale] DB unavailable — skipping:', err.message);
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

  // Product Groups share ONE global 2-digit code counter (Task 3 — max 99
  // EVER, never reclaimed even after deactivation). This whole file creates
  // a single Group up front and hangs every fixture's Category/Type off it
  // (those scopes are per-parent, so they don't compete with other test
  // files/suites for the same scarce GROUP codes).
  const g = await json('POST', '/api/v1/product-taxonomy/groups', { name: `گروه-scale-shared-${uniq()}` });
  if (g.status !== 201) throw new Error(`Could not create shared fixture Group (${g.status}): ${JSON.stringify(g.data)}`);
  sharedGroupId = g.data.group.id;
  sharedGroupName = g.data.group.name;
});

after(async () => {
  try {
    if (dbOk) await fixtures.cleanup(json);
  } catch (err) {
    console.warn('[product-master-bulk-import-scale] cleanup failed:', err.message);
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    await pool.end().catch(() => {});
  }
});

async function makeFixture(label) {
  const c = await json('POST', '/api/v1/product-taxonomy/categories', { groupId: sharedGroupId, name: `دسته-scale-${label}-${uniq()}` });
  const ty = await json('POST', '/api/v1/product-taxonomy/types', { categoryId: c.data.category.id, name: `نوع-scale-${label}-${uniq()}` });
  const attrCode = `scale_attr_${label.replace(/[^a-z0-9]/gi, '_')}_${uniq()}`;
  const attr = await json('POST', '/api/v1/attribute-definitions', { code: attrCode, nameFa: 'ویژگی مقیاس', dataType: 'DECIMAL' });
  await json('POST', '/api/v1/attribute-definitions/bindings', {
    productTypeId: ty.data.productType.id, attributeDefinitionId: attr.data.attributeDefinition.id,
    isRequired: true, isIdentityRelevant: true, isDisplayRelevant: true,
  });
  return {
    groupName: sharedGroupName,
    categoryName: c.data.category.name,
    typeName: ty.data.productType.name,
    typeId: ty.data.productType.id,
    attrCode,
  };
}

function buildRows(fixture, count, startAt = 0) {
  const rows = [];
  for (let i = 0; i < count; i += 1) {
    rows.push({
      groupName: fixture.groupName,
      categoryName: fixture.categoryName,
      typeName: fixture.typeName,
      attributes: { [fixture.attrCode]: startAt + i + 1 }, // distinct identity per row
    });
  }
  return rows;
}

/** Wrap pool.query to capture raw SQL text for the duration of one bulk-import call. */
async function withQueryLog(fn) {
  const calls = [];
  const original = pool.query.bind(pool);
  pool.query = (text, params) => {
    calls.push(String(text));
    return original(text, params);
  };
  try {
    const result = await fn();
    return { result, calls };
  } finally {
    pool.query = original;
  }
}

function countMatching(calls, needle) {
  return calls.filter((q) => q.includes(needle)).length;
}

describe('Bulk Import — N+1 elimination (Task 1 hardening)', () => {
  it('reference-table (Group/Category/Type/Brand/UOM) LIST queries do NOT scale with row count', async (t) => {
    if (!dbOk) return t.skip('no database');
    const fixtureSmall = await makeFixture('n1-small');
    const fixtureBig = await makeFixture('n1-big');

    const { calls: smallCalls } = await withQueryLog(() => json('POST', '/api/v1/products/bulk-import', {
      mode: 'DRY_RUN', rows: buildRows(fixtureSmall, 5),
    }));
    const { calls: bigCalls } = await withQueryLog(() => json('POST', '/api/v1/products/bulk-import', {
      mode: 'DRY_RUN', rows: buildRows(fixtureBig, 50),
    }));

    // Match the distinctive ORDER BY clause each repository's list() query
    // uses (as opposed to findById/findByCode point-lookups, which — unlike
    // the pre-fix bug — are legitimately per-row indexed calls made by
    // productService's per-item validation, out of this fix's scope). This
    // isolates exactly the "reload the whole reference table" queries
    // buildBatchLookupCache was written to eliminate.
    const listQueryMarkers = [
      ['product_groups.list()', 'FROM product_groups', 'ORDER BY sort_order ASC, name ASC'],
      ['product_categories.list()', 'FROM product_categories', 'ORDER BY sort_order ASC, name ASC'],
      ['product_types.list()', 'FROM product_types', 'ORDER BY sort_order ASC, name ASC'],
      ['brands.list()', 'FROM brands', 'ORDER BY brand_name ASC'],
      ['uom_registry.list()', 'FROM uom_registry', 'ORDER BY category ASC, code ASC'],
    ];
    for (const [label, fromClause, orderClause] of listQueryMarkers) {
      const matches = (calls) => calls.filter((q) => q.includes(fromClause) && q.includes(orderClause)).length;
      const smallCount = matches(smallCalls);
      const bigCount = matches(bigCalls);
      // Exactly one batch-level load each, regardless of 5 rows vs 50 rows —
      // this is the direct proof the N+1 (which would show bigCount ~= 10x
      // smallCount) is gone.
      assert.equal(bigCount, smallCount, `${label}: expected O(1) query count independent of row count (small=${smallCount}, big=${bigCount})`);
      assert.ok(bigCount <= 1, `${label}: expected at most 1 batch-level query, got ${bigCount}`);
    }
  });

  it('total DB round-trips per row stay bounded (no return of the ~10 query/row N+1)', async (t) => {
    if (!dbOk) return t.skip('no database');
    const fixtureSmall = await makeFixture('bound-small');
    const fixtureBig = await makeFixture('bound-big');

    const { calls: smallCalls } = await withQueryLog(() => json('POST', '/api/v1/products/bulk-import', {
      mode: 'DRY_RUN', rows: buildRows(fixtureSmall, 10),
    }));
    const { calls: bigCalls } = await withQueryLog(() => json('POST', '/api/v1/products/bulk-import', {
      mode: 'DRY_RUN', rows: buildRows(fixtureBig, 100),
    }));

    const deltaRows = 100 - 10;
    const deltaQueries = bigCalls.length - smallCalls.length;
    const perRow = deltaQueries / deltaRows;
    // Pre-fix behavior measured ~10 queries/row; post-fix measured ~5/row
    // (productService's remaining indexed per-item validation calls).
    // Assert comfortably below the old N+1 ceiling.
    assert.ok(perRow < 7, `expected < 7 marginal queries/row, got ${perRow.toFixed(2)} (small=${smallCalls.length}@10 rows, big=${bigCalls.length}@100 rows)`);
  });
});

describe('Bulk Import — scale (300 / 1000 / 2000 rows)', () => {
  it('300-row DRY_RUN import resolves all rows correctly', async (t) => {
    if (!dbOk) return t.skip('no database');
    const fixture = await makeFixture('300');
    const t0 = performance.now();
    const res = await json('POST', '/api/v1/products/bulk-import', { mode: 'DRY_RUN', rows: buildRows(fixture, 300) });
    const elapsedMs = performance.now() - t0;
    assert.equal(res.status, 201, JSON.stringify(res.data));
    assert.equal(res.data.batch.totalRows, 300);
    assert.equal(res.data.batch.acceptedRows, 300);
    assert.equal(res.data.batch.rejectedRows, 0);
    console.log(`[scale-test] 300-row DRY_RUN elapsed=${elapsedMs.toFixed(1)}ms`);
  });

  it('1000-row DRY_RUN import resolves all rows correctly', async (t) => {
    if (!dbOk) return t.skip('no database');
    // DRY_RUN (not APPLY) — allocating 1000 real SKUs under ONE Product Type
    // would collide with the independent 99-variant-per-type ceiling (Task 3),
    // which is not what this scale/N+1 test is verifying. APPLY persistence
    // at realistic volume is covered by the modest-scale test below.
    const fixture = await makeFixture('1000');
    const t0 = performance.now();
    const res = await json('POST', '/api/v1/products/bulk-import', { mode: 'DRY_RUN', rows: buildRows(fixture, 1000) });
    const elapsedMs = performance.now() - t0;
    assert.equal(res.status, 201, JSON.stringify(res.data));
    assert.equal(res.data.batch.totalRows, 1000);
    assert.equal(res.data.batch.acceptedRows, 1000);
    assert.ok(res.data.batch.rowResults.every((r) => r.status === 'WOULD_ACCEPT'));
    console.log(`[scale-test] 1000-row DRY_RUN elapsed=${elapsedMs.toFixed(1)}ms`);

    const dbCount = await pool.query('SELECT COUNT(*) FROM products WHERE product_type_id = $1', [fixture.typeId]);
    assert.equal(Number(dbCount.rows[0].count), 0, 'DRY_RUN must not persist any product even at 1000-row scale');
  });

  it('APPLY persists accepted rows at realistic volume (50 rows, under the per-type SKU ceiling)', async (t) => {
    if (!dbOk) return t.skip('no database');
    const fixture = await makeFixture('apply-50');
    const res = await json('POST', '/api/v1/products/bulk-import', { mode: 'APPLY', rows: buildRows(fixture, 50) });
    assert.equal(res.status, 201, JSON.stringify(res.data));
    assert.equal(res.data.batch.acceptedRows, 50);
    assert.ok(res.data.batch.rowResults.every((r) => r.status === 'ACCEPTED'));
    const dbCount = await pool.query('SELECT COUNT(*) FROM products WHERE product_type_id = $1', [fixture.typeId]);
    assert.equal(Number(dbCount.rows[0].count), 50, 'all 50 accepted rows must actually be persisted to the DB');
  });

  it('2000-row DRY_RUN import (schema maximum) resolves without error', async (t) => {
    if (!dbOk) return t.skip('no database');
    const fixture = await makeFixture('2000');
    const t0 = performance.now();
    const res = await json('POST', '/api/v1/products/bulk-import', { mode: 'DRY_RUN', rows: buildRows(fixture, 2000) });
    const elapsedMs = performance.now() - t0;
    assert.equal(res.status, 201, JSON.stringify(res.data));
    assert.equal(res.data.batch.totalRows, 2000);
    assert.equal(res.data.batch.acceptedRows, 2000);
    console.log(`[scale-test] 2000-row DRY_RUN elapsed=${elapsedMs.toFixed(1)}ms`);
  });

  it('2001-row request is rejected by the schema cap (unchanged validation)', async (t) => {
    if (!dbOk) return t.skip('no database');
    const fixture = await makeFixture('2001-cap');
    const res = await json('POST', '/api/v1/products/bulk-import', { mode: 'DRY_RUN', rows: buildRows(fixture, 2001) });
    assert.equal(res.status, 400);
  });
});

describe('Bulk Import — behavior preserved after caching refactor', () => {
  it('duplicate detection within the same file still works (identical rows in one request)', async (t) => {
    if (!dbOk) return t.skip('no database');
    const fixture = await makeFixture('dup-within-file');
    const row = buildRows(fixture, 1)[0];
    const res = await json('POST', '/api/v1/products/bulk-import', { mode: 'APPLY', rows: [row, row, row] });
    assert.equal(res.status, 201, JSON.stringify(res.data));
    assert.equal(res.data.batch.rowResults[0].status, 'ACCEPTED');
    assert.equal(res.data.batch.rowResults[1].status, 'DUPLICATE_SKIPPED');
    assert.equal(res.data.batch.rowResults[2].status, 'DUPLICATE_SKIPPED');
  });

  it('duplicate detection against existing DB rows still works (re-APPLY same row in a new request)', async (t) => {
    if (!dbOk) return t.skip('no database');
    const fixture = await makeFixture('dup-against-db');
    const row = buildRows(fixture, 1)[0];
    const first = await json('POST', '/api/v1/products/bulk-import', { mode: 'APPLY', rows: [row] });
    assert.equal(first.data.batch.rowResults[0].status, 'ACCEPTED');
    const second = await json('POST', '/api/v1/products/bulk-import', { mode: 'APPLY', rows: [row] });
    assert.equal(second.data.batch.rowResults[0].status, 'DUPLICATE_SKIPPED');
  });

  it('DRY_RUN still never persists anything', async (t) => {
    if (!dbOk) return t.skip('no database');
    const fixture = await makeFixture('dry-run-unchanged');
    const res = await json('POST', '/api/v1/products/bulk-import', { mode: 'DRY_RUN', rows: buildRows(fixture, 20) });
    assert.equal(res.status, 201);
    assert.equal(res.data.batch.acceptedRows, 20);
    const check = await json('GET', `/api/v1/products?productTypeId=${fixture.typeId}`);
    assert.equal(check.data.items.length, 0, 'DRY_RUN must still not persist any product after the caching refactor');
  });

  it('APPLY still persists rows exactly as before', async (t) => {
    if (!dbOk) return t.skip('no database');
    const fixture = await makeFixture('apply-unchanged');
    const res = await json('POST', '/api/v1/products/bulk-import', { mode: 'APPLY', rows: buildRows(fixture, 5) });
    assert.equal(res.status, 201);
    assert.equal(res.data.batch.acceptedRows, 5);
    const check = await json('GET', `/api/v1/products?productTypeId=${fixture.typeId}`);
    assert.equal(check.data.items.length, 5, 'APPLY must persist every accepted row after the caching refactor');
  });

  it('invalid rows still return correct row-level validation errors (unknown Group/Category/Type/Brand/UOM/Attribute)', async (t) => {
    if (!dbOk) return t.skip('no database');
    const fixture = await makeFixture('invalid-rows');
    const rows = [
      { groupName: 'گروه ناموجود بدلی', categoryName: fixture.categoryName, typeName: fixture.typeName, attributes: { [fixture.attrCode]: 1 } },
      { groupName: fixture.groupName, categoryName: 'دسته ناموجود بدلی', typeName: fixture.typeName, attributes: { [fixture.attrCode]: 2 } },
      { groupName: fixture.groupName, categoryName: fixture.categoryName, typeName: 'نوع ناموجود بدلی', attributes: { [fixture.attrCode]: 3 } },
      { groupName: fixture.groupName, categoryName: fixture.categoryName, typeName: fixture.typeName, brandName: 'برند ناموجود بدلی', attributes: { [fixture.attrCode]: 4 } },
      { groupName: fixture.groupName, categoryName: fixture.categoryName, typeName: fixture.typeName, baseUomCode: 'NOPE-UOM', attributes: { [fixture.attrCode]: 5 } },
      { groupName: fixture.groupName, categoryName: fixture.categoryName, typeName: fixture.typeName, attributes: { unknown_attr_bad: 6 } },
    ];
    const res = await json('POST', '/api/v1/products/bulk-import', { mode: 'DRY_RUN', rows });
    assert.equal(res.status, 201, JSON.stringify(res.data));
    assert.equal(res.data.batch.rejectedRows, 6);
    assert.equal(res.data.batch.rowResults[0].errors[0].code, 'GROUP_NOT_FOUND');
    assert.equal(res.data.batch.rowResults[1].errors[0].code, 'CATEGORY_NOT_FOUND');
    assert.equal(res.data.batch.rowResults[2].errors[0].code, 'PRODUCT_TYPE_NOT_FOUND');
    assert.equal(res.data.batch.rowResults[3].errors[0].code, 'BRAND_NOT_FOUND');
    assert.equal(res.data.batch.rowResults[4].errors[0].code, 'UOM_NOT_FOUND');
    assert.equal(res.data.batch.rowResults[5].errors.some((e) => e.code === 'ATTRIBUTE_REQUIRED' || e.code === 'UNKNOWN_ATTRIBUTE'), true);
  });
});
