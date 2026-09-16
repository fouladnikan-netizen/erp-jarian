#!/usr/bin/env node
/**
 * Idempotent catalog load: میلگرد حرارتی grade×size Products via the API.
 * Does not rewrite Type identity bindings. Adds A3 to the grade subset if missing.
 *
 *   node backend/scripts/seed-thermal-rebar-products.js
 */
import {
  THERMAL_REBAR_GRADES,
  THERMAL_REBAR_GROUP_NAME,
  THERMAL_REBAR_TYPE_NAME,
  thermalRebarIdentityRows,
} from '../src/domain/productMaster/thermalRebarCatalog.js';

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

function allowedValues(binding) {
  return (binding?.effectiveAllowedValues || []).map((item) => item.value);
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
    row.name === THERMAL_REBAR_TYPE_NAME
    && (row.groupName === THERMAL_REBAR_GROUP_NAME || !row.groupName)
  )) || types.find((row) => row.name === THERMAL_REBAR_TYPE_NAME);
  if (!type) throw new Error('product type میلگرد حرارتی not found');

  let schema = (await req('GET', `/attribute-definitions/schema/${type.id}`, token)).schema || [];
  const size = bindingOf(schema, 'size');
  let grade = bindingOf(schema, 'grade');
  if (!size?.definition?.id || !grade?.definition?.id) {
    throw new Error('میلگرد حرارتی is missing size/grade bindings');
  }
  if (!size.binding?.isRequired || size.binding.valueScope !== 'PRODUCT') {
    throw new Error('میلگرد حرارتی size must stay required PRODUCT identity — not rewriting schema');
  }
  if (!grade.binding?.isRequired || grade.binding.valueScope !== 'PRODUCT') {
    throw new Error('میلگرد حرارتی grade must stay required PRODUCT identity — not rewriting schema');
  }

  const missing = THERMAL_REBAR_GRADES.filter((value) => !allowedValues(grade.binding).includes(value));
  if (missing.length) {
    await req('PATCH', `/attribute-definitions/bindings/${grade.binding.id}`, token, {
      overrideAllowedValues: [...THERMAL_REBAR_GRADES],
    });
    schema = (await req('GET', `/attribute-definitions/schema/${type.id}`, token)).schema || [];
    grade = bindingOf(schema, 'grade');
  }
  const allowed = new Set(allowedValues(grade.binding));
  for (const value of THERMAL_REBAR_GRADES) {
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

  const rows = thermalRebarIdentityRows();
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
