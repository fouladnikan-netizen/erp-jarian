/**
 * Product Master (Shirazeh taxonomy/attribute/UOM/Brand + Vitrin Product/SKU)
 * integration tests — DDL-24. Requires PostgreSQL + seeded admin/sales_c
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
let salesToken;
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
  try {
    if (dbOk) await fixtures.cleanup(json);
  } catch (err) {
    console.warn('[product-master-fixtures] cleanup failed:', err.message);
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    await pool.end().catch(() => {});
  }
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

  it('stores an optional Latin group name without using it for identity', async (t) => {
    if (!dbOk) return t.skip('no database');
    const fa = `گروه-لاتین-${uniq()}`;
    const res = await json('POST', '/api/v1/product-taxonomy/groups', {
      name: fa,
      nameLatin: 'Carbon Steel Products',
    });
    assert.equal(res.status, 201, JSON.stringify(res.data));
    assert.equal(res.data.group.name, fa);
    assert.equal(res.data.group.nameLatin, 'Carbon Steel Products');
    assert.ok(res.data.group.skuCode);

    const renamed = await json('PATCH', `/api/v1/product-taxonomy/groups/${res.data.group.id}`, {
      nameLatin: 'Stainless Steel Products',
    });
    assert.equal(renamed.status, 200, JSON.stringify(renamed.data));
    assert.equal(renamed.data.group.name, fa);
    assert.equal(renamed.data.group.nameLatin, 'Stainless Steel Products');
  });

  it('stores an optional Latin category name under a Group', async (t) => {
    if (!dbOk) return t.skip('no database');
    const g = await json('POST', '/api/v1/product-taxonomy/groups', { name: `گروه-دسته-لاتین-${uniq()}` });
    assert.equal(g.status, 201, JSON.stringify(g.data));
    const cat = await json('POST', '/api/v1/product-taxonomy/categories', {
      groupId: g.data.group.id,
      name: `دسته-لاتین-${uniq()}`,
      nameLatin: 'Cold Rolled Sheets',
    });
    assert.equal(cat.status, 201, JSON.stringify(cat.data));
    assert.equal(cat.data.category.nameLatin, 'Cold Rolled Sheets');
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

  it('renames a Group and rejects a colliding name', async (t) => {
    if (!dbOk) return t.skip('no database');
    const renamed = await json('PATCH', `/api/v1/product-taxonomy/groups/${groupId}`, { name: `گروه-ویرایش-${uniq()}` });
    assert.equal(renamed.status, 200, JSON.stringify(renamed.data));
    assert.ok(renamed.data.group.name.startsWith('گروه-ویرایش-'));
    assert.match(renamed.data.group.code, /^\d{2}$/);

    const other = await json('POST', '/api/v1/product-taxonomy/groups', { name: `گروه-تداخل-${uniq()}` });
    assert.equal(other.status, 201);
    const collide = await json('PATCH', `/api/v1/product-taxonomy/groups/${groupId}`, { name: other.data.group.name });
    assert.equal(collide.status, 409);
    assert.equal(collide.data.error, 'PRODUCT_GROUP_DUPLICATE');

    const catRename = await json('PATCH', `/api/v1/product-taxonomy/categories/${categoryId}`, { name: `دسته-ویرایش-${uniq()}` });
    assert.equal(catRename.status, 200, JSON.stringify(catRename.data));
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

  it('updates an unused definition (name, code, dataType, enum options)', async (t) => {
    if (!dbOk) return t.skip('no database');
    const created = await json('POST', '/api/v1/attribute-definitions', {
      code: `edit_src_${uniq()}`, nameFa: 'ویژگی ویرایش', dataType: 'STRING',
    });
    assert.equal(created.status, 201, JSON.stringify(created.data));
    const id = created.data.attributeDefinition.id;
    const nextCode = `weight_cls_${uniq()}`;
    const patched = await json('PATCH', `/api/v1/attribute-definitions/${id}`, {
      nameFa: 'کلاس وزنی',
      code: nextCode,
      dataType: 'ENUM',
      allowedValues: [
        { value: 'light', labelFa: 'سبک' },
        { value: 'heavy', labelFa: 'سنگین' },
      ],
    });
    assert.equal(patched.status, 200, JSON.stringify(patched.data));
    assert.equal(patched.data.attributeDefinition.nameFa, 'کلاس وزنی');
    assert.equal(patched.data.attributeDefinition.code, nextCode);
    assert.equal(patched.data.attributeDefinition.dataType, 'ENUM');
    assert.equal(patched.data.attributeDefinition.allowedValues.length, 2);
    assert.equal(patched.data.attributeDefinition.allowedValues[0].value, 'light');
    await json('DELETE', `/api/v1/attribute-definitions/${id}`);
  });

  it('renames an in-use ENUM option and remaps stored product values for display names', async (t) => {
    if (!dbOk) return t.skip('no database');
    const suffix = uniq();
    const g = await json('POST', '/api/v1/product-taxonomy/groups', { name: `گروه-enum-rename-${suffix}` });
    const c = await json('POST', '/api/v1/product-taxonomy/categories', { groupId: g.data.group.id, name: `دسته-enum-rename-${suffix}` });
    const ty = await json('POST', '/api/v1/product-taxonomy/types', { categoryId: c.data.category.id, name: `نوع-enum-rename-${suffix}` });
    const attr = await json('POST', '/api/v1/attribute-definitions', {
      code: `frame_kind_${suffix}`,
      nameFa: 'مدل',
      dataType: 'ENUM',
      allowedValues: [
        { value: 'roman', labelFa: 'چهارچوب رومی' },
        { value: 'french', labelFa: 'چهارچوب فرانسوی' },
      ],
    });
    assert.equal(attr.status, 201, JSON.stringify(attr.data));
    const attrId = attr.data.attributeDefinition.id;
    const bind = await json('POST', '/api/v1/attribute-definitions/bindings', {
      productTypeId: ty.data.productType.id,
      attributeDefinitionId: attrId,
      isRequired: true,
      valueScope: 'PRODUCT',
    });
    assert.equal(bind.status, 201, JSON.stringify(bind.data));
    const created = await json('POST', '/api/v1/products', {
      productTypeId: ty.data.productType.id,
      attributeValues: { [attrId]: 'roman' },
    });
    assert.equal(created.status, 201, JSON.stringify(created.data));
    const productId = created.data.product.id;
    assert.equal(
      (created.data.product.attributeValues || []).find((row) => row.attributeDefinitionId === attrId)?.valueText,
      'roman',
    );

    const patched = await json('PATCH', `/api/v1/attribute-definitions/${attrId}`, {
      allowedValues: [
        { value: 'چهارچوب رومی', labelFa: 'چهارچوب رومی' },
        { value: 'چهارچوب فرانسوی', labelFa: 'چهارچوب فرانسوی' },
      ],
    });
    assert.equal(patched.status, 200, JSON.stringify(patched.data));

    const live = await json('GET', `/api/v1/products/${productId}`);
    assert.equal(live.status, 200, JSON.stringify(live.data));
    const stored = (live.data.product.attributeValues || []).find((row) => row.attributeDefinitionId === attrId);
    assert.equal(stored?.valueText, 'چهارچوب رومی');
    assert.equal(String(live.data.product.generatedName || '').includes('roman'), false);
    assert.equal(String(live.data.product.generatedName || '').includes('چهارچوب رومی'), true);

    await json('DELETE', `/api/v1/products/${productId}`);
    await json('DELETE', `/api/v1/product-taxonomy/types/${ty.data.productType.id}`);
    await json('DELETE', `/api/v1/attribute-definitions/${attrId}`);
    await json('DELETE', `/api/v1/product-taxonomy/categories/${c.data.category.id}`);
    await json('DELETE', `/api/v1/product-taxonomy/groups/${g.data.group.id}`);
  });

  it('binds a numeric definition to a UOM from the registry', async (t) => {
    if (!dbOk) return t.skip('no database');
    const suffix = uniq();
    const mill = await json('POST', '/api/v1/uom', {
      code: `MM${suffix.toUpperCase().slice(0, 5)}`,
      nameFa: 'میل تست',
      category: 'LENGTH',
    });
    assert.equal(mill.status, 201, JSON.stringify(mill.data));
    const millId = mill.data.uom.id;
    const created = await json('POST', '/api/v1/attribute-definitions', {
      code: `size_uom_${suffix}`, nameFa: 'سایز', dataType: 'DECIMAL',
    });
    assert.equal(created.status, 201, JSON.stringify(created.data));
    const id = created.data.attributeDefinition.id;
    const patched = await json('PATCH', `/api/v1/attribute-definitions/${id}`, { uomId: millId });
    assert.equal(patched.status, 200, JSON.stringify(patched.data));
    assert.equal(patched.data.attributeDefinition.uomId, millId);
    const cleared = await json('PATCH', `/api/v1/attribute-definitions/${id}`, { uomId: null });
    assert.equal(cleared.status, 200, JSON.stringify(cleared.data));
    assert.equal(cleared.data.attributeDefinition.uomId, null);
    await json('DELETE', `/api/v1/attribute-definitions/${id}`);
    await json('DELETE', `/api/v1/uom/${millId}`);
  });

  it('rejects a duplicate code on definition update', async (t) => {
    if (!dbOk) return t.skip('no database');
    const first = await json('POST', '/api/v1/attribute-definitions', {
      code: `dup_a_${uniq()}`, nameFa: 'اولی', dataType: 'STRING',
    });
    const second = await json('POST', '/api/v1/attribute-definitions', {
      code: `dup_b_${uniq()}`, nameFa: 'دومی', dataType: 'STRING',
    });
    assert.equal(first.status, 201);
    assert.equal(second.status, 201);
    const clash = await json('PATCH', `/api/v1/attribute-definitions/${second.data.attributeDefinition.id}`, {
      code: first.data.attributeDefinition.code,
    });
    assert.equal(clash.status, 409);
    assert.equal(clash.data.error, 'ATTRIBUTE_DEFINITION_DUPLICATE');
    await json('DELETE', `/api/v1/attribute-definitions/${first.data.attributeDefinition.id}`);
    await json('DELETE', `/api/v1/attribute-definitions/${second.data.attributeDefinition.id}`);
  });

  it('rejects dataType change once a product uses the definition; code and name stay editable', async (t) => {
    if (!dbOk) return t.skip('no database');
    const g = await json('POST', '/api/v1/product-taxonomy/groups', { name: `گروه-edit-${uniq()}` });
    const c = await json('POST', '/api/v1/product-taxonomy/categories', { groupId: g.data.group.id, name: `دسته-edit-${uniq()}` });
    const ty = await json('POST', '/api/v1/product-taxonomy/types', { categoryId: c.data.category.id, name: `نوع-edit-${uniq()}` });
    const attr = await json('POST', '/api/v1/attribute-definitions', {
      code: `used_attr_${uniq()}`, nameFa: 'ضخامت ویرایش', dataType: 'DECIMAL',
    });
    assert.equal(attr.status, 201, JSON.stringify(attr.data));
    const bind = await json('POST', '/api/v1/attribute-definitions/bindings', {
      productTypeId: ty.data.productType.id,
      attributeDefinitionId: attr.data.attributeDefinition.id,
      isRequired: true,
    });
    assert.equal(bind.status, 201, JSON.stringify(bind.data));
    const product = await json('POST', '/api/v1/products', {
      productTypeId: ty.data.productType.id,
      attributeValues: { [attr.data.attributeDefinition.id]: 6 },
    });
    assert.equal(product.status, 201, JSON.stringify(product.data));

    const rename = await json('PATCH', `/api/v1/attribute-definitions/${attr.data.attributeDefinition.id}`, {
      nameFa: 'ضخامت اصلاح‌شده',
    });
    assert.equal(rename.status, 200, JSON.stringify(rename.data));
    assert.equal(rename.data.attributeDefinition.nameFa, 'ضخامت اصلاح‌شده');

    const recode = await json('PATCH', `/api/v1/attribute-definitions/${attr.data.attributeDefinition.id}`, {
      code: `used_attr_new_${uniq()}`,
    });
    assert.equal(recode.status, 200, JSON.stringify(recode.data));
    assert.match(recode.data.attributeDefinition.code, /^used_attr_new_/);

    const live = await json('GET', `/api/v1/products/${product.data.product.id}`);
    assert.equal(live.status, 200, JSON.stringify(live.data));

    const typeChange = await json('PATCH', `/api/v1/attribute-definitions/${attr.data.attributeDefinition.id}`, {
      dataType: 'STRING',
    });
    assert.equal(typeChange.status, 409, JSON.stringify(typeChange.data));
    assert.equal(typeChange.data.error, 'ATTRIBUTE_DEFINITION_IN_USE');

    await json('DELETE', `/api/v1/products/${product.data.product.id}`);
    await json('DELETE', `/api/v1/product-taxonomy/types/${ty.data.productType.id}`);
    await json('DELETE', `/api/v1/attribute-definitions/${attr.data.attributeDefinition.id}`);
    await json('DELETE', `/api/v1/product-taxonomy/categories/${c.data.category.id}`);
    await json('DELETE', `/api/v1/product-taxonomy/groups/${g.data.group.id}`);
  });

  it('binds attributes to the Product Type (schema) — required is not identity', async (t) => {
    if (!dbOk) return t.skip('no database');
    const b1 = await json('POST', '/api/v1/attribute-definitions/bindings', {
      productTypeId: typeId, attributeDefinitionId: thicknessAttrId, isRequired: true, isIdentityRelevant: true, sortOrder: 10,
    });
    assert.equal(b1.status, 201, JSON.stringify(b1.data));
    assert.equal(b1.data.binding.isRequired, true);
    assert.equal(b1.data.binding.isIdentityRelevant, true);
    assert.equal(b1.data.binding.valueScope, 'PRODUCT');
    assert.equal(b1.data.binding.isDisplayRelevant, true);

    const b2 = await json('POST', '/api/v1/attribute-definitions/bindings', {
      productTypeId: typeId, attributeDefinitionId: widthAttrId, isRequired: true, isIdentityRelevant: true, sortOrder: 20,
    });
    assert.equal(b2.status, 201);

    const b3 = await json('POST', '/api/v1/attribute-definitions/bindings', {
      productTypeId: typeId, attributeDefinitionId: standardAttrId, isRequired: false, sortOrder: 30,
    });
    assert.equal(b3.status, 201);
    assert.equal(b3.data.binding.isRequired, false);
    assert.equal(b3.data.binding.isIdentityRelevant, false);
    assert.equal(b3.data.binding.isDisplayRelevant, true);
  });

  it('rejects a duplicate binding of the same attribute to the same Type', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('POST', '/api/v1/attribute-definitions/bindings', {
      productTypeId: typeId, attributeDefinitionId: thicknessAttrId,
    });
    assert.equal(res.status, 409);
  });

  it('TRANSACTION binding is never identity even if the client requests it (DDL-24h / DDL-49)', async (t) => {
    if (!dbOk) return t.skip('no database');
    const g = await json('POST', '/api/v1/product-taxonomy/groups', { name: `گروه-txn-${uniq()}` });
    const c = await json('POST', '/api/v1/product-taxonomy/categories', { groupId: g.data.group.id, name: `دسته-txn-${uniq()}` });
    const ty = await json('POST', '/api/v1/product-taxonomy/types', { categoryId: c.data.category.id, name: `نوع-txn-${uniq()}` });
    const cutLenAttr = await json('POST', '/api/v1/attribute-definitions', {
      code: `cut_len_${uniq()}`, nameFa: 'طول برش سفارشی', dataType: 'DECIMAL',
    });
    assert.equal(cutLenAttr.status, 201);
    const identityRes = await json('POST', '/api/v1/attribute-definitions/bindings', {
      productTypeId: ty.data.productType.id, attributeDefinitionId: cutLenAttr.data.attributeDefinition.id,
      valueScope: 'TRANSACTION', isIdentityRelevant: true,
    });
    assert.equal(identityRes.status, 201, JSON.stringify(identityRes.data));
    assert.equal(identityRes.data.binding.isIdentityRelevant, false);
    assert.equal(identityRes.data.binding.valueScope, 'TRANSACTION');
    await json('DELETE', `/api/v1/product-taxonomy/types/${ty.data.productType.id}`);
    await json('DELETE', `/api/v1/attribute-definitions/${cutLenAttr.data.attributeDefinition.id}`);
    await json('DELETE', `/api/v1/product-taxonomy/categories/${c.data.category.id}`);
    await json('DELETE', `/api/v1/product-taxonomy/groups/${g.data.group.id}`);
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
      assert.match(res.data.product.sku, /^[A-Za-z][A-Za-z0-9]*(-[A-Za-z0-9]+)+$/);
      assert.match(res.data.product.sku, /-6-1000$/);
      assert.ok(res.data.product.generatedName.includes('۶'));
      assert.ok(res.data.product.generatedName.includes('DIN'));
      assert.doesNotMatch(res.data.product.sku, /DIN/i);
      globalThis.__testProductA = res.data.product;
    });

    it('exact duplicate (ASCII "6.00") reuses the existing Product', async (t) => {
      if (!dbOk) return t.skip('no database');
      const res = await json('POST', '/api/v1/products', {
        productTypeId: typeId, attributeValues: { [thicknessAttrId]: '6.00', [widthAttrId]: 1000, [standardAttrId]: 'ASTM' },
      });
      assert.equal(res.status, 201);
      assert.equal(res.data.product.id, globalThis.__testProductA.id);
    });

    it('exact duplicate with Persian digits ("۶") also reuses the existing Product', async (t) => {
      if (!dbOk) return t.skip('no database');
      const res = await json('POST', '/api/v1/products', {
        productTypeId: typeId, attributeValues: { [thicknessAttrId]: '۶', [widthAttrId]: '۱۰۰۰' },
      });
      assert.equal(res.status, 201);
      assert.equal(res.data.product.id, globalThis.__testProductA.id);
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

    it('DELETE on an unknown product is 404 (DDL-24n conditional hard delete)', async (t) => {
      if (!dbOk) return t.skip('no database');
      const res = await json('DELETE', '/api/v1/products/prd_does_not_exist');
      assert.equal(res.status, 404);
    });

    it('structured search: combined Type + attribute filter finds the product', async (t) => {
      if (!dbOk) return t.skip('no database');
      const res = await json('GET', `/api/v1/products?productTypeId=${typeId}&text=${encodeURIComponent('6')}`);
      assert.equal(res.status, 200);
      assert.ok(res.data.items.length >= 1);
    });

    it('structured search: groupId or categoryId scopes the list without productTypeId', async (t) => {
      if (!dbOk) return t.skip('no database');
      const suffix = uniq();
      const g = await json('POST', '/api/v1/product-taxonomy/groups', { name: `گروه-scope-list-${suffix}` });
      const c = await json('POST', '/api/v1/product-taxonomy/categories', {
        groupId: g.data.group.id, name: `دسته-scope-list-${suffix}`,
      });
      const ty = await json('POST', '/api/v1/product-taxonomy/types', {
        categoryId: c.data.category.id, name: `نوع-scope-list-${suffix}`,
      });
      const created = await json('POST', '/api/v1/products', { productTypeId: ty.data.productType.id });
      assert.equal(created.status, 201, JSON.stringify(created.data));
      const productId = created.data.product.id;

      const byGroup = await json('GET', `/api/v1/products?groupId=${g.data.group.id}`);
      assert.equal(byGroup.status, 200, JSON.stringify(byGroup.data));
      assert.ok(byGroup.data.items.some((p) => p.id === productId), 'group-only filter must return products under the group');

      const byCategory = await json('GET', `/api/v1/products?categoryId=${c.data.category.id}`);
      assert.equal(byCategory.status, 200, JSON.stringify(byCategory.data));
      assert.ok(byCategory.data.items.some((p) => p.id === productId), 'category-only filter must return products under the category');

      const other = await json('POST', '/api/v1/product-taxonomy/groups', { name: `گروه-خالی-${suffix}` });
      assert.equal(other.status, 201, JSON.stringify(other.data));
      const emptyGroup = await json('GET', `/api/v1/products?groupId=${other.data.group.id}`);
      assert.equal(emptyGroup.status, 200, JSON.stringify(emptyGroup.data));
      assert.equal(emptyGroup.data.items.length, 0);

      await json('DELETE', `/api/v1/products/${productId}`);
      await json('DELETE', `/api/v1/product-taxonomy/types/${ty.data.productType.id}`);
      await json('DELETE', `/api/v1/product-taxonomy/categories/${c.data.category.id}`);
      await json('DELETE', `/api/v1/product-taxonomy/groups/${g.data.group.id}`);
      await json('DELETE', `/api/v1/product-taxonomy/groups/${other.data.group.id}`);
    });
  });

  after(async () => {
    if (!dbOk) return;
    if (typeId) {
      const listed = await json('GET', `/api/v1/products?productTypeId=${typeId}&includeInactive=true&limit=200`);
      for (const product of listed.data?.items || []) {
        await json('DELETE', `/api/v1/products/${product.id}`);
      }
      await json('DELETE', `/api/v1/product-taxonomy/types/${typeId}`);
    }
    for (const id of [thicknessAttrId, widthAttrId, standardAttrId]) {
      if (id) await json('DELETE', `/api/v1/attribute-definitions/${id}`);
    }
    if (categoryId) await json('DELETE', `/api/v1/product-taxonomy/categories/${categoryId}`);
    if (groupId) await json('DELETE', `/api/v1/product-taxonomy/groups/${groupId}`);
  });
});

describe('Product list size order', () => {
  it('search includes size values and returns smaller sizes first', async (t) => {
    if (!dbOk) return t.skip('no database');
    const tag = uniq();
    const g = await json('POST', '/api/v1/product-taxonomy/groups', { name: `گروه-سایز-${tag}` });
    const c = await json('POST', '/api/v1/product-taxonomy/categories', { groupId: g.data.group.id, name: `دسته-سایز-${tag}` });
    const ty = await json('POST', '/api/v1/product-taxonomy/types', { categoryId: c.data.category.id, name: `نوع-سایز-${tag}` });
    try {
      const defs = await json('GET', '/api/v1/attribute-definitions');
      let sizeDef = (defs.data.items || []).find((d) => d.code === 'size');
      if (!sizeDef) {
        const created = await json('POST', '/api/v1/attribute-definitions', { code: 'size', nameFa: 'سایز', dataType: 'DECIMAL' });
        assert.equal(created.status, 201, JSON.stringify(created.data));
        sizeDef = created.data.attributeDefinition;
      }
      const bind = await json('POST', '/api/v1/attribute-definitions/bindings', {
        productTypeId: ty.data.productType.id,
        attributeDefinitionId: sizeDef.id,
        isRequired: true,
      });
      assert.equal(bind.status, 201, JSON.stringify(bind.data));

      const large = await json('POST', '/api/v1/products', {
        productTypeId: ty.data.productType.id,
        attributeValues: { [sizeDef.id]: 40 },
      });
      const small = await json('POST', '/api/v1/products', {
        productTypeId: ty.data.productType.id,
        attributeValues: { [sizeDef.id]: 8 },
      });
      assert.equal(large.status, 201, JSON.stringify(large.data));
      assert.equal(small.status, 201, JSON.stringify(small.data));

      const listed = await json('GET', `/api/v1/products?productTypeId=${ty.data.productType.id}`);
      assert.equal(listed.status, 200);
      const ids = listed.data.items.map((p) => p.id);
      assert.ok(ids.indexOf(small.data.product.id) < ids.indexOf(large.data.product.id));
      const smallRow = listed.data.items.find((p) => p.id === small.data.product.id);
      assert.equal(smallRow.attributeValues.find((v) => v.attributeCode === 'size')?.valueNumber, 8);
    } finally {
      const listed = await json('GET', `/api/v1/products?productTypeId=${ty.data?.productType?.id}&includeInactive=true&limit=200`);
      for (const product of listed.data?.items || []) {
        await json('DELETE', `/api/v1/products/${product.id}`);
      }
      if (ty.data?.productType?.id) await json('DELETE', `/api/v1/product-taxonomy/types/${ty.data.productType.id}`);
      if (c.data?.category?.id) await json('DELETE', `/api/v1/product-taxonomy/categories/${c.data.category.id}`);
      if (g.data?.group?.id) await json('DELETE', `/api/v1/product-taxonomy/groups/${g.data.group.id}`);
    }
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

  it('rejects a Brand that is not on the Product Type allow-list', async (t) => {
    if (!dbOk) return t.skip('no database');
    const suffix = uniq();
    const allowed = await json('POST', '/api/v1/brands', { brandName: `مجاز-${suffix}`, skuCode: `AL${suffix.slice(0, 4)}` });
    const other = await json('POST', '/api/v1/brands', { brandName: `غیرمجاز-${suffix}`, skuCode: `XX${suffix.slice(0, 4)}` });
    assert.equal(allowed.status, 201, JSON.stringify(allowed.data));
    assert.equal(other.status, 201, JSON.stringify(other.data));
    const g = await json('POST', '/api/v1/product-taxonomy/groups', { name: `گروه-brand-${suffix}` });
    const c = await json('POST', '/api/v1/product-taxonomy/categories', { groupId: g.data.group.id, name: `دسته-brand-${suffix}` });
    const ty = await json('POST', '/api/v1/product-taxonomy/types', {
      categoryId: c.data.category.id,
      name: `نوع-brand-${suffix}`,
      allowedBrandIds: [allowed.data.brand.id],
    });
    assert.equal(ty.status, 201, JSON.stringify(ty.data));
    try {
      const bad = await json('POST', '/api/v1/products', {
        productTypeId: ty.data.productType.id,
        brandId: other.data.brand.id,
      });
      assert.equal(bad.status, 400, JSON.stringify(bad.data));
      assert.equal(bad.data.error, 'BRAND_NOT_ALLOWED_FOR_TYPE');
      const ok = await json('POST', '/api/v1/products', {
        productTypeId: ty.data.productType.id,
        brandId: allowed.data.brand.id,
      });
      assert.equal(ok.status, 201, JSON.stringify(ok.data));
      if (ok.data.product?.id) {
        const del = await json('DELETE', `/api/v1/products/${ok.data.product.id}`);
        assert.equal(del.status, 200, JSON.stringify(del.data));
      }
    } finally {
      if (ty.data?.productType?.id) await json('DELETE', `/api/v1/product-taxonomy/types/${ty.data.productType.id}`);
      if (c.data?.category?.id) await json('DELETE', `/api/v1/product-taxonomy/categories/${c.data.category.id}`);
      if (g.data?.group?.id) await json('DELETE', `/api/v1/product-taxonomy/groups/${g.data.group.id}`);
      if (allowed.data?.brand?.id) await json('PATCH', `/api/v1/brands/${allowed.data.brand.id}`, { isActive: false });
      if (other.data?.brand?.id) await json('PATCH', `/api/v1/brands/${other.data.brand.id}`, { isActive: false });
    }
  });
});

describe('Product Relationships retired (DDL-59)', () => {
  it('does not expose relationship routes', async (t) => {
    if (!dbOk) return t.skip('no database');
    const post = await json('POST', '/api/v1/products/relationships', {
      sourceProductId: 'p_a', targetProductId: 'p_b', relationshipType: 'ALTERNATIVE',
    });
    assert.equal(post.status, 404);
    const get = await json('GET', '/api/v1/products/p_a/relationships');
    assert.equal(get.status, 404);
  });
});

describe('Bulk Import / Mass Update', () => {
  let groupName; let categoryName; let typeName; let typeId; let attrId; let attrCode;
  let groupId; let categoryId;

  before(async () => {
    if (!dbOk) return;
    groupName = `گروه-bulk-${uniq()}`;
    categoryName = `دسته-bulk-${uniq()}`;
    typeName = `نوع-bulk-${uniq()}`;
    attrCode = `bulk_attr_${uniq()}`;
    const g = await json('POST', '/api/v1/product-taxonomy/groups', { name: groupName });
    const c = await json('POST', '/api/v1/product-taxonomy/categories', { groupId: g.data.group.id, name: categoryName });
    const ty = await json('POST', '/api/v1/product-taxonomy/types', { categoryId: c.data.category.id, name: typeName });
    groupId = g.data.group.id;
    categoryId = c.data.category.id;
    typeId = ty.data.productType.id;
    const attr = await json('POST', '/api/v1/attribute-definitions', { code: attrCode, nameFa: 'ویژگی دسته‌ای', dataType: 'DECIMAL' });
    attrId = attr.data.attributeDefinition.id;
    await json('POST', '/api/v1/attribute-definitions/bindings', {
      productTypeId: typeId, attributeDefinitionId: attrId, isRequired: true, isIdentityRelevant: true, isDisplayRelevant: true,
    });
  });

  after(async () => {
    if (!dbOk) return;
    if (typeId) {
      const listed = await json('GET', `/api/v1/products?productTypeId=${typeId}&includeInactive=true&limit=200`);
      for (const product of listed.data?.items || []) {
        await json('DELETE', `/api/v1/products/${product.id}`);
      }
      await json('DELETE', `/api/v1/product-taxonomy/types/${typeId}`);
    }
    if (attrId) await json('DELETE', `/api/v1/attribute-definitions/${attrId}`);
    if (categoryId) await json('DELETE', `/api/v1/product-taxonomy/categories/${categoryId}`);
    if (groupId) await json('DELETE', `/api/v1/product-taxonomy/groups/${groupId}`);
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
  let productId; let productTypeId; let categoryId; let groupId; let originalCanonicalKey; let originalCreatedBy;

  before(async () => {
    if (!dbOk) return;
    const g = await json('POST', '/api/v1/product-taxonomy/groups', { name: `گروه-fieldaudit-${uniq()}` });
    const c = await json('POST', '/api/v1/product-taxonomy/categories', { groupId: g.data.group.id, name: `دسته-fieldaudit-${uniq()}` });
    groupId = g.data.group.id;
    categoryId = c.data.category.id;
    const ty = await json('POST', '/api/v1/product-taxonomy/types', { categoryId, name: `نوع-fieldaudit-${uniq()}` });
    productTypeId = ty.data.productType.id;
    const p = await json('POST', '/api/v1/products', { productTypeId });
    productId = p.data.product.id;
    originalCanonicalKey = p.data.product.canonicalIdentityKey;
    originalCreatedBy = p.data.product.createdBy;
  });

  after(async () => {
    if (!dbOk) return;
    if (productId) await json('DELETE', `/api/v1/products/${productId}`);
    if (categoryId) {
      const types = await json('GET', `/api/v1/product-taxonomy/types?categoryId=${encodeURIComponent(categoryId)}&includeInactive=true`);
      for (const type of types.data?.items || []) {
        const listed = await json('GET', `/api/v1/products?productTypeId=${type.id}&includeInactive=true&limit=200`);
        for (const product of listed.data?.items || []) {
          await json('DELETE', `/api/v1/products/${product.id}`);
        }
        await json('DELETE', `/api/v1/product-taxonomy/types/${type.id}`);
      }
      await json('DELETE', `/api/v1/product-taxonomy/categories/${categoryId}`);
    }
    if (groupId) await json('DELETE', `/api/v1/product-taxonomy/groups/${groupId}`);
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
    try {
      assert.equal(p.status, 201);
      const { query } = await import('../db/pool.js');
      const audit = await query(`SELECT action FROM audit_log WHERE entity_type = 'product' AND entity_id = $1 ORDER BY created_at DESC LIMIT 1`, [p.data.product.id]);
      assert.equal(audit.rows[0]?.action, 'product.create');
    } finally {
      if (p.data?.product?.id) await json('DELETE', `/api/v1/products/${p.data.product.id}`);
      if (ty.data?.productType?.id) await json('DELETE', `/api/v1/product-taxonomy/types/${ty.data.productType.id}`);
      if (c.data?.category?.id) await json('DELETE', `/api/v1/product-taxonomy/categories/${c.data.category.id}`);
      if (g.data?.group?.id) await json('DELETE', `/api/v1/product-taxonomy/groups/${g.data.group.id}`);
    }
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

describe('DDL-45 — product-level allowed ENUM subset', () => {
  let groupId;
  let categoryId;
  let typeId;
  let sizeAttrId;
  let gradeAttrId;
  let requiredEnumId;
  let txnGradeId;
  let productId;

  it('creates a type with optional grade, required size, required ENUM class, and TRANSACTION_ONLY ENUM', async (t) => {
    if (!dbOk) return t.skip('no database');
    const suffix = uniq();
    const g = await json('POST', '/api/v1/product-taxonomy/groups', { name: `گروه-grade-${suffix}` });
    const c = await json('POST', '/api/v1/product-taxonomy/categories', { groupId: g.data.group.id, name: `دسته-grade-${suffix}` });
    const ty = await json('POST', '/api/v1/product-taxonomy/types', { categoryId: c.data.category.id, name: `نوع-grade-${suffix}` });
    assert.equal(ty.status, 201, JSON.stringify(ty.data));
    groupId = g.data.group.id;
    categoryId = c.data.category.id;
    typeId = ty.data.productType.id;

    const size = await json('POST', '/api/v1/attribute-definitions', {
      code: `size_g_${suffix}`, nameFa: 'سایز', dataType: 'DECIMAL', minValue: 1,
    });
    sizeAttrId = size.data.attributeDefinition.id;
    const grade = await json('POST', '/api/v1/attribute-definitions', {
      code: `grade_${suffix}`, nameFa: 'گرید', dataType: 'ENUM',
      allowedValues: [
        { value: 'ST37', labelFa: 'ST37' },
        { value: 'A283', labelFa: 'A283' },
        { value: 'A36', labelFa: 'A36' },
        { value: 'A2', labelFa: 'A2' },
      ],
    });
    gradeAttrId = grade.data.attributeDefinition.id;
    const klass = await json('POST', '/api/v1/attribute-definitions', {
      code: `class_${suffix}`, nameFa: 'کلاس', dataType: 'ENUM',
      allowedValues: [{ value: 'A', labelFa: 'A' }, { value: 'B', labelFa: 'B' }],
    });
    requiredEnumId = klass.data.attributeDefinition.id;
    const txn = await json('POST', '/api/v1/attribute-definitions', {
      code: `txn_grade_${suffix}`, nameFa: 'گرید تراکنشی', dataType: 'ENUM',
      allowedValues: [{ value: 'X70', labelFa: 'X70' }, { value: 'X52', labelFa: 'X52' }],
    });
    txnGradeId = txn.data.attributeDefinition.id;

    const bSize = await json('POST', '/api/v1/attribute-definitions/bindings', {
      productTypeId: typeId, attributeDefinitionId: sizeAttrId, isRequired: true, sortOrder: 10,
    });
    const bGrade = await json('POST', '/api/v1/attribute-definitions/bindings', {
      productTypeId: typeId, attributeDefinitionId: gradeAttrId, isRequired: false, sortOrder: 20,
    });
    const bClass = await json('POST', '/api/v1/attribute-definitions/bindings', {
      productTypeId: typeId, attributeDefinitionId: requiredEnumId, isRequired: true, sortOrder: 30,
    });
    const bTxn = await json('POST', '/api/v1/attribute-definitions/bindings', {
      productTypeId: typeId, attributeDefinitionId: txnGradeId,
      attributeRole: 'TRANSACTION_ONLY', isIdentityRelevant: false, sortOrder: 40,
    });
    assert.equal(bSize.status, 201, JSON.stringify(bSize.data));
    assert.equal(bGrade.status, 201, JSON.stringify(bGrade.data));
    assert.equal(bClass.status, 201, JSON.stringify(bClass.data));
    assert.equal(bTxn.status, 201, JSON.stringify(bTxn.data));
  });

  it('rejects an allowed subset on a required ENUM (identity)', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('POST', '/api/v1/products', {
      productTypeId: typeId,
      attributeValues: { [sizeAttrId]: 10, [requiredEnumId]: 'A' },
      allowedAttributeValues: { [requiredEnumId]: ['A'] },
    });
    assert.equal(res.status, 400);
    assert.equal(res.data.error, 'ALLOWED_ATTRIBUTE_IDENTITY_FORBIDDEN');
  });

  it('rejects an allowed subset on a non-ENUM attribute', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('POST', '/api/v1/products', {
      productTypeId: typeId,
      attributeValues: { [sizeAttrId]: 10, [requiredEnumId]: 'A' },
      allowedAttributeValues: { [sizeAttrId]: ['10'] },
    });
    assert.equal(res.status, 400);
    assert.equal(res.data.error, 'ALLOWED_ATTRIBUTE_NOT_ENUM');
  });

  it('rejects an allowed value that is not in the definition catalog', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('POST', '/api/v1/products', {
      productTypeId: typeId,
      attributeValues: { [sizeAttrId]: 10, [requiredEnumId]: 'A' },
      allowedAttributeValues: { [gradeAttrId]: ['ST37', 'NOT_A_GRADE'] },
    });
    assert.equal(res.status, 400);
    assert.equal(res.data.error, 'ATTRIBUTE_ENUM_INVALID');
  });

  it('rejects TRANSACTION_ONLY ENUM as a master value but accepts it as an allowed subset', async (t) => {
    if (!dbOk) return t.skip('no database');
    const asValue = await json('POST', '/api/v1/products', {
      productTypeId: typeId,
      attributeValues: { [sizeAttrId]: 12, [requiredEnumId]: 'A', [txnGradeId]: 'X70' },
    });
    assert.equal(asValue.status, 400);
    assert.equal(asValue.data.error, 'TRANSACTION_ONLY_ATTRIBUTE_ON_MASTER');

    const asSubset = await json('POST', '/api/v1/products', {
      productTypeId: typeId,
      attributeValues: { [sizeAttrId]: 12, [requiredEnumId]: 'B' },
      allowedAttributeValues: { [txnGradeId]: ['X70'] },
    });
    assert.equal(asSubset.status, 201, JSON.stringify(asSubset.data));
    assert.deepEqual(asSubset.data.product.allowedAttributeValues[txnGradeId], ['X70']);
    await json('DELETE', `/api/v1/products/${asSubset.data.product.id}`);
  });

  it('stores the subset without putting it in SKU or generated name', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('POST', '/api/v1/products', {
      productTypeId: typeId,
      attributeValues: { [sizeAttrId]: 14, [requiredEnumId]: 'A' },
      allowedAttributeValues: { [gradeAttrId]: ['A36', 'ST37'] },
    });
    assert.equal(res.status, 201, JSON.stringify(res.data));
    productId = res.data.product.id;
    const selected = [...(res.data.product.allowedAttributeValues[gradeAttrId] || [])].sort();
    assert.deepEqual(selected, ['A36', 'ST37']);
    assert.equal(res.data.product.allowedAttributeGroups[0].attributeNameFa, 'گرید');
    assert.doesNotMatch(res.data.product.sku, /ST37|A36/i);
    assert.equal(res.data.product.generatedName.includes('ST37'), false);
    assert.equal(res.data.product.generatedName.includes('A36'), false);
  });

  it('returns the subset on GET and search', async (t) => {
    if (!dbOk) return t.skip('no database');
    const got = await json('GET', `/api/v1/products/${productId}`);
    assert.equal(got.status, 200);
    assert.ok(got.data.product.allowedAttributeValues[gradeAttrId].includes('ST37'));

    const listed = await json('GET', `/api/v1/products?productTypeId=${encodeURIComponent(typeId)}`);
    assert.equal(listed.status, 200);
    const row = listed.data.items.find((p) => p.id === productId);
    assert.ok(row);
    assert.ok(row.allowedAttributeValues[gradeAttrId].includes('A36'));
  });

  it('replaces and then clears the subset on PATCH', async (t) => {
    if (!dbOk) return t.skip('no database');
    const patched = await json('PATCH', `/api/v1/products/${productId}`, {
      allowedAttributeValues: { [gradeAttrId]: ['A283'] },
    });
    assert.equal(patched.status, 200, JSON.stringify(patched.data));
    assert.deepEqual(patched.data.product.allowedAttributeValues[gradeAttrId], ['A283']);

    const cleared = await json('PATCH', `/api/v1/products/${productId}`, {
      allowedAttributeValues: { [gradeAttrId]: [] },
    });
    assert.equal(cleared.status, 200);
    assert.deepEqual(cleared.data.product.allowedAttributeValues[gradeAttrId] || [], []);
  });

  after(async () => {
    if (!dbOk) return;
    if (productId) await json('DELETE', `/api/v1/products/${productId}`);
    if (typeId) await json('DELETE', `/api/v1/product-taxonomy/types/${typeId}`);
    for (const id of [sizeAttrId, gradeAttrId, requiredEnumId, txnGradeId]) {
      if (id) await json('DELETE', `/api/v1/attribute-definitions/${id}`);
    }
    if (categoryId) await json('DELETE', `/api/v1/product-taxonomy/categories/${categoryId}`);
    if (groupId) await json('DELETE', `/api/v1/product-taxonomy/groups/${groupId}`);
  });
});

describe('DDL-46 — required, value scope, and type-level allowed values', () => {
  let groupId;
  let categoryId;
  let typeId;
  let gradeAttrId;
  let sizeAttrId;
  let bindingId;
  let productId;

  it('binds a required PRODUCT ENUM subset without putting it in SKU', async (t) => {
    if (!dbOk) return t.skip('no database');
    const suffix = uniq();
    const g = await json('POST', '/api/v1/product-taxonomy/groups', { name: `گروه-scope-${suffix}` });
    const c = await json('POST', '/api/v1/product-taxonomy/categories', { groupId: g.data.group.id, name: `دسته-scope-${suffix}` });
    const ty = await json('POST', '/api/v1/product-taxonomy/types', { categoryId: c.data.category.id, name: `نوع-scope-${suffix}` });
    groupId = g.data.group.id;
    categoryId = c.data.category.id;
    typeId = ty.data.productType.id;

    const grade = await json('POST', '/api/v1/attribute-definitions', {
      code: `grade_s_${suffix}`, nameFa: 'گرید', dataType: 'ENUM',
      allowedValues: [
        { value: 'A2', labelFa: 'A2' },
        { value: 'A3', labelFa: 'A3' },
        { value: 'A4', labelFa: 'A4' },
        { value: 'ST37', labelFa: 'ST37' },
      ],
    });
    gradeAttrId = grade.data.attributeDefinition.id;
    const size = await json('POST', '/api/v1/attribute-definitions', {
      code: `size_s_${suffix}`, nameFa: 'سایز', dataType: 'DECIMAL',
    });
    sizeAttrId = size.data.attributeDefinition.id;

    const bGrade = await json('POST', '/api/v1/attribute-definitions/bindings', {
      productTypeId: typeId,
      attributeDefinitionId: gradeAttrId,
      isRequired: true,
      valueScope: 'PRODUCT',
      overrideAllowedValues: ['A2', 'A3', 'A4'],
      sortOrder: 10,
    });
    assert.equal(bGrade.status, 201, JSON.stringify(bGrade.data));
    assert.equal(bGrade.data.binding.isRequired, true);
    assert.equal(bGrade.data.binding.isIdentityRelevant, true);
    assert.equal(bGrade.data.binding.valueScope, 'PRODUCT');
    assert.deepEqual(bGrade.data.binding.overrideAllowedValues, ['A2', 'A3', 'A4']);
    bindingId = bGrade.data.binding.id;

    const bSize = await json('POST', '/api/v1/attribute-definitions/bindings', {
      productTypeId: typeId,
      attributeDefinitionId: sizeAttrId,
      isRequired: true,
      isIdentityRelevant: true,
      valueScope: 'PRODUCT',
      sortOrder: 20,
    });
    assert.equal(bSize.status, 201, JSON.stringify(bSize.data));

    const schema = await json('GET', `/api/v1/attribute-definitions/schema/${typeId}`);
    assert.equal(schema.status, 200);
    const gradeEntry = schema.data.schema.find((e) => e.definition.id === gradeAttrId);
    assert.ok(gradeEntry);
    assert.deepEqual(gradeEntry.binding.effectiveAllowedValues.map((v) => v.value), ['A2', 'A3', 'A4']);
  });

  it('rejects a catalog value outside the type subset', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('POST', '/api/v1/products', {
      productTypeId: typeId,
      attributeValues: { [gradeAttrId]: 'ST37', [sizeAttrId]: 14 },
    });
    assert.equal(res.status, 400);
    assert.equal(res.data.error, 'ATTRIBUTE_ENUM_INVALID');
  });

  it('rejects an override that is not on the definition catalog', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('PATCH', `/api/v1/attribute-definitions/bindings/${bindingId}`, {
      overrideAllowedValues: ['A2', 'X70'],
    });
    assert.equal(res.status, 400);
    assert.equal(res.data.error, 'ATTRIBUTE_ENUM_INVALID');
  });

  it('stores the required PRODUCT value without concatenating it into SKU', async (t) => {
    if (!dbOk) return t.skip('no database');
    const res = await json('POST', '/api/v1/products', {
      productTypeId: typeId,
      attributeValues: { [gradeAttrId]: 'A3', [sizeAttrId]: 14 },
    });
    assert.equal(res.status, 201, JSON.stringify(res.data));
    productId = res.data.product.id;
    const gradeValue = res.data.product.attributeValues.find((v) => v.attributeDefinitionId === gradeAttrId);
    assert.equal(gradeValue?.valueText, 'A3');
    assert.doesNotMatch(res.data.product.sku, /A3/i);
    assert.match(res.data.product.sku, /-14$/);
    assert.ok(res.data.product.generatedName.includes('A3'));
  });

  after(async () => {
    if (!dbOk) return;
    if (productId) await json('DELETE', `/api/v1/products/${productId}`);
    if (typeId) await json('DELETE', `/api/v1/product-taxonomy/types/${typeId}`);
    for (const id of [gradeAttrId, sizeAttrId]) {
      if (id) await json('DELETE', `/api/v1/attribute-definitions/${id}`);
    }
    if (categoryId) await json('DELETE', `/api/v1/product-taxonomy/categories/${categoryId}`);
    if (groupId) await json('DELETE', `/api/v1/product-taxonomy/groups/${groupId}`);
  });
});

describe('DDL-47 — Product Type offer defaults copy onto Product', () => {
  let groupId; let categoryId; let typeId; let productId;
  let branchId; let kgId;

  it('sets Type defaults without rewriting later', async (t) => {
    if (!dbOk) return t.skip('no database');
    const countUom = await json('POST', '/api/v1/uom', {
      code: `C${uniq().toUpperCase().slice(0, 6)}`,
      nameFa: 'شاخه تست عرضه',
      category: 'COUNT',
    });
    const salesUom = await json('POST', '/api/v1/uom', {
      code: `S${uniq().toUpperCase().slice(0, 6)}`,
      nameFa: 'کیلو تست عرضه',
      category: 'WEIGHT',
    });
    assert.equal(countUom.status, 201, JSON.stringify(countUom.data));
    assert.equal(salesUom.status, 201, JSON.stringify(salesUom.data));
    branchId = countUom.data.uom.id;
    kgId = salesUom.data.uom.id;

    const g = await json('POST', '/api/v1/product-taxonomy/groups', { name: `گروه-عرضه-${uniq()}` });
    const c = await json('POST', '/api/v1/product-taxonomy/categories', { groupId: g.data.group.id, name: `دسته-عرضه-${uniq()}` });
    const ty = await json('POST', '/api/v1/product-taxonomy/types', {
      categoryId: c.data.category.id,
      name: `نوع-عرضه-${uniq()}`,
      defaultCountUnitId: branchId,
      defaultSalesUnitId: kgId,
      customLengthAllowed: true,
    });
    assert.equal(ty.status, 201, JSON.stringify(ty.data));
    groupId = g.data.group.id;
    categoryId = c.data.category.id;
    typeId = ty.data.productType.id;
    assert.equal(ty.data.productType.defaultCountUnitId, branchId);
    assert.equal(ty.data.productType.defaultSalesUnitId, kgId);
    assert.equal(ty.data.productType.customLengthAllowed, true);
    assert.equal(ty.data.productType.defaultUnitWeight, null);
  });

  it('copies Type defaults onto a new Product when omitted', async (t) => {
    if (!dbOk) return t.skip('no database');
    const p = await json('POST', '/api/v1/products', { productTypeId: typeId });
    assert.equal(p.status, 201, JSON.stringify(p.data));
    productId = p.data.product.id;
    assert.equal(p.data.product.baseUomId, branchId);
    assert.equal(p.data.product.countUnitId, branchId);
    assert.equal(p.data.product.salesUomId, kgId);
    assert.equal(p.data.product.salesUnitId, kgId);
    assert.equal(p.data.product.unitWeight, null);
    assert.equal(p.data.product.customLengthAllowed, true);
  });

  it('keeps explicit Product offer values over Type defaults', async (t) => {
    if (!dbOk) return t.skip('no database');
    const ty = await json('POST', '/api/v1/product-taxonomy/types', {
      categoryId,
      name: `نوع-عرضه-صریح-${uniq()}`,
      defaultCountUnitId: branchId,
      defaultSalesUnitId: kgId,
      customLengthAllowed: true,
    });
    assert.equal(ty.status, 201, JSON.stringify(ty.data));
    const p = await json('POST', '/api/v1/products', {
      productTypeId: ty.data.productType.id,
      countUnitId: kgId,
      salesUnitId: branchId,
      unitWeight: 15.5,
      customLengthAllowed: false,
    });
    assert.equal(p.status, 201, JSON.stringify(p.data));
    assert.equal(p.data.product.baseUomId, kgId);
    assert.equal(p.data.product.salesUomId, branchId);
    assert.equal(p.data.product.unitWeight, 15.5);
    assert.equal(p.data.product.customLengthAllowed, false);
    await json('DELETE', `/api/v1/products/${p.data.product.id}`);
    await json('DELETE', `/api/v1/product-taxonomy/types/${ty.data.productType.id}`);
  });

  it('does not rewrite existing Products when Type defaults change', async (t) => {
    if (!dbOk) return t.skip('no database');
    const patched = await json('PATCH', `/api/v1/product-taxonomy/types/${typeId}`, {
      defaultCountUnitId: kgId,
      customLengthAllowed: false,
      defaultUnitWeight: 9,
    });
    assert.equal(patched.status, 200, JSON.stringify(patched.data));
    const fresh = await json('GET', `/api/v1/products/${productId}`);
    assert.equal(fresh.status, 200);
    assert.equal(fresh.data.product.baseUomId, branchId);
    assert.equal(fresh.data.product.customLengthAllowed, true);
    assert.equal(fresh.data.product.unitWeight, null);
  });

  it('rejects non-positive unit_weight and unknown UOM ids', async (t) => {
    if (!dbOk) return t.skip('no database');
    const zero = await json('POST', '/api/v1/products', { productTypeId: typeId, unitWeight: 0 });
    assert.equal(zero.status, 400);
    const unknown = await json('POST', '/api/v1/products', { productTypeId: typeId, countUnitId: 'uom_does_not_exist' });
    assert.equal(unknown.status, 400);
    assert.equal(unknown.data.error, 'UOM_NOT_FOUND');
  });

  after(async () => {
    if (!dbOk) return;
    if (productId) await json('DELETE', `/api/v1/products/${productId}`);
    if (typeId) await json('DELETE', `/api/v1/product-taxonomy/types/${typeId}`);
    if (categoryId) await json('DELETE', `/api/v1/product-taxonomy/categories/${categoryId}`);
    if (groupId) await json('DELETE', `/api/v1/product-taxonomy/groups/${groupId}`);
    if (branchId) await json('DELETE', `/api/v1/uom/${branchId}`);
    if (kgId) await json('DELETE', `/api/v1/uom/${kgId}`);
  });
});

describe('DDL-52 — Product Type display-name rule', () => {
  let groupId; let categoryId; let typeId;
  let millId; let gradeId; let thkId; let dimId; let productId;

  it('persists the rule on the Type without embedding Persian labels', async (t) => {
    if (!dbOk) return t.skip('no database');
    const suffix = uniq();
    const mill = await json('POST', '/api/v1/uom', {
      code: `M${suffix.toUpperCase().slice(0, 6)}`,
      nameFa: 'میل',
      category: 'LENGTH',
    });
    assert.equal(mill.status, 201, JSON.stringify(mill.data));
    millId = mill.data.uom.id;

    const g = await json('POST', '/api/v1/product-taxonomy/groups', { name: `گروه-نام-${suffix}` });
    const c = await json('POST', '/api/v1/product-taxonomy/categories', { groupId: g.data.group.id, name: `دسته-نام-${suffix}` });
    const ty = await json('POST', '/api/v1/product-taxonomy/types', {
      categoryId: c.data.category.id,
      name: 'ورق استیل',
    });
    assert.equal(ty.status, 201, JSON.stringify(ty.data));
    groupId = g.data.group.id;
    categoryId = c.data.category.id;
    typeId = ty.data.productType.id;

    const grade = await json('POST', '/api/v1/attribute-definitions', {
      code: `grade_n_${suffix}`, nameFa: 'گرید', dataType: 'ENUM',
      allowedValues: [{ value: '304L', labelFa: '304L' }],
    });
    const thk = await json('POST', '/api/v1/attribute-definitions', {
      code: `thk_n_${suffix}`, nameFa: 'ضخامت', dataType: 'DECIMAL', uomId: millId,
    });
    const dim = await json('POST', '/api/v1/attribute-definitions', {
      code: `dim_n_${suffix}`, nameFa: 'ابعاد', dataType: 'STRING',
    });
    gradeId = grade.data.attributeDefinition.id;
    thkId = thk.data.attributeDefinition.id;
    dimId = dim.data.attributeDefinition.id;

    assert.equal((await json('POST', '/api/v1/attribute-definitions/bindings', {
      productTypeId: typeId, attributeDefinitionId: gradeId, isRequired: true, valueScope: 'PRODUCT', sortOrder: 10,
    })).status, 201);
    assert.equal((await json('POST', '/api/v1/attribute-definitions/bindings', {
      productTypeId: typeId, attributeDefinitionId: thkId, isRequired: true, valueScope: 'PRODUCT', sortOrder: 20,
    })).status, 201);
    assert.equal((await json('POST', '/api/v1/attribute-definitions/bindings', {
      productTypeId: typeId, attributeDefinitionId: dimId, isRequired: false, valueScope: 'PRODUCT', sortOrder: 30,
    })).status, 201);

    const patched = await json('PATCH', `/api/v1/product-taxonomy/types/${typeId}`, {
      displayNameRule: {
        separator: ' ',
        tokens: [
          { sourceType: 'type', labelFa: 'نوع' },
          { sourceType: 'attribute', attributeId: gradeId, nameFa: 'گرید' },
          { sourceType: 'attribute', attributeId: thkId, includeLabel: true },
          { sourceType: 'attribute', attributeId: dimId },
        ],
      },
    });
    assert.equal(patched.status, 200, JSON.stringify(patched.data));
    const rule = patched.data.productType.displayNameRule;
    assert.equal(rule.separator, ' ');
    assert.deepEqual(rule.tokens.map((row) => row.sourceType), ['type', 'attribute', 'attribute', 'attribute']);
    assert.equal(rule.tokens[1].attributeId, gradeId);
    assert.equal(Object.prototype.hasOwnProperty.call(rule.tokens[0], 'labelFa'), false);
    assert.equal(rule.tokens[2].includeLabel, true);
    assert.equal(rule.tokens[2].includeUnit, true);
    assert.equal(Object.prototype.hasOwnProperty.call(rule.tokens[2], 'unitLabel'), false);
  });

  it('generates the Product display name from the Type rule and leaves SKU independent', async (t) => {
    if (!dbOk) return t.skip('no database');
    const created = await json('POST', '/api/v1/products', {
      productTypeId: typeId,
      attributeValues: { [gradeId]: '304L', [thkId]: 2, [dimId]: '1500×3000' },
    });
    assert.equal(created.status, 201, JSON.stringify(created.data));
    productId = created.data.product.id;
    assert.equal(created.data.product.generatedName, 'ورق استیل ۳۰۴L ضخامت ۲ میل ۱۵۰۰×۳۰۰۰');
    assert.notEqual(created.data.product.sku, created.data.product.generatedName);
  });

  it('omits empty optional tokens and rewrites generated_name when the Type rule changes', async (t) => {
    if (!dbOk) return t.skip('no database');
    const withoutDim = await json('POST', '/api/v1/products', {
      productTypeId: typeId,
      attributeValues: { [gradeId]: '304L', [thkId]: 3 },
    });
    assert.equal(withoutDim.status, 201, JSON.stringify(withoutDim.data));
    assert.equal(withoutDim.data.product.generatedName, 'ورق استیل ۳۰۴L ضخامت ۳ میل');

    const previousSku = (await json('GET', `/api/v1/products/${productId}`)).data.product.sku;
    const patched = await json('PATCH', `/api/v1/product-taxonomy/types/${typeId}`, {
      displayNameRule: {
        separator: '·',
        tokens: [
          { sourceType: 'type' },
          { sourceType: 'attribute', attributeId: thkId },
          { sourceType: 'attribute', attributeId: 'attr_deleted_elsewhere' },
        ],
      },
    });
    assert.equal(patched.status, 200, JSON.stringify(patched.data));
    assert.equal(patched.data.productType.displayNameRule.tokens.length, 3);

    const fresh = await json('GET', `/api/v1/products/${productId}`);
    assert.equal(fresh.status, 200);
    assert.equal(fresh.data.product.generatedName, 'ورق استیل · ۲ میل');
    assert.equal(fresh.data.product.sku, previousSku);

    await json('DELETE', `/api/v1/products/${withoutDim.data.product.id}`);
  });

  it('persists display literals as catalog ids without Persian text', async (t) => {
    if (!dbOk) return t.skip('no database');
    if (!typeId || !thkId || !dimId) return t.skip('no display-name fixture');
    const patched = await json('PATCH', `/api/v1/product-taxonomy/types/${typeId}`, {
      displayNameRule: {
        tokens: [
          { sourceType: 'type' },
          { sourceType: 'literal', literalId: 'dims', text: 'ابعاد' },
          { sourceType: 'attribute', attributeId: thkId },
          { sourceType: 'literal', literalId: 'times' },
          { sourceType: 'attribute', attributeId: dimId },
        ],
      },
    });
    assert.equal(patched.status, 200, JSON.stringify(patched.data));
    const tokens = patched.data.productType.displayNameRule.tokens;
    assert.equal(tokens[1].sourceType, 'literal');
    assert.equal(tokens[1].literalId, 'dims');
    assert.equal(Object.prototype.hasOwnProperty.call(tokens[1], 'text'), false);
    assert.equal(tokens[3].literalId, 'times');
  });

  after(async () => {
    if (!dbOk) return;
    if (productId) await json('DELETE', `/api/v1/products/${productId}`);
    if (typeId) {
      const listed = await json('GET', `/api/v1/products?productTypeId=${typeId}&includeInactive=true&limit=200`);
      for (const product of listed.data?.items || []) {
        await json('DELETE', `/api/v1/products/${product.id}`);
      }
      await json('DELETE', `/api/v1/product-taxonomy/types/${typeId}`);
    }
    if (categoryId) await json('DELETE', `/api/v1/product-taxonomy/categories/${categoryId}`);
    if (groupId) await json('DELETE', `/api/v1/product-taxonomy/groups/${groupId}`);
    if (dimId) await json('DELETE', `/api/v1/attribute-definitions/${dimId}`);
    if (thkId) await json('DELETE', `/api/v1/attribute-definitions/${thkId}`);
    if (gradeId) await json('DELETE', `/api/v1/attribute-definitions/${gradeId}`);
    if (millId) await json('DELETE', `/api/v1/uom/${millId}`);
  });
});

describe('DDL-55 — binding default rewrites generated_name', () => {
  it('refreshes catalog names when a TRANSACTION default changes', async (t) => {
    if (!dbOk) return t.skip('no database');
    const suffix = uniq();
    let meter; let g; let c; let typeId; let sizeId; let lengthId; let created;
    meter = await json('POST', '/api/v1/uom', {
      code: `L${suffix.toUpperCase().slice(0, 6)}`,
      nameFa: 'متری',
      category: 'LENGTH',
    });
    assert.equal(meter.status, 201, JSON.stringify(meter.data));
    g = await json('POST', '/api/v1/product-taxonomy/groups', { name: `گروه-پیشفرض-${suffix}` });
    c = await json('POST', '/api/v1/product-taxonomy/categories', { groupId: g.data.group.id, name: `دسته-پیشفرض-${suffix}` });
    const ty = await json('POST', '/api/v1/product-taxonomy/types', {
      categoryId: c.data.category.id,
      name: 'میلگرد ساده تست',
    });
    assert.equal(ty.status, 201, JSON.stringify(ty.data));
    typeId = ty.data.productType.id;
    try {
      const size = await json('POST', '/api/v1/attribute-definitions', {
        code: `sz_d_${suffix}`, nameFa: 'سایز', dataType: 'DECIMAL',
      });
      const length = await json('POST', '/api/v1/attribute-definitions', {
        code: `ln_d_${suffix}`, nameFa: 'طول', dataType: 'DECIMAL', uomId: meter.data.uom.id,
      });
      sizeId = size.data.attributeDefinition.id;
      lengthId = length.data.attributeDefinition.id;
      assert.equal((await json('POST', '/api/v1/attribute-definitions/bindings', {
        productTypeId: typeId, attributeDefinitionId: sizeId, isRequired: true, valueScope: 'PRODUCT', sortOrder: 10,
      })).status, 201);
      const lengthBind = await json('POST', '/api/v1/attribute-definitions/bindings', {
        productTypeId: typeId, attributeDefinitionId: lengthId,
        isRequired: true, valueScope: 'TRANSACTION', sortOrder: 20, overrideDefaultValue: '12',
      });
      assert.equal(lengthBind.status, 201, JSON.stringify(lengthBind.data));
      const rule = await json('PATCH', `/api/v1/product-taxonomy/types/${typeId}`, {
        displayNameRule: {
          separator: ' ',
          tokens: [
            { sourceType: 'type' },
            { sourceType: 'attribute', attributeId: sizeId },
            { sourceType: 'attribute', attributeId: lengthId, includeUnit: true },
          ],
        },
      });
      assert.equal(rule.status, 200, JSON.stringify(rule.data));
      created = await json('POST', '/api/v1/products', {
        productTypeId: typeId,
        attributeValues: { [sizeId]: 8 },
      });
      assert.equal(created.status, 201, JSON.stringify(created.data));
      assert.equal(created.data.product.generatedName, 'میلگرد ساده تست ۸ ۱۲ متری');
      const sku = created.data.product.sku;
      await pool.query('UPDATE products SET generated_name = $2 WHERE id = $1', [created.data.product.id, 'نام کهنه ۱۲ متری']);
      const staleGet = await json('GET', `/api/v1/products/${created.data.product.id}`);
      assert.equal(staleGet.status, 200);
      assert.equal(staleGet.data.product.generatedName, 'میلگرد ساده تست ۸ ۱۲ متری');
      const patched = await json('PATCH', `/api/v1/attribute-definitions/bindings/${lengthBind.data.binding.id}`, {
        overrideDefaultValue: '6',
      });
      assert.equal(patched.status, 200, JSON.stringify(patched.data));
      await pool.query('UPDATE products SET generated_name = $2 WHERE id = $1', [created.data.product.id, 'نام کهنه ۱۲ متری']);
      const listed = await json('GET', `/api/v1/products?productTypeId=${encodeURIComponent(typeId)}`);
      assert.equal(listed.status, 200);
      const row = (listed.data.items || []).find((item) => item.id === created.data.product.id);
      assert.equal(row?.generatedName, 'میلگرد ساده تست ۸ ۶ متری');
      const fresh = await json('GET', `/api/v1/products/${created.data.product.id}`);
      assert.equal(fresh.status, 200);
      assert.equal(fresh.data.product.generatedName, 'میلگرد ساده تست ۸ ۶ متری');
      assert.equal(fresh.data.product.sku, sku);
      assert.equal(
        (fresh.data.product.attributeValues || []).some((row) => row.attributeDefinitionId === lengthId),
        false,
      );
    } finally {
      if (created?.data?.product?.id) await json('DELETE', `/api/v1/products/${created.data.product.id}`);
      if (typeId) await json('DELETE', `/api/v1/product-taxonomy/types/${typeId}`);
      if (c.data?.category?.id) await json('DELETE', `/api/v1/product-taxonomy/categories/${c.data.category.id}`);
      if (g.data?.group?.id) await json('DELETE', `/api/v1/product-taxonomy/groups/${g.data.group.id}`);
      if (lengthId) await json('DELETE', `/api/v1/attribute-definitions/${lengthId}`);
      if (sizeId) await json('DELETE', `/api/v1/attribute-definitions/${sizeId}`);
      if (meter.data?.uom?.id) await json('DELETE', `/api/v1/uom/${meter.data.uom.id}`);
    }
  });
});
