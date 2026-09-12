#!/usr/bin/env node
/**
 * Idempotent catalog load: پروفیل width×height×thickness Products via the API.
 * Does not rewrite Type bindings. Length stays TRANSACTION. Inactive dimensions
 * ENUM is not stored.
 *
 *   node backend/scripts/seed-profile-products.js
 */
import {
  PROFILE_TYPE_NAME,
  profileIdentityRows,
} from '../src/domain/productMaster/profileCatalog.js';

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

async function main() {
  const login = await req('POST', '/auth/login', null, {
    username: process.env.JARIAN_SEED_USER || 'admin',
    password: process.env.JARIAN_SEED_PASSWORD || 'Admin123!',
  });
  const token = login.accessToken || login.token;
  if (!token) throw new Error('login returned no token');

  const types = (await req('GET', '/product-taxonomy/types?includeInactive=true', token)).items || [];
  const type = types.find((row) => row.name === PROFILE_TYPE_NAME);
  if (!type) throw new Error('product type پروفیل not found');

  const schema = (await req(
    'GET',
    `/attribute-definitions/schema/${type.id}?includeInactive=true`,
    token,
  )).schema || [];
  const width = bindingOf(schema, 'width_profile');
  const height = bindingOf(schema, 'length_profile');
  const thickness = bindingOf(schema, 'thickness');
  const dimensions = bindingOf(schema, 'dimensions');
  const length = bindingOf(schema, 'length');
  if (!width?.definition?.id || !height?.definition?.id || !thickness?.definition?.id) {
    throw new Error('پروفیل is missing width_profile/length_profile/thickness bindings');
  }
  for (const entry of [width, height, thickness]) {
    if (!entry.binding?.isRequired || entry.binding.valueScope !== 'PRODUCT') {
      throw new Error(`پروفیل ${entry.definition.code} must stay required PRODUCT identity — not rewriting schema`);
    }
  }
  if (dimensions?.binding?.isActive) {
    throw new Error('پروفیل dimensions is active — not rewriting schema; inspect before loading');
  }
  if (length?.binding && length.binding.valueScope !== 'TRANSACTION') {
    throw new Error('length binding must stay TRANSACTION — not rewriting schema');
  }

  const listed = (await req(
    'GET',
    `/products?productTypeId=${encodeURIComponent(type.id)}&includeInactive=true&limit=500`,
    token,
  )).items || [];
  const existingSkus = new Set(listed.map((item) => item.sku));

  const rows = profileIdentityRows();
  let created = 0;
  let reused = 0;
  for (const row of rows) {
    const result = await req('POST', '/products', token, {
      productTypeId: type.id,
      attributeValues: {
        [width.definition.id]: row.width,
        [height.definition.id]: row.height,
        [thickness.definition.id]: row.thickness,
      },
      confirmDuplicate: true,
    });
    const product = result.product;
    if (hasStoredValue(product, length?.definition?.id)) {
      throw new Error(`length leaked onto Product ${product.generatedName}`);
    }
    if (hasStoredValue(product, dimensions?.definition?.id)) {
      throw new Error(`dimensions leaked onto Product ${product.generatedName}`);
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
