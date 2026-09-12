/**
 * Conditional hard-delete of unused Product Master nodes (DDL-24n).
 * Isolated fixtures — does not reuse the shared catalog from the large
 * product-master suite.
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
    console.warn('[product-master-delete] DB unavailable — skipping:', err.message);
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
    console.warn('[product-master-delete-fixtures] cleanup failed:', err.message);
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    await pool.end().catch(() => {});
  }
});

describe('taxonomy hard delete (DDL-24n)', () => {
  it('deletes an empty group and frees its sku_code for reuse', async (t) => {
    if (!dbOk) return t.skip('no database');
    const skuCode = `Del${uniq().slice(0, 5)}`.replace(/[^A-Za-z0-9]/g, 'X');
    const created = await json('POST', '/api/v1/product-taxonomy/groups', {
      name: `حذف-گروه-${uniq()}`,
      nameLatin: 'Delete Empty Group',
      skuCode,
    });
    assert.equal(created.status, 201, JSON.stringify(created.data));
    const id = created.data.group.id;
    const usedCode = created.data.group.skuCode;

    const del = await json('DELETE', `/api/v1/product-taxonomy/groups/${id}`);
    assert.equal(del.status, 200, JSON.stringify(del.data));

    const reuse = await json('POST', '/api/v1/product-taxonomy/groups', {
      name: `حذف-گروه-دوباره-${uniq()}`,
      skuCode: usedCode,
    });
    assert.equal(reuse.status, 201, JSON.stringify(reuse.data));
    assert.equal(reuse.data.group.skuCode, usedCode);
    await json('DELETE', `/api/v1/product-taxonomy/groups/${reuse.data.group.id}`);
  });

  it('blocks deleting a group that still has categories and lists them', async (t) => {
    if (!dbOk) return t.skip('no database');
    const g = await json('POST', '/api/v1/product-taxonomy/groups', { name: `حذف-گروه-پر-${uniq()}` });
    const c = await json('POST', '/api/v1/product-taxonomy/categories', {
      groupId: g.data.group.id,
      name: `دسته-مسدودکننده-${uniq()}`,
    });
    assert.equal(c.status, 201, JSON.stringify(c.data));

    const del = await json('DELETE', `/api/v1/product-taxonomy/groups/${g.data.group.id}`);
    assert.equal(del.status, 409);
    assert.equal(del.data.error, 'PRODUCT_GROUP_IN_USE');
    assert.match(del.data.message, /دسته/);
    assert.ok(del.data.details.items.some((item) => item.id === c.data.category.id));

    await json('DELETE', `/api/v1/product-taxonomy/categories/${c.data.category.id}`);
    const after = await json('DELETE', `/api/v1/product-taxonomy/groups/${g.data.group.id}`);
    assert.equal(after.status, 200, JSON.stringify(after.data));
  });

  it('blocks deleting a category that still has types', async (t) => {
    if (!dbOk) return t.skip('no database');
    const g = await json('POST', '/api/v1/product-taxonomy/groups', { name: `حذف-دسته-والد-${uniq()}` });
    const c = await json('POST', '/api/v1/product-taxonomy/categories', {
      groupId: g.data.group.id,
      name: `حذف-دسته-${uniq()}`,
    });
    const ty = await json('POST', '/api/v1/product-taxonomy/types', {
      categoryId: c.data.category.id,
      name: `نوع-مسدودکننده-${uniq()}`,
    });
    const del = await json('DELETE', `/api/v1/product-taxonomy/categories/${c.data.category.id}`);
    assert.equal(del.status, 409);
    assert.equal(del.data.error, 'PRODUCT_CATEGORY_IN_USE');
    assert.ok(del.data.details.items.some((item) => item.id === ty.data.productType.id));

    await json('DELETE', `/api/v1/product-taxonomy/types/${ty.data.productType.id}`);
    await json('DELETE', `/api/v1/product-taxonomy/categories/${c.data.category.id}`);
    await json('DELETE', `/api/v1/product-taxonomy/groups/${g.data.group.id}`);
  });

  it('blocks deleting a type that still has products, then deletes the empty type', async (t) => {
    if (!dbOk) return t.skip('no database');
    const g = await json('POST', '/api/v1/product-taxonomy/groups', { name: `حذف-نوع-والد-${uniq()}` });
    const c = await json('POST', '/api/v1/product-taxonomy/categories', {
      groupId: g.data.group.id,
      name: `حذف-نوع-دسته-${uniq()}`,
    });
    const ty = await json('POST', '/api/v1/product-taxonomy/types', {
      categoryId: c.data.category.id,
      name: `حذف-نوع-${uniq()}`,
    });
    const p = await json('POST', '/api/v1/products', {
      productTypeId: ty.data.productType.id,
      displayNameOverride: `کالای تست حذف ${uniq()}`,
    });
    assert.equal(p.status, 201, JSON.stringify(p.data));

    const blocked = await json('DELETE', `/api/v1/product-taxonomy/types/${ty.data.productType.id}`);
    assert.equal(blocked.status, 409);
    assert.equal(blocked.data.error, 'PRODUCT_TYPE_IN_USE');
    assert.ok(blocked.data.details.items.some((item) => item.id === p.data.product.id));

    const delProduct = await json('DELETE', `/api/v1/products/${p.data.product.id}`);
    assert.equal(delProduct.status, 200, JSON.stringify(delProduct.data));

    const delType = await json('DELETE', `/api/v1/product-taxonomy/types/${ty.data.productType.id}`);
    assert.equal(delType.status, 200, JSON.stringify(delType.data));
    await json('DELETE', `/api/v1/product-taxonomy/categories/${c.data.category.id}`);
    await json('DELETE', `/api/v1/product-taxonomy/groups/${g.data.group.id}`);
  });
});

describe('attribute hard delete (DDL-24n)', () => {
  it('deletes an unbound definition and blocks a bound one', async (t) => {
    if (!dbOk) return t.skip('no database');
    const code = `del_attr_${uniq()}`;
    const unbound = await json('POST', '/api/v1/attribute-definitions', {
      code,
      nameFa: `ویژگی آزاد ${uniq()}`,
      dataType: 'STRING',
    });
    assert.equal(unbound.status, 201, JSON.stringify(unbound.data));
    const gone = await json('DELETE', `/api/v1/attribute-definitions/${unbound.data.attributeDefinition.id}`);
    assert.equal(gone.status, 200, JSON.stringify(gone.data));

    const bound = await json('POST', '/api/v1/attribute-definitions', {
      code: `del_bound_${uniq()}`,
      nameFa: `ویژگی متصل ${uniq()}`,
      dataType: 'STRING',
    });
    const g = await json('POST', '/api/v1/product-taxonomy/groups', { name: `حذف-ویژگی-گروه-${uniq()}` });
    const c = await json('POST', '/api/v1/product-taxonomy/categories', {
      groupId: g.data.group.id,
      name: `حذف-ویژگی-دسته-${uniq()}`,
    });
    const ty = await json('POST', '/api/v1/product-taxonomy/types', {
      categoryId: c.data.category.id,
      name: `حذف-ویژگی-نوع-${uniq()}`,
    });
    const bind = await json('POST', '/api/v1/attribute-definitions/bindings', {
      productTypeId: ty.data.productType.id,
      attributeDefinitionId: bound.data.attributeDefinition.id,
      attributeRole: 'MASTER_ONLY',
      isIdentityRelevant: false,
    });
    assert.equal(bind.status, 201, JSON.stringify(bind.data));

    const blocked = await json('DELETE', `/api/v1/attribute-definitions/${bound.data.attributeDefinition.id}`);
    assert.equal(blocked.status, 409);
    assert.equal(blocked.data.error, 'ATTRIBUTE_DEFINITION_IN_USE');
    assert.ok(blocked.data.details.items.some((item) => item.id === ty.data.productType.id));

    await json('DELETE', `/api/v1/product-taxonomy/types/${ty.data.productType.id}`);
    const afterUnbind = await json('DELETE', `/api/v1/attribute-definitions/${bound.data.attributeDefinition.id}`);
    assert.equal(afterUnbind.status, 200, JSON.stringify(afterUnbind.data));
    await json('DELETE', `/api/v1/product-taxonomy/categories/${c.data.category.id}`);
    await json('DELETE', `/api/v1/product-taxonomy/groups/${g.data.group.id}`);
  });

  it('hard-deletes a binding and purges leftover inactive rows on definition delete', async (t) => {
    if (!dbOk) return t.skip('no database');
    const g = await json('POST', '/api/v1/product-taxonomy/groups', { name: `حذف-اتصال-گروه-${uniq()}` });
    const c = await json('POST', '/api/v1/product-taxonomy/categories', {
      groupId: g.data.group.id,
      name: `حذف-اتصال-دسته-${uniq()}`,
    });
    const ty = await json('POST', '/api/v1/product-taxonomy/types', {
      categoryId: c.data.category.id,
      name: `حذف-اتصال-نوع-${uniq()}`,
    });

    const unused = await json('POST', '/api/v1/attribute-definitions', {
      code: `del_unbind_${uniq()}`,
      nameFa: `ویژگی جداشونده ${uniq()}`,
      dataType: 'STRING',
    });
    assert.equal(unused.status, 201, JSON.stringify(unused.data));
    const unusedBind = await json('POST', '/api/v1/attribute-definitions/bindings', {
      productTypeId: ty.data.productType.id,
      attributeDefinitionId: unused.data.attributeDefinition.id,
      attributeRole: 'MASTER_ONLY',
      isIdentityRelevant: false,
    });
    assert.equal(unusedBind.status, 201, JSON.stringify(unusedBind.data));

    const unbound = await json('DELETE', `/api/v1/attribute-definitions/bindings/${unusedBind.data.binding.id}`);
    assert.equal(unbound.status, 200, JSON.stringify(unbound.data));
    const unusedGone = await json('DELETE', `/api/v1/attribute-definitions/${unused.data.attributeDefinition.id}`);
    assert.equal(unusedGone.status, 200, JSON.stringify(unusedGone.data));

    const leftover = await json('POST', '/api/v1/attribute-definitions', {
      code: `del_inactive_${uniq()}`,
      nameFa: `ویژگی خاموش ${uniq()}`,
      dataType: 'STRING',
    });
    const leftoverBind = await json('POST', '/api/v1/attribute-definitions/bindings', {
      productTypeId: ty.data.productType.id,
      attributeDefinitionId: leftover.data.attributeDefinition.id,
      attributeRole: 'MASTER_ONLY',
      isIdentityRelevant: false,
    });
    assert.equal(leftoverBind.status, 201, JSON.stringify(leftoverBind.data));
    const deactivated = await json('PATCH', `/api/v1/attribute-definitions/bindings/${leftoverBind.data.binding.id}`, {
      isActive: false,
    });
    assert.equal(deactivated.status, 200, JSON.stringify(deactivated.data));
    const leftoverGone = await json('DELETE', `/api/v1/attribute-definitions/${leftover.data.attributeDefinition.id}`);
    assert.equal(leftoverGone.status, 200, JSON.stringify(leftoverGone.data));

    const size = await json('POST', '/api/v1/attribute-definitions', {
      code: `del_used_${uniq()}`,
      nameFa: `سایز استفاده‌شده ${uniq()}`,
      dataType: 'DECIMAL',
    });
    const sizeBind = await json('POST', '/api/v1/attribute-definitions/bindings', {
      productTypeId: ty.data.productType.id,
      attributeDefinitionId: size.data.attributeDefinition.id,
      isRequired: true,
      valueScope: 'PRODUCT',
    });
    assert.equal(sizeBind.status, 201, JSON.stringify(sizeBind.data));
    const product = await json('POST', '/api/v1/products', {
      productTypeId: ty.data.productType.id,
      confirmDuplicate: true,
      attributeValues: { [size.data.attributeDefinition.id]: 12 },
    });
    assert.equal(product.status, 201, JSON.stringify(product.data));

    const blockedBind = await json('DELETE', `/api/v1/attribute-definitions/bindings/${sizeBind.data.binding.id}`);
    assert.equal(blockedBind.status, 409, JSON.stringify(blockedBind.data));
    assert.equal(blockedBind.data.error, 'ATTRIBUTE_BINDING_IN_USE');

    const delProduct = await json('DELETE', `/api/v1/products/${product.data.product.id}`);
    assert.equal(delProduct.status, 200, JSON.stringify(delProduct.data));
    const unboundSize = await json('DELETE', `/api/v1/attribute-definitions/bindings/${sizeBind.data.binding.id}`);
    assert.equal(unboundSize.status, 200, JSON.stringify(unboundSize.data));
    const sizeGone = await json('DELETE', `/api/v1/attribute-definitions/${size.data.attributeDefinition.id}`);
    assert.equal(sizeGone.status, 200, JSON.stringify(sizeGone.data));

    await json('DELETE', `/api/v1/product-taxonomy/types/${ty.data.productType.id}`);
    await json('DELETE', `/api/v1/product-taxonomy/categories/${c.data.category.id}`);
    await json('DELETE', `/api/v1/product-taxonomy/groups/${g.data.group.id}`);
  });
});

describe('product hard delete (DDL-24n)', () => {
  it('deletes a product with no orders and blocks one referenced by payload.items', async (t) => {
    if (!dbOk) return t.skip('no database');
    const g = await json('POST', '/api/v1/product-taxonomy/groups', { name: `حذف-کالا-گروه-${uniq()}` });
    const c = await json('POST', '/api/v1/product-taxonomy/categories', {
      groupId: g.data.group.id,
      name: `حذف-کالا-دسته-${uniq()}`,
    });
    const ty = await json('POST', '/api/v1/product-taxonomy/types', {
      categoryId: c.data.category.id,
      name: `حذف-کالا-نوع-${uniq()}`,
    });
    const free = await json('POST', '/api/v1/products', {
      productTypeId: ty.data.productType.id,
      displayNameOverride: `کالای آزاد ${uniq()}`,
      confirmDuplicate: true,
    });
    assert.equal(free.status, 201, JSON.stringify(free.data));
    const delFree = await json('DELETE', `/api/v1/products/${free.data.product.id}`);
    assert.equal(delFree.status, 200, JSON.stringify(delFree.data));

    const used = await json('POST', '/api/v1/products', {
      productTypeId: ty.data.productType.id,
      displayNameOverride: `کالای سفارشی ${uniq()}`,
      confirmDuplicate: true,
    });
    assert.equal(used.status, 201, JSON.stringify(used.data));
    const product = used.data.product;
    const orderId = `ord_del_${uniq()}`;
    const orderCode = `JR-DEL${uniq().slice(0, 6).toUpperCase()}`;
    await pool.query(
      `INSERT INTO orders (id, code, title, payload)
       VALUES ($1, $2, 'delete-guard', $3::jsonb)`,
      [orderId, orderCode, JSON.stringify({ items: [{ productId: product.id, sku: product.sku, name: product.generatedName }] })],
    );

    const blocked = await json('DELETE', `/api/v1/products/${product.id}`);
    assert.equal(blocked.status, 409, JSON.stringify(blocked.data));
    assert.equal(blocked.data.error, 'PRODUCT_IN_USE');
    assert.match(blocked.data.message, /سفارش/);
    assert.ok(blocked.data.details.items.some((item) => item.code === orderCode || item.name === orderCode));

    await pool.query(`UPDATE orders SET deleted_at = NOW() WHERE id = $1`, [orderId]);
    const stillBlocked = await json('DELETE', `/api/v1/products/${product.id}`);
    assert.equal(stillBlocked.status, 409, 'archived orders still block delete');

    await pool.query(`DELETE FROM orders WHERE id = $1`, [orderId]);
    const after = await json('DELETE', `/api/v1/products/${product.id}`);
    assert.equal(after.status, 200, JSON.stringify(after.data));

    await json('DELETE', `/api/v1/product-taxonomy/types/${ty.data.productType.id}`);
    await json('DELETE', `/api/v1/product-taxonomy/categories/${c.data.category.id}`);
    await json('DELETE', `/api/v1/product-taxonomy/groups/${g.data.group.id}`);
  });
});

describe('uom hard delete (DDL-24n)', () => {
  it('deletes an unused unit, blocks one referenced by a product, and allows code reuse', async (t) => {
    if (!dbOk) return t.skip('no database');
    const code = `U${uniq().toUpperCase().slice(0, 6)}`;
    const created = await json('POST', '/api/v1/uom', { code, nameFa: `واحد آزاد ${uniq()}` });
    assert.equal(created.status, 201, JSON.stringify(created.data));
    const id = created.data.uom.id;

    const renamed = await json('PATCH', `/api/v1/uom/${id}`, { nameFa: 'واحد ویرایش‌شده', code: `${code}X` });
    assert.equal(renamed.status, 200, JSON.stringify(renamed.data));
    assert.equal(renamed.data.uom.nameFa, 'واحد ویرایش‌شده');

    const gone = await json('DELETE', `/api/v1/uom/${id}`);
    assert.equal(gone.status, 200, JSON.stringify(gone.data));

    const reuse = await json('POST', '/api/v1/uom', { code: `${code}X`, nameFa: 'واحد دوباره' });
    assert.equal(reuse.status, 201, JSON.stringify(reuse.data));
    await json('DELETE', `/api/v1/uom/${reuse.data.uom.id}`);

    const used = await json('POST', '/api/v1/uom', { code: `P${uniq().toUpperCase().slice(0, 6)}`, nameFa: `واحد کالایی ${uniq()}` });
    const g = await json('POST', '/api/v1/product-taxonomy/groups', { name: `حذف-واحد-گروه-${uniq()}` });
    const c = await json('POST', '/api/v1/product-taxonomy/categories', {
      groupId: g.data.group.id, name: `حذف-واحد-دسته-${uniq()}`,
    });
    const ty = await json('POST', '/api/v1/product-taxonomy/types', {
      categoryId: c.data.category.id, name: `حذف-واحد-نوع-${uniq()}`,
    });
    const product = await json('POST', '/api/v1/products', {
      productTypeId: ty.data.productType.id,
      displayNameOverride: `کالای واحد ${uniq()}`,
      confirmDuplicate: true,
      baseUomId: used.data.uom.id,
    });
    assert.equal(product.status, 201, JSON.stringify(product.data));

    const blocked = await json('DELETE', `/api/v1/uom/${used.data.uom.id}`);
    assert.equal(blocked.status, 409);
    assert.equal(blocked.data.error, 'UOM_IN_USE');

    await json('DELETE', `/api/v1/products/${product.data.product.id}`);
    const afterProduct = await json('DELETE', `/api/v1/uom/${used.data.uom.id}`);
    assert.equal(afterProduct.status, 200, JSON.stringify(afterProduct.data));
    await json('DELETE', `/api/v1/product-taxonomy/types/${ty.data.productType.id}`);
    await json('DELETE', `/api/v1/product-taxonomy/categories/${c.data.category.id}`);
    await json('DELETE', `/api/v1/product-taxonomy/groups/${g.data.group.id}`);
  });
});

describe('brand hard delete (DDL-24n)', () => {
  it('deletes an unused brand, blocks one referenced by a product or type, and allows sku_code reuse', async (t) => {
    if (!dbOk) return t.skip('no database');
    const skuCode = `DelB${uniq().slice(0, 4)}`.replace(/[^A-Za-z0-9]/g, 'X');
    const created = await json('POST', '/api/v1/brands', {
      brandName: `حذف-برند-${uniq()}`,
      nameLatin: `Delete Brand ${uniq()}`,
      skuCode,
      confirmDuplicate: true,
    });
    assert.equal(created.status, 201, JSON.stringify(created.data));
    const id = created.data.brand.id;
    const usedCode = created.data.brand.skuCode;

    const gone = await json('DELETE', `/api/v1/brands/${id}`);
    assert.equal(gone.status, 200, JSON.stringify(gone.data));
    assert.equal(gone.data.ok, true);

    const missing = await json('DELETE', `/api/v1/brands/${id}`);
    assert.equal(missing.status, 404);

    const reuse = await json('POST', '/api/v1/brands', {
      brandName: `حذف-برند-دوباره-${uniq()}`,
      skuCode: usedCode,
      confirmDuplicate: true,
    });
    assert.equal(reuse.status, 201, JSON.stringify(reuse.data));
    assert.equal(reuse.data.brand.skuCode, usedCode);
    await json('DELETE', `/api/v1/brands/${reuse.data.brand.id}`);

    const used = await json('POST', '/api/v1/brands', {
      brandName: `حذف-برند-کالا-${uniq()}`,
      nameLatin: `Used Brand ${uniq()}`,
      confirmDuplicate: true,
    });
    assert.equal(used.status, 201, JSON.stringify(used.data));
    const g = await json('POST', '/api/v1/product-taxonomy/groups', { name: `حذف-برند-گروه-${uniq()}` });
    const c = await json('POST', '/api/v1/product-taxonomy/categories', {
      groupId: g.data.group.id, name: `حذف-برند-دسته-${uniq()}`,
    });
    const ty = await json('POST', '/api/v1/product-taxonomy/types', {
      categoryId: c.data.category.id,
      name: `حذف-برند-نوع-${uniq()}`,
      allowedBrandIds: [used.data.brand.id],
    });
    assert.equal(ty.status, 201, JSON.stringify(ty.data));

    const blockedByType = await json('DELETE', `/api/v1/brands/${used.data.brand.id}`);
    assert.equal(blockedByType.status, 409, JSON.stringify(blockedByType.data));
    assert.equal(blockedByType.data.error, 'BRAND_IN_USE');
    assert.match(blockedByType.data.message, /نوع کالا/);

    const product = await json('POST', '/api/v1/products', {
      productTypeId: ty.data.productType.id,
      displayNameOverride: `کالای برند ${uniq()}`,
      confirmDuplicate: true,
      brandId: used.data.brand.id,
    });
    assert.equal(product.status, 201, JSON.stringify(product.data));

    const blockedByProduct = await json('DELETE', `/api/v1/brands/${used.data.brand.id}`);
    assert.equal(blockedByProduct.status, 409, JSON.stringify(blockedByProduct.data));
    assert.equal(blockedByProduct.data.error, 'BRAND_IN_USE');
    assert.match(blockedByProduct.data.message, /کالا/);
    assert.ok(blockedByProduct.data.details.items.some((item) => item.id === product.data.product.id));

    await json('DELETE', `/api/v1/products/${product.data.product.id}`);
    const stillBlocked = await json('DELETE', `/api/v1/brands/${used.data.brand.id}`);
    assert.equal(stillBlocked.status, 409, JSON.stringify(stillBlocked.data));
    assert.match(stillBlocked.data.message, /نوع کالا/);

    await json('DELETE', `/api/v1/product-taxonomy/types/${ty.data.productType.id}`);
    const after = await json('DELETE', `/api/v1/brands/${used.data.brand.id}`);
    assert.equal(after.status, 200, JSON.stringify(after.data));
    await json('DELETE', `/api/v1/product-taxonomy/categories/${c.data.category.id}`);
    await json('DELETE', `/api/v1/product-taxonomy/groups/${g.data.group.id}`);
  });
});
