#!/usr/bin/env node
/**
 * Idempotent catalog load: میلگرد کلاف grade×size Products via the API.
 * Does not rewrite Type bindings.
 *
 *   node backend/scripts/seed-coil-rebar-products.js
 */
import {
  COIL_REBAR_GRADES,
  COIL_REBAR_GROUP_NAME,
  COIL_REBAR_TYPE_NAME,
  coilRebarIdentityRows,
} from '../src/domain/productMaster/coilRebarCatalog.js';

const BASE = process.env.API_BASE || 'http://localhost:3100/api/v1';

async function req(method, path, token, body) {
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
  if (!res.ok) {
    throw new Error(`${method} ${path} ${res.status} ${JSON.stringify(data)}`);
  }
  return data;
}

function bindingOf(schema, code) {
  return (schema || []).find((entry) => entry.definition?.code === code) || null;
}

async function main() {
  const login = await req('POST', '/auth/login', null, {
    username: process.env.JARIAN_SEED_USER || 'admin',
    password: process.env.JARIAN_SEED_PASSWORD || 'Admin123!',
  });
  const token = login.accessToken || login.token;
  if (!token) throw new Error('login returned no token');

  const types = (await req('GET', '/product-taxonomy/types?includeInactive=true', token)).items || [];
  const type = types.find((row) => (
    row.name === COIL_REBAR_TYPE_NAME
    && (row.groupName === COIL_REBAR_GROUP_NAME || !row.groupName)
  )) || types.find((row) => row.name === COIL_REBAR_TYPE_NAME);
  if (!type) throw new Error('product type میلگرد کلاف not found');

  const schema = (await req('GET', `/attribute-definitions/schema/${type.id}`, token)).schema || [];
  const size = bindingOf(schema, 'size');
  const grade = bindingOf(schema, 'grade');
  if (!size?.definition?.id || !grade?.definition?.id) {
    throw new Error('میلگرد کلاف is missing size/grade bindings');
  }
  if (!size.binding?.isRequired || size.binding.valueScope !== 'PRODUCT') {
    throw new Error('میلگرد کلاف size must stay required PRODUCT identity — not rewriting schema');
  }
  if (!grade.binding?.isRequired || grade.binding.valueScope !== 'PRODUCT') {
    throw new Error('میلگرد کلاف grade must stay required PRODUCT identity — not rewriting schema');
  }
  const allowed = new Set((grade.binding.effectiveAllowedValues || []).map((item) => item.value));
  for (const value of COIL_REBAR_GRADES) {
    if (!allowed.has(value)) {
      throw new Error(`grade ${value} is not in the Type allowed subset`);
    }
  }

  const listed = (await req(
    'GET',
    `/products?productTypeId=${encodeURIComponent(type.id)}&includeInactive=true&limit=200`,
    token,
  )).items || [];
  const existingSkus = new Set(listed.map((item) => item.sku));

  const rows = coilRebarIdentityRows();
  let created = 0;
  let reused = 0;
  for (const row of rows) {
    const result = await req('POST', '/products', token, {
      productTypeId: type.id,
      attributeValues: {
        [grade.definition.id]: row.grade,
        [size.definition.id]: row.size,
      },
      confirmDuplicate: true,
    });
    const product = result.product;
    const known = existingSkus.has(product.sku);
    if (known) reused += 1;
    else {
      created += 1;
      existingSkus.add(product.sku);
    }
    console.log(known ? 'reuse' : 'create', product.generatedName, product.sku);
  }
  console.log('done', { type: type.name, total: rows.length, created, reused });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
