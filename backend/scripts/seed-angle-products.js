#!/usr/bin/env node
/**
 * Idempotent catalog load: نبشی equal-leg height×thickness Products via the API.
 * Does not rewrite Type bindings. Length stays TRANSACTION.
 *
 *   node backend/scripts/seed-angle-products.js
 */
import {
  ANGLE_TYPE_NAME,
  angleIdentityRows,
} from '../src/domain/productMaster/angleCatalog.js';

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

function hasStoredValue(product, definitionId) {
  if (!definitionId) return false;
  const attrs = Array.isArray(product?.attributeValues) ? product.attributeValues : [];
  return attrs.some((item) => item.attributeDefinitionId === definitionId);
}

function enumValues(entry) {
  return new Set((entry?.binding?.effectiveAllowedValues || entry?.definition?.allowedValues || []).map((item) => String(item.value)));
}

async function main() {
  const login = await req('POST', '/auth/login', null, {
    username: process.env.JARIAN_SEED_USER || 'admin',
    password: process.env.JARIAN_SEED_PASSWORD || 'Admin123!',
  });
  const token = login.accessToken || login.token;
  if (!token) throw new Error('login returned no token');

  const types = (await req('GET', '/product-taxonomy/types?includeInactive=true', token)).items || [];
  const type = types.find((row) => row.name === ANGLE_TYPE_NAME);
  if (!type) throw new Error('product type نبشی not found');

  const schema = (await req('GET', `/attribute-definitions/schema/${type.id}`, token)).schema || [];
  const height = bindingOf(schema, 'leg1') || bindingOf(schema, 'height');
  const height2 = bindingOf(schema, 'leg2') || bindingOf(schema, 'height_2');
  const thickness = bindingOf(schema, 'thickness');
  const length = bindingOf(schema, 'length');
  if (!height?.definition?.id || !height2?.definition?.id || !thickness?.definition?.id) {
    throw new Error('نبشی is missing leg1/leg2/thickness bindings');
  }
  for (const entry of [height, height2, thickness]) {
    if (!entry.binding?.isRequired || entry.binding.valueScope !== 'PRODUCT') {
      throw new Error(`نبشی ${entry.definition.code} must stay required PRODUCT identity — not rewriting schema`);
    }
  }
  if (length?.binding && length.binding.valueScope !== 'TRANSACTION') {
    throw new Error('length binding must stay TRANSACTION — not rewriting schema');
  }

  const heightAllowed = enumValues(height);
  const height2Allowed = enumValues(height2);
  const rows = angleIdentityRows();
  for (const row of rows) {
    if (!heightAllowed.has(row.height)) {
      throw new Error(`نبشی height ${row.height} is not in the Type allowed list`);
    }
    if (!height2Allowed.has(row.height2)) {
      throw new Error(`نبشی height_2 ${row.height2} is not in the Type allowed list`);
    }
  }

  const listed = (await req(
    'GET',
    `/products?productTypeId=${encodeURIComponent(type.id)}&includeInactive=true&limit=500`,
    token,
  )).items || [];
  const existingSkus = new Set(listed.map((item) => item.sku));

  let created = 0;
  let reused = 0;
  for (const row of rows) {
    const result = await req('POST', '/products', token, {
      productTypeId: type.id,
      attributeValues: {
        [height.definition.id]: row.height,
        [height2.definition.id]: row.height2,
        [thickness.definition.id]: row.thickness,
      },
      confirmDuplicate: true,
    });
    const product = result.product;
    if (hasStoredValue(product, length?.definition?.id)) {
      throw new Error(`length leaked onto Product ${product.generatedName}`);
    }
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
