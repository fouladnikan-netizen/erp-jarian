#!/usr/bin/env node
/**
 * Idempotent catalog load: لوله تست گاز size×thickness Products via the API.
 * Does not rewrite Type identity/required/scope.
 * Length stays TRANSACTION and is not stored on the Product.
 *
 *   node backend/scripts/seed-gas-test-pipe-products.js
 */
import {
  GAS_TEST_PIPE_TYPE_NAME,
  gasTestPipeIdentityRows,
} from '../src/domain/productMaster/gasTestPipeCatalog.js';

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

function storedNumber(product, definitionId) {
  const attrs = Array.isArray(product?.attributeValues) ? product.attributeValues : [];
  const row = attrs.find((item) => item.attributeDefinitionId === definitionId);
  if (!row) return Number.NaN;
  return Number(row.valueNumber ?? row.normalizedValue ?? row.value);
}

function catalogKey(size, thickness) {
  return `${Number(size)}@${Number(thickness)}`;
}

async function main() {
  const login = await req('POST', '/auth/login', null, {
    username: process.env.JARIAN_SEED_USER || 'admin',
    password: process.env.JARIAN_SEED_PASSWORD || 'Admin123!',
  });
  const token = login.accessToken || login.token;
  if (!token) throw new Error('login returned no token');

  const types = (await req('GET', '/product-taxonomy/types?includeInactive=true', token)).items || [];
  const type = types.find((row) => row.name === GAS_TEST_PIPE_TYPE_NAME);
  if (!type) throw new Error('product type لوله تست گاز not found');

  const schema = (await req(
    'GET',
    `/attribute-definitions/schema/${type.id}?includeInactive=true`,
    token,
  )).schema || [];
  const size = bindingOf(schema, 'size_pipe');
  const thickness = bindingOf(schema, 'thickness');
  const length = bindingOf(schema, 'length');
  if (!size?.definition?.id || !thickness?.definition?.id) {
    throw new Error('لوله تست گاز is missing size_pipe/thickness bindings');
  }
  for (const entry of [size, thickness]) {
    if (!entry.binding?.isRequired || entry.binding.valueScope !== 'PRODUCT') {
      throw new Error(`لوله تست گاز ${entry.definition.code} must stay required PRODUCT identity — not rewriting schema`);
    }
  }
  if (length?.binding && length.binding.valueScope !== 'TRANSACTION') {
    throw new Error('length binding must stay TRANSACTION — not rewriting schema');
  }

  const displayNameRule = {
    separator: ' ',
    tokens: [
      { sourceType: 'type', includeLabel: false },
      { sourceType: 'attribute', attributeId: size.definition.id, includeLabel: false, includeUnit: true },
      { sourceType: 'attribute', attributeId: thickness.definition.id, includeLabel: true, includeUnit: true },
    ],
  };
  await req('PATCH', `/product-taxonomy/types/${type.id}`, token, { displayNameRule });
  console.log('display-name-rule', type.name);

  const rows = gasTestPipeIdentityRows();
  const catalogKeys = new Set(rows.map((item) => catalogKey(item.size, item.thickness)));

  let listed = (await req(
    'GET',
    `/products?productTypeId=${encodeURIComponent(type.id)}&includeInactive=true&limit=200`,
    token,
  )).items || [];
  let removed = 0;
  for (const product of listed) {
    const key = catalogKey(
      storedNumber(product, size.definition.id),
      storedNumber(product, thickness.definition.id),
    );
    if (catalogKeys.has(key)) continue;
    await req('DELETE', `/products/${product.id}`, token);
    removed += 1;
    console.log('remove-extra', product.generatedName, product.sku);
  }
  if (removed) {
    listed = (await req(
      'GET',
      `/products?productTypeId=${encodeURIComponent(type.id)}&includeInactive=true&limit=200`,
      token,
    )).items || [];
  }
  const existingSkus = new Set(listed.map((item) => item.sku));
  const beforeCount = listed.length;
  let created = 0;
  let reused = 0;
  const samples = [];
  for (const row of rows) {
    const result = await req('POST', '/products', token, {
      productTypeId: type.id,
      attributeValues: {
        [size.definition.id]: row.size,
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
    if (samples.length < 3 || rows.indexOf(row) === rows.length - 1) {
      samples.push(product.generatedName);
    }
    console.log(known ? 'reuse' : 'create', product.generatedName, product.sku);
  }

  const after = (await req(
    'GET',
    `/products?productTypeId=${encodeURIComponent(type.id)}&includeInactive=true&limit=200`,
    token,
  )).items || [];
  const extras = [];
  for (const product of after) {
    const key = catalogKey(
      storedNumber(product, size.definition.id),
      storedNumber(product, thickness.definition.id),
    );
    if (!catalogKeys.has(key)) extras.push(product.generatedName || product.sku);
  }

  console.log('done', {
    type: type.name,
    beforeCount,
    afterCount: after.length,
    total: rows.length,
    created,
    reused,
    removed,
    extrasLeft: extras,
    samples,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
