/**
 * Product Master (Shirazeh taxonomy/attribute/UOM/Brand + Vitrin Product/SKU)
 * integration tests — DDL-24. Requires PostgreSQL + seeded admin/sales_c
 * (run: cd backend && npm run setup).
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

process.env.JARIAN_SKIP_LISTEN = '1';

const { createApp } = await import('../index.js');
const { pool } = await import('../db/pool.js');

let server;
let baseUrl;
let token;
let salesToken;
let dbOk = false;

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
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  return { status: res.status, data };
}

const uniq = () => Math.random().toString(36).slice(2, 9);

before(async () => {
  try {
    await pool.query('SELECT 1');
    dbOk = true;
  } catch (err) {
    console.warn('[product-master-integration] DB unavailable — skipping:', err.message);
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

  const salesLogin = await json('POST', '/api/v1/auth/login', { username: 'sales_c', password: 'SalesC123!' }, null);
  if (salesLogin.status === 200) salesToken = salesLogin.data.accessToken || salesLogin.data.token;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await pool.end().catch(() => {});
});

describe('RBAC', () => {
  it('unauthenticated -> 401', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('GET', '/api/v1/products', undefined, null);
    assert.equal(res.status, 401);
  });

  it('sales role can read products but cannot manage taxonomy or bulk-import', async (t) => {
    if (!dbOk || !salesToken) return t.skip('no sales token');
    const read = await json('GET', '/api/v1/products', undefined, salesToken);
    assert.equal(read.status, 200);

    const taxonomy = await json('POST', '/api/v1/product-taxonomy/groups', { name: `RBAC-${uniq()}` }, salesToken);
    assert.equal(taxonomy.status, 403);

    const bulk = await json('POST', '/api/v1/products/bulk-import', { mode: 'DRY_RUN', rows: [] }, salesToken);
    assert.equal(bulk.status, 403);
  });
});

describe('Taxonomy (Group -> Category -> Product Type)', () => {
  let groupId; let categoryId; let typeId;

  it('creates a Group with an atomically-allocated 2-digit code', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('POST', '/api/v1/product-taxonomy/groups', { name: `گروه-${uniq()}` });
    assert.equal(res.status, 201, JSON.stringify(res.data));
    assert.match(res.data.group.code, /^\d{2}$/);
    groupId = res.data.group.id;
  });

  it('rejects a duplicate Group name (normalized)', async (t) => {
    if (!dbOk) return t.skip('no database');
    const name = `تکراری-${uniq()}`;
    const first = await json('POST', '/api/v1/product-taxonomy/groups', { name });
    assert.equal(first.status, 201);
    const second = await json('POST', '/api/v1/product-taxonomy/groups', { name });
    assert.equal(second.status, 409);
    assert.equal(second.data.error, 'PRODUCT_GROUP_DUPLICATE');
  });

  it('rejects a Category with an invalid/missing parent Group', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('POST', '/api/v1/product-taxonomy/categories', { groupId: 'not-a-real-group', name: `دسته-${uniq()}` });
    assert.equal(res.status, 400);
    assert.equal(res.data.error, 'PRODUCT_GROUP_NOT_FOUND');
  });

  it('creates a valid Category + Product Type hierarchy', async (t) => {
    if (!dbOk) return t.skip('no database');
    const cat = await json('POST', '/api/v1/product-taxonomy/categories', { groupId, name: `دسته-${uniq()}` });
    assert.equal(cat.status, 201, JSON.stringify(cat.data));
    categoryId = cat.data.category.id;

    const type = await json('POST', '/api/v1/product-taxonomy/types', { categoryId, name: `نوع-${uniq()}` });
    assert.equal(type.status, 201, JSON.stringify(type.data));
    typeId = type.data.productType.id;
    assert.match(type.data.productType.code, /^\d{2}$/);
  });

  it('cannot create a Category under a deactivated Group', async (t) => {
    if (!dbOk) return t.skip('no database');
    const g = await json('POST', '/api/v1/product-taxonomy/groups', { name: `غیرفعال-${uniq()}` });
    await json('PATCH', `/api/v1/product-taxonomy/groups/${g.data.group.id}`, { isActive: false });
    const res = await json('POST', '/api/v1/product-taxonomy/categories', { groupId: g.data.group.id, name: `دسته-${uniq()}` });
    assert.equal(res.status, 409);
    assert.equal(res.data.error, 'PRODUCT_GROUP_INACTIVE');
  });

  it('deactivate/reactivate a Group (historical children remain resolvable)', async (t) => {
    if (!dbOk) return t.skip('no database');
    const off = await json('PATCH', `/api/v1/product-taxonomy/groups/${groupId}`, { isActive: false });
    assert.equal(off.status, 200);
    assert.equal(off.data.group.isActive, false);

    const stillReadable = await json('GET', `/api/v1/product-taxonomy/categories/${categoryId}`);
    assert.equal(stillReadable.status, 200);

    const on = await json('PATCH', `/api/v1/product-taxonomy/groups/${groupId}`, { isActive: true });
    assert.equal(on.data.group.isActive, true);
  });

  it('tree endpoint nests Group -> Category -> Product Type', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('GET', '/api/v1/product-taxonomy/tree');
    assert.equal(res.status, 200);
    const group = res.data.tree.find((g) => g.id === groupId);
    assert.ok(group, 'group present in tree');
    const category = group.categories.find((c) => c.id === categoryId);
    assert.ok(category, 'category nested under group');
    assert.ok(category.types.some((ty) => ty.id === typeId), 'type nested under category');
  });
});

describe('Attribute Engine + Schema Inheritance', () => {
  let groupId; let categoryId; let typeId; let thicknessAttrId; let widthAttrId; let standardAttrId;

  before(async () => {
    if (!dbOk) return;
    const g = await json('POST', '/api/v1/product-taxonomy/groups', { name: `گروه-attr-${uniq()}` });
    groupId = g.data.group.id;
    const c = await json('POST', '/api/v1/product-taxonomy/categories', { groupId, name: `دسته-attr-${uniq()}` });
    categoryId = c.data.category.id;
    const ty = await json('POST', '/api/v1/product-taxonomy/types', { categoryId, name: `نوع-attr-${uniq()}` });
    typeId = ty.data.productType.id;
  });

  it('creates a DECIMAL attribute with min/max', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('POST', '/api/v1/attribute-definitions', {
      code: `thickness_${uniq()}`, nameFa: 'ضخامت', dataType: 'DECIMAL', minValue: 0.1, maxValue: 200,
    });
    assert.equal(res.status, 201, JSON.stringify(res.data));
    thicknessAttrId = res.data.attributeDefinition.id;
  });

  it('creates a numeric width attribute + an ENUM standard attribute', async (t) => {
    if (!dbOk) return t.skip('no database');
    const width = await json('POST', '/api/v1/attribute-definitions', {
      code: `width_${uniq()}`, nameFa: 'عرض', dataType: 'DECIMAL', minValue: 1,
    });
    widthAttrId = width.data.attributeDefinition.id;

    const std = await json('POST', '/api/v1/attribute-definitions', {
      code: `standard_${uniq()}`, nameFa: 'استاندارد', dataType: 'ENUM',
      allowedValues: [{ value: 'DIN', labelFa: 'DIN' }, { value: 'ASTM', labelFa: 'ASTM' }],
    });
    assert.equal(std.status, 201);
    standardAttrId = std.data.attributeDefinition.id;
  });

  it('rejects an ENUM attribute definition with no allowed values', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('POST', '/api/v1/attribute-definitions', { code: `bad_enum_${uniq()}`, nameFa: 'بد', dataType: 'ENUM' });
    assert.equal(res.status, 400);
  });

  it('binds attributes to the Product Type (schema) — required + identity/display relevance', async (t) => {
    if (!dbOk) return t.skip('no database');
    const b1 = await json('POST', '/api/v1/attribute-definitions/bindings', {
      productTypeId: typeId, attributeDefinitionId: thicknessAttrId, isRequired: true,
      isIdentityRelevant: true, isDisplayRelevant: true, sortOrder: 10,
    });
    assert.equal(b1.status, 201, JSON.stringify(b1.data));

    const b2 = await json('POST', '/api/v1/attribute-definitions/bindings', {
      productTypeId: typeId, attributeDefinitionId: widthAttrId, isRequired: true,
      isIdentityRelevant: true, isDisplayRelevant: true, sortOrder: 20,
    });
    assert.equal(b2.status, 201);

    const b3 = await json('POST', '/api/v1/attribute-definitions/bindings', {
      productTypeId: typeId, attributeDefinitionId: standardAttrId, isRequired: false, sortOrder: 30,
    });
    assert.equal(b3.status, 201);
  });

  it('rejects a duplicate binding of the same attribute to the same Type', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('POST', '/api/v1/attribute-definitions/bindings', {
      productTypeId: typeId, attributeDefinitionId: thicknessAttrId,
    });
    assert.equal(res.status, 409);
  });

  it('rejects a TRANSACTION_ONLY binding that is also marked identity-relevant (DDL-24h)', async (t) => {
    if (!dbOk) return t.skip('no database');
    // Uses its own throwaway Product Type so it does not perturb the shared
    // `typeId` schema (checked for an exact attribute count below).
    const g = await json('POST', '/api/v1/product-taxonomy/groups', { name: `گروه-txn-${uniq()}` });
    const c = await json('POST', '/api/v1/product-taxonomy/categories', { groupId: g.data.group.id, name: `دسته-txn-${uniq()}` });
    const ty = await json('POST', '/api/v1/product-taxonomy/types', { categoryId: c.data.category.id, name: `نوع-txn-${uniq()}` });
    const cutLenAttr = await json('POST', '/api/v1/attribute-definitions', {
      code: `cut_len_${uniq()}`, nameFa: 'طول برش سفارشی', dataType: 'DECIMAL',
    });
    assert.equal(cutLenAttr.status, 201);
    const res = await json('POST', '/api/v1/attribute-definitions/bindings', {
      productTypeId: ty.data.productType.id, attributeDefinitionId: cutLenAttr.data.attributeDefinition.id,
      attributeRole: 'TRANSACTION_ONLY', isIdentityRelevant: true,
    });
    assert.equal(res.status, 400);

    // Same attribute, TRANSACTION_ONLY but NOT identity-relevant, is fine.
    const okRes = await json('POST', '/api/v1/attribute-definitions/bindings', {
      productTypeId: ty.data.productType.id, attributeDefinitionId: cutLenAttr.data.attributeDefinition.id,
      attributeRole: 'TRANSACTION_ONLY', isIdentityRelevant: false,
    });
    assert.equal(okRes.status, 201);
  });

  it('the Product Type schema is inherited by Products (no per-product redefinition)', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('GET', `/api/v1/attribute-definitions/schema/${typeId}`);
    assert.equal(res.status, 200);
    assert.equal(res.data.schema.length, 3);
    assert.ok(res.data.schema.some((e) => e.definition.id === thicknessAttrId && e.binding.isRequired));
  });

  describe('Product creation against the inherited schema', () => {
    it('rejects creation missing a required attribute', async (t) => {
      if (!dbOk) return t.skip('no database');
      const res = await json('POST', '/api/v1/products', { productTypeId: typeId, attributeValues: { [thicknessAttrId]: 6 } });
      assert.equal(res.status, 400);
      assert.equal(res.data.error, 'ATTRIBUTE_REQUIRED');
    });

    it('rejects wrong data type for a DECIMAL attribute', async (t) => {
      if (!dbOk) return t.skip('no database');
      const res = await json('POST', '/api/v1/products', {
        productTypeId: typeId, attributeValues: { [thicknessAttrId]: 'not-a-number', [widthAttrId]: 1000 },
      });
      assert.equal(res.status, 400);
      assert.equal(res.data.error, 'ATTRIBUTE_TYPE_MISMATCH');
    });

    it('rejects a value outside min/max', async (t) => {
      if (!dbOk) return t.skip('no database');
      const res = await json('POST', '/api/v1/products', {
        productTypeId: typeId, attributeValues: { [thicknessAttrId]: 999, [widthAttrId]: 1000 },
      });
      assert.equal(res.status, 400);
      assert.equal(res.data.error, 'ATTRIBUTE_OUT_OF_RANGE');
    });

    it('rejects an invalid ENUM value', async (t) => {
      if (!dbOk) return t.skip('no database');
      const res = await json('POST', '/api/v1/products', {
        productTypeId: typeId, attributeValues: { [thicknessAttrId]: 6, [widthAttrId]: 1000, [standardAttrId]: 'NOT_ALLOWED' },
      });
      assert.equal(res.status, 400);
      assert.equal(res.data.error, 'ATTRIBUTE_ENUM_INVALID');
    });

    it('rejects an unknown attribute not in the Type schema', async (t) => {
      if (!dbOk) return t.skip('no database');
      const res = await json('POST', '/api/v1/products', {
        productTypeId: typeId, attributeValues: { [thicknessAttrId]: 6, [widthAttrId]: 1000, unknown_attr: 1 },
      });
      assert.equal(res.status, 400);
      assert.equal(res.data.error, 'UNKNOWN_ATTRIBUTE');
    });

    it('creates a valid Product with a generated SKU + generated name', async (t) => {
      if (!dbOk) return t.skip('no database');
      const res = await json('POST', '/api/v1/products', {
        productTypeId: typeId, attributeValues: { [thicknessAttrId]: 6, [widthAttrId]: 1000, [standardAttrId]: 'DIN' },
      });
      assert.equal(res.status, 201, JSON.stringify(res.data));
      assert.match(res.data.product.sku, /^\d{8}$/);
      assert.ok(res.data.product.generatedName.includes('6'));
      globalThis.__testProductA = res.data.product;
    });

    it('exact duplicate (ASCII "6.00") is blocked at create', async (t) => {
      if (!dbOk) return t.skip('no database');
      const res = await json('POST', '/api/v1/products', {
        productTypeId: typeId, attributeValues: { [thicknessAttrId]: '6.00', [widthAttrId]: 1000, [standardAttrId]: 'ASTM' },
      });
      assert.equal(res.status, 409);
      assert.equal(res.data.error, 'PRODUCT_DUPLICATE_EXACT');
    });

    it('exact duplicate with Persian digits ("۶") is also blocked (normalized identity)', async (t) => {
      if (!dbOk) return t.skip('no database');
      const res = await json('POST', '/api/v1/products', {
        productTypeId: typeId, attributeValues: { [thicknessAttrId]: '۶', [widthAttrId]: '۱۰۰۰' },
      });
      assert.equal(res.status, 409);
      assert.equal(res.data.error, 'PRODUCT_DUPLICATE_EXACT');
    });

    it('a genuinely different variant (different width) is allowed', async (t) => {
      if (!dbOk) return t.skip('no database');
      const res = await json('POST', '/api/v1/products', {
        productTypeId: typeId, attributeValues: { [thicknessAttrId]: 6, [widthAttrId]: 1250 },
      });
      assert.equal(res.status, 201, JSON.stringify(res.data));
      assert.notEqual(res.data.product.sku, globalThis.__testProductA.sku);
    });

    it('SKU is immutable — update does not accept/change sku when not sent at all', async (t) => {
      if (!dbOk) return t.skip('no database');
      const before = globalThis.__testProductA.sku;
      const res = await json('PATCH', `/api/v1/products/${globalThis.__testProductA.id}`, { displayNameOverride: 'نام دلخواه تست' });
      assert.equal(res.status, 200, JSON.stringify(res.data));
      assert.equal(res.data.product.sku, before);
      assert.equal(res.data.product.displayNameOverride, 'نام دلخواه تست');
    });

    it('SKU is immutable — an EXPLICIT attempt to change sku in a PATCH is REJECTED (not silently ignored), as admin', async (t) => {
      if (!dbOk) return t.skip('no database');
      const before = globalThis.__testProductA.sku;
      const res = await json('PATCH', `/api/v1/products/${globalThis.__testProductA.id}`, {
        sku: '99999999', displayNameOverride: 'تلاش برای تغییر SKU',
      });
      assert.equal(res.status, 400, JSON.stringify(res.data));
      assert.equal(res.data.error, 'SKU_IMMUTABLE');
      assert.equal(res.data.details?.field, 'sku');

      const after = await json('GET', `/api/v1/products/${globalThis.__testProductA.id}`);
      assert.equal(after.data.product.sku, before, 'SKU must remain unchanged in DB after the rejected attempt');
      assert.notEqual(after.data.product.displayNameOverride, 'تلاش برای تغییر SKU', 'no partial side-effect from the rejected patch');
    });

    it('SKU tamper attempt is rejected even when the sent sku value is identical to the current one', async (t) => {
      if (!dbOk) return t.skip('no database');
      const before = globalThis.__testProductA.sku;
      const res = await json('PATCH', `/api/v1/products/${globalThis.__testProductA.id}`, { sku: before });
      assert.equal(res.status, 400, JSON.stringify(res.data));
      assert.equal(res.data.error, 'SKU_IMMUTABLE');
    });

    it('normal (non-SKU) Product updates still succeed after the immutability guard', async (t) => {
      if (!dbOk) return t.skip('no database');
      const res = await json('PATCH', `/api/v1/products/${globalThis.__testProductA.id}`, { displayNameOverride: 'نام نهایی' });
      assert.equal(res.status, 200, JSON.stringify(res.data));
      assert.equal(res.data.product.displayNameOverride, 'نام نهایی');
    });

    it('lifecycle: deactivate then reactivate; inactive not returned in active-only search', async (t) => {
      if (!dbOk) return t.skip('no database');
      const id = globalThis.__testProductA.id;
      const off = await json('PATCH', `/api/v1/products/${id}/deactivate`);
      assert.equal(off.status, 200);
      assert.equal(off.data.product.lifecycleStatus, 'INACTIVE');

      const activeOnly = await json('GET', `/api/v1/products?productTypeId=${typeId}`);
      assert.ok(!activeOnly.data.items.some((p) => p.id === id), 'inactive product must not appear in active-only search');

      const includeInactive = await json('GET', `/api/v1/products?productTypeId=${typeId}&includeInactive=true`);
      assert.ok(includeInactive.data.items.some((p) => p.id === id), 'inactive product must remain historically resolvable');

      const on = await json('PATCH', `/api/v1/products/${id}/activate`);
      assert.equal(on.data.product.lifecycleStatus, 'ACTIVE');
    });

    it('hard-delete is not exposed — no DELETE route for products', async (t) => {
      if (!dbOk) return t.skip('no database');
      const res = await fetch(`${baseUrl}/api/v1/products/${globalThis.__testProductA.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.ok([404, 405].includes(res.status), `expected no DELETE support, got ${res.status}`);
    });

    it('structured search: combined Type + attribute filter finds the product', async (t) => {
      if (!dbOk) return t.skip('no database');
      const res = await json('GET', `/api/v1/products?productTypeId=${typeId}&text=${encodeURIComponent('6')}`);
      assert.equal(res.status, 200);
      assert.ok(res.data.items.length >= 1);
    });
  });
});

describe('UOM Engine', () => {
  it('creates a UOM and rejects a duplicate code', async (t) => {
    if (!dbOk) return t.skip('no database');
    const code = `U${uniq().toUpperCase().slice(0, 6)}`;
    const first = await json('POST', '/api/v1/uom', { code, nameFa: 'واحد تست' });
    assert.equal(first.status, 201, JSON.stringify(first.data));
    const dup = await json('POST', '/api/v1/uom', { code, nameFa: 'واحد تست ۲' });
    assert.equal(dup.status, 409);
  });

  it('creates a valid conversion rule with exact/approximate metadata', async (t) => {
    if (!dbOk) return t.skip('no database');
    const kg = await json('GET', '/api/v1/uom');
    const kgUom = kg.data.items.find((u) => u.code === 'KG');
    const tonUom = kg.data.items.find((u) => u.code === 'TON');
    assert.ok(kgUom && tonUom, 'seeded KG/TON must exist');

    const branch = await json('POST', '/api/v1/uom', { code: `BR${uniq().slice(0, 5).toUpperCase()}`, nameFa: 'شاخه تست', category: 'COUNT' });
    const conv = await json('POST', '/api/v1/uom/conversions', {
      fromUomId: branch.data.uom.id, toUomId: kgUom.id, numerator: 12, denominator: 1, isExact: false, notes: 'تقریبی',
    });
    assert.equal(conv.status, 201, JSON.stringify(conv.data));
    assert.equal(conv.data.conversion.isExact, false);
  });

  it('rejects a self-referential conversion', async (t) => {
    if (!dbOk) return t.skip('no database');
    const list = await json('GET', '/api/v1/uom');
    const kgUom = list.data.items.find((u) => u.code === 'KG');
    const res = await json('POST', '/api/v1/uom/conversions', { fromUomId: kgUom.id, toUomId: kgUom.id, numerator: 1 });
    assert.equal(res.status, 400);
  });

  it('rejects a conversion referencing an unknown UOM', async (t) => {
    if (!dbOk) return t.skip('no database');
    const list = await json('GET', '/api/v1/uom');
    const kgUom = list.data.items.find((u) => u.code === 'KG');
    const res = await json('POST', '/api/v1/uom/conversions', { fromUomId: kgUom.id, toUomId: 'not-a-real-uom', numerator: 1 });
    assert.equal(res.status, 400);
  });
});

describe('Brand Registry', () => {
  it('creates a Brand with legalName + audit metadata', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('POST', '/api/v1/brands', { brandName: `برند-${uniq()}`, legalName: 'شرکت تست ثبت‌شده' });
    assert.equal(res.status, 201, JSON.stringify(res.data));
    assert.ok(res.data.brand.createdAt);
  });

  it('blocks an exact normalized-name duplicate', async (t) => {
    if (!dbOk) return t.skip('no database');
    const name = `یکتا-${uniq()}`;
    const first = await json('POST', '/api/v1/brands', { brandName: name });
    assert.equal(first.status, 201);
    const dup = await json('POST', '/api/v1/brands', { brandName: `  ${name}  ` });
    assert.equal(dup.status, 409);
    assert.equal(dup.data.error, 'BRAND_DUPLICATE');
  });

  it('warns (does not silently block) on a probable duplicate, and allows explicit override', async (t) => {
    if (!dbOk) return t.skip('no database');
    const base = `مبارکه یکتا ${uniq()}`;
    await json('POST', '/api/v1/brands', { brandName: base });
    const warn = await json('POST', '/api/v1/brands', { brandName: `فولاد ${base}` });
    assert.equal(warn.status, 409);
    assert.equal(warn.data.error, 'BRAND_PROBABLE_DUPLICATE');
    const override = await json('POST', '/api/v1/brands', { brandName: `فولاد ${base}`, confirmDuplicate: true });
    assert.equal(override.status, 201);
  });

  it('deactivate/reactivate a Brand', async (t) => {
    if (!dbOk) return t.skip('no database');
    const created = await json('POST', '/api/v1/brands', { brandName: `فعالسازی-${uniq()}` });
    const off = await json('PATCH', `/api/v1/brands/${created.data.brand.id}`, { isActive: false });
    assert.equal(off.data.brand.isActive, false);
    const on = await json('PATCH', `/api/v1/brands/${created.data.brand.id}`, { isActive: true });
    assert.equal(on.data.brand.isActive, true);
  });
});

describe('Product Relationships', () => {
  let productA; let productB; let productC;

  // Each relationship-test product uses its OWN Product Type with no bound
  // attributes, so each Type's canonical identity key is naturally distinct
  // (identity = Type + identity-relevant attrs; with zero attrs, two
  // products of the SAME Type would correctly collide as exact duplicates —
  // that correct behavior is exercised elsewhere, not here).
  async function makeProduct(label) {
    const g = await json('POST', '/api/v1/product-taxonomy/groups', { name: `گروه-rel-${label}-${uniq()}` });
    const c = await json('POST', '/api/v1/product-taxonomy/categories', { groupId: g.data.group.id, name: `دسته-rel-${label}-${uniq()}` });
    const ty = await json('POST', '/api/v1/product-taxonomy/types', { categoryId: c.data.category.id, name: `نوع-rel-${label}-${uniq()}` });
    const p = await json('POST', '/api/v1/products', { productTypeId: ty.data.productType.id, displayNameOverride: label });
    return p.data.product;
  }

  before(async () => {
    if (!dbOk) return;
    productA = await makeProduct('A');
    productB = await makeProduct('B');
    productC = await makeProduct('C');
  });

  it('creates an ALTERNATIVE relationship', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('POST', '/api/v1/products/relationships', {
      sourceProductId: productA.id, targetProductId: productB.id, relationshipType: 'ALTERNATIVE',
    });
    assert.equal(res.status, 201, JSON.stringify(res.data));
  });

  it('rejects a self-link', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('POST', '/api/v1/products/relationships', {
      sourceProductId: productA.id, targetProductId: productA.id, relationshipType: 'SUBSTITUTE',
    });
    assert.equal(res.status, 400);
    assert.equal(res.data.error, 'PRODUCT_RELATIONSHIP_SELF');
  });

  it('rejects a duplicate relation record', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('POST', '/api/v1/products/relationships', {
      sourceProductId: productA.id, targetProductId: productB.id, relationshipType: 'ALTERNATIVE',
    });
    assert.equal(res.status, 409);
    assert.equal(res.data.error, 'PRODUCT_RELATIONSHIP_DUPLICATE');
  });

  it('creates a SUBSTITUTE_WITH_CONVERSION relationship with a conversion ratio', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('POST', '/api/v1/products/relationships', {
      sourceProductId: productB.id, targetProductId: productA.id, relationshipType: 'SUBSTITUTE_WITH_CONVERSION',
      conversionNumerator: 2, conversionDenominator: 1, notes: '۲ برگ ۶ متری معادل ۱ برگ ۱۲ متری',
    });
    assert.equal(res.status, 201, JSON.stringify(res.data));
  });

  it('rejects SUBSTITUTE_WITH_CONVERSION without a conversion ratio', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('POST', '/api/v1/products/relationships', {
      sourceProductId: productA.id, targetProductId: productC.id, relationshipType: 'SUBSTITUTE_WITH_CONVERSION',
    });
    assert.equal(res.status, 400);
  });

  it('lists relationships for a product (both directions)', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('GET', `/api/v1/products/${productA.id}/relationships`);
    assert.equal(res.status, 200);
    assert.ok(res.data.items.length >= 2);
  });
});

describe('Bulk Import / Mass Update', () => {
  let groupName; let categoryName; let typeName; let typeId; let attrId; let attrCode;

  before(async () => {
    if (!dbOk) return;
    groupName = `گروه-bulk-${uniq()}`;
    categoryName = `دسته-bulk-${uniq()}`;
    typeName = `نوع-bulk-${uniq()}`;
    attrCode = `bulk_attr_${uniq()}`;
    const g = await json('POST', '/api/v1/product-taxonomy/groups', { name: groupName });
    const c = await json('POST', '/api/v1/product-taxonomy/categories', { groupId: g.data.group.id, name: categoryName });
    const ty = await json('POST', '/api/v1/product-taxonomy/types', { categoryId: c.data.category.id, name: typeName });
    typeId = ty.data.productType.id;
    const attr = await json('POST', '/api/v1/attribute-definitions', { code: attrCode, nameFa: 'ویژگی دسته‌ای', dataType: 'DECIMAL' });
    attrId = attr.data.attributeDefinition.id;
    await json('POST', '/api/v1/attribute-definitions/bindings', {
      productTypeId: typeId, attributeDefinitionId: attrId, isRequired: true, isIdentityRelevant: true, isDisplayRelevant: true,
    });
  });

  it('DRY_RUN previews accept/reject without persisting anything', async (t) => {
    if (!dbOk) return t.skip('no database');
    const rows = [
      { groupName, categoryName, typeName, attributes: { [attrCode]: 5 } },
      { groupName, categoryName, typeName: 'نوع ناموجود بدلی', attributes: { [attrCode]: 7 } },
    ];
    const res = await json('POST', '/api/v1/products/bulk-import', { mode: 'DRY_RUN', rows });
    assert.equal(res.status, 201, JSON.stringify(res.data));
    assert.equal(res.data.batch.mode, 'DRY_RUN');
    assert.equal(res.data.batch.acceptedRows, 1);
    assert.equal(res.data.batch.rejectedRows, 1);

    const check = await json('GET', `/api/v1/products?productTypeId=${typeId}`);
    assert.equal(check.data.items.length, 0, 'dry run must not persist any product');
  });

  it('APPLY persists accepted rows and reports row-level results', async (t) => {
    if (!dbOk) return t.skip('no database');
    const rows = [
      { groupName, categoryName, typeName, attributes: { [attrCode]: 5 } },
      { groupName, categoryName, typeName: 'نوع ناموجود بدلی', attributes: { [attrCode]: 7 } },
    ];
    const res = await json('POST', '/api/v1/products/bulk-import', { mode: 'APPLY', rows });
    assert.equal(res.status, 201, JSON.stringify(res.data));
    assert.equal(res.data.batch.acceptedRows, 1);
    assert.equal(res.data.batch.rejectedRows, 1);
    assert.equal(res.data.batch.rowResults[0].status, 'ACCEPTED');
    assert.equal(res.data.batch.rowResults[1].status, 'REJECTED');
  });

  it('re-APPLY of the same row is idempotent (duplicate row skipped, not a hard failure)', async (t) => {
    if (!dbOk) return t.skip('no database');
    const rows = [{ groupName, categoryName, typeName, attributes: { [attrCode]: 5 } }];
    const res = await json('POST', '/api/v1/products/bulk-import', { mode: 'APPLY', rows });
    assert.equal(res.status, 201);
    assert.equal(res.data.batch.rowResults[0].status, 'DUPLICATE_SKIPPED');
  });

  it('malformed row is rejected with a clear error, not silently imported', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('POST', '/api/v1/products/bulk-import', { mode: 'APPLY', rows: [{ groupName: '' }] });
    assert.equal(res.status, 201);
    assert.equal(res.data.batch.rowResults[0].status, 'REJECTED');
  });

  it('every bulk import run is audited (batch retrievable by id)', async (t) => {
    if (!dbOk) return t.skip('no database');
    const rows = [{ groupName, categoryName, typeName, attributes: { [attrCode]: 55 } }];
    const res = await json('POST', '/api/v1/products/bulk-import', { mode: 'APPLY', rows });
    const fetched = await json('GET', `/api/v1/products/bulk-import/${res.data.batch.id}`);
    assert.equal(fetched.status, 200);
    assert.equal(fetched.data.batch.id, res.data.batch.id);
  });
});

describe('Server-owned field audit on Product update (Task 2 — report-only baseline)', () => {
  // `sku` gets an explicit REJECTION (see the SKU_IMMUTABLE tests above).
  // These other server-owned fields are audited here to document their
  // CURRENT actual behavior — accepted-and-silently-ignored (Zod strips
  // unknown keys) — WITHOUT changing their contract, per this hardening
  // pass's scope (task explicitly frames this as report-only unless a
  // consistency issue is found; none was — see final report). If a future
  // pass decides to align them with the sku fix, these tests intentionally
  // pin today's baseline so that change is visible as a deliberate diff,
  // not an accidental regression.
  let productId; let productTypeId; let categoryId; let originalCanonicalKey; let originalCreatedBy;

  before(async () => {
    if (!dbOk) return;
    const g = await json('POST', '/api/v1/product-taxonomy/groups', { name: `گروه-fieldaudit-${uniq()}` });
    const c = await json('POST', '/api/v1/product-taxonomy/categories', { groupId: g.data.group.id, name: `دسته-fieldaudit-${uniq()}` });
    categoryId = c.data.category.id;
    const ty = await json('POST', '/api/v1/product-taxonomy/types', { categoryId, name: `نوع-fieldaudit-${uniq()}` });
    productTypeId = ty.data.productType.id;
    const p = await json('POST', '/api/v1/products', { productTypeId });
    productId = p.data.product.id;
    originalCanonicalKey = p.data.product.canonicalIdentityKey;
    originalCreatedBy = p.data.product.createdBy;
  });

  it('`id` in the PATCH body is accepted-and-ignored (200), not rejected', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('PATCH', `/api/v1/products/${productId}`, { id: 'prod_fake_hacked' });
    assert.equal(res.status, 200, JSON.stringify(res.data));
    assert.equal(res.data.product.id, productId, 'id must not actually change');
  });

  it('`canonicalIdentityKey` in the PATCH body is accepted-and-ignored (200), not rejected', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('PATCH', `/api/v1/products/${productId}`, { canonicalIdentityKey: 'HACKED::KEY' });
    assert.equal(res.status, 200, JSON.stringify(res.data));
    assert.equal(res.data.product.canonicalIdentityKey, originalCanonicalKey, 'canonicalIdentityKey must not actually change');
  });

  it('`createdBy` in the PATCH body is accepted-and-ignored (200), not rejected', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('PATCH', `/api/v1/products/${productId}`, { createdBy: 'u_someone_else' });
    assert.equal(res.status, 200, JSON.stringify(res.data));
    assert.equal(res.data.product.createdBy, originalCreatedBy, 'createdBy must not actually change');
  });

  it('`productTypeId` in the PATCH body is accepted-and-ignored (200), not rejected (same class of field as sku/id — not required by this pass to change)', async (t) => {
    if (!dbOk) return t.skip('no database');
    const otherType = await json('POST', '/api/v1/product-taxonomy/types', { categoryId, name: `نوع-fieldaudit-other-${uniq()}` });
    const res = await json('PATCH', `/api/v1/products/${productId}`, { productTypeId: otherType.data.productType.id });
    assert.equal(res.status, 200, JSON.stringify(res.data));
    assert.equal(res.data.product.productTypeId, productTypeId, 'productTypeId must not actually change');
  });
});

describe('Governance — audit trail', () => {
  it('product.create writes an audit_log row', async (t) => {
    if (!dbOk) return t.skip('no database');
    const g = await json('POST', '/api/v1/product-taxonomy/groups', { name: `گروه-audit-${uniq()}` });
    const c = await json('POST', '/api/v1/product-taxonomy/categories', { groupId: g.data.group.id, name: `دسته-audit-${uniq()}` });
    const ty = await json('POST', '/api/v1/product-taxonomy/types', { categoryId: c.data.category.id, name: `نوع-audit-${uniq()}` });
    const p = await json('POST', '/api/v1/products', { productTypeId: ty.data.productType.id });
    assert.equal(p.status, 201);

    const { query } = await import('../db/pool.js');
    const audit = await query(`SELECT action FROM audit_log WHERE entity_type = 'product' AND entity_id = $1 ORDER BY created_at DESC LIMIT 1`, [p.data.product.id]);
    assert.equal(audit.rows[0]?.action, 'product.create');
  });

  it('brand duplicate override is recorded in the audit detail', async (t) => {
    if (!dbOk) return t.skip('no database');
    const base = `حاکمیت ${uniq()}`;
    await json('POST', '/api/v1/brands', { brandName: base });
    const overridden = await json('POST', '/api/v1/brands', { brandName: `شرکت ${base}`, confirmDuplicate: true });
    assert.equal(overridden.status, 201);

    const { query } = await import('../db/pool.js');
    const audit = await query(`SELECT detail FROM audit_log WHERE entity_type = 'brand' AND entity_id = $1`, [overridden.data.brand.id]);
    assert.equal(audit.rows[0]?.detail?.duplicateOverride, true);
  });
});
