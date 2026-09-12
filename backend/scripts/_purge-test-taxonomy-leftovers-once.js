#!/usr/bin/env node
/**
 * ONE-SHOT: delete leftover Product Master *test* taxonomy groups from the
 * local API. Persian test-name prefixes only. Never matches operator latin
 * names (Carbon Steel Products / Stainless Steel Products).
 */
const BASE = process.env.API_BASE || 'http://localhost:3100/api/v1';
const TEST_TAXONOMY_NAME_RE = /^(گروه-|حذف-|غیرفعال-|تکراری-|RBAC-|دسته-|نوع-)/;
const OPERATOR_NAMES = new Set([
  'مقاطع فولادی',
  'استنلس استیل',
  'چوب',
  'اتصالات فولادی',
  'پیچ و مهره',
]);

function isTestFixtureName(name) {
  const fa = String(name || '').trim();
  if (!fa || OPERATOR_NAMES.has(fa)) return false;
  return TEST_TAXONOMY_NAME_RE.test(fa);
}

async function json(method, path, token, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  return { status: res.status, data };
}

async function deleteProduct(token, id) {
  let del = await json('DELETE', `/products/${id}`, token);
  if (del.status === 409) {
    await json('PATCH', `/products/${id}/deactivate`, token);
    del = await json('DELETE', `/products/${id}`, token);
  }
  return del.status;
}

async function emptyType(token, typeId) {
  const listed = await json(
    'GET',
    `/products?productTypeId=${encodeURIComponent(typeId)}&includeInactive=true&limit=500`,
    token,
  );
  for (const product of listed.data?.items || []) {
    await deleteProduct(token, product.id);
  }
  return json('DELETE', `/product-taxonomy/types/${typeId}`, token);
}

async function emptyCategory(token, categoryId) {
  const types = await json(
    'GET',
    `/product-taxonomy/types?categoryId=${encodeURIComponent(categoryId)}&includeInactive=true`,
    token,
  );
  for (const type of types.data?.items || []) {
    await emptyType(token, type.id);
  }
  return json('DELETE', `/product-taxonomy/categories/${categoryId}`, token);
}

async function emptyGroup(token, groupId) {
  const cats = await json(
    'GET',
    `/product-taxonomy/categories?groupId=${encodeURIComponent(groupId)}&includeInactive=true`,
    token,
  );
  for (const category of cats.data?.items || []) {
    await emptyCategory(token, category.id);
  }
  return json('DELETE', `/product-taxonomy/groups/${groupId}`, token);
}

async function main() {
  const login = await json('POST', '/auth/login', null, { username: 'admin', password: 'Admin123!' });
  if (login.status !== 200) throw new Error(`login ${login.status}`);
  const token = login.data.accessToken || login.data.token;
  const groups = (await json('GET', '/product-taxonomy/groups?includeInactive=true', token)).data?.items || [];
  const deleted = [];
  const skipped = [];

  for (const group of groups) {
    if (!isTestFixtureName(group.name)) {
      skipped.push({ id: group.id, name: group.name, nameLatin: group.nameLatin });
      continue;
    }
    const result = await emptyGroup(token, group.id);
    deleted.push({ id: group.id, name: group.name, status: result.status });
  }

  console.log(JSON.stringify({ deleted, leftAlone: skipped }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
