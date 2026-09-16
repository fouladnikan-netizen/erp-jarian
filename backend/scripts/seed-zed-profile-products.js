#!/usr/bin/env node
/**
 * Idempotent catalog load: پروفیل زد height×thickness Products via the API.
 * Does not rewrite Type identity/required/scope. Length stays TRANSACTION.
 *
 *   node backend/scripts/seed-zed-profile-products.js
 */
import {
  ZED_PROFILE_TYPE_NAME,
  zedProfileDisplayNameRule,
  zedProfileIdentityRows,
} from '../src/domain/productMaster/zedProfileCatalog.js';

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

async function main() {
  const login = await req('POST', '/auth/login', null, {
    username: process.env.JARIAN_SEED_USER || 'admin',
    password: process.env.JARIAN_SEED_PASSWORD || 'Admin123!',
  });
  const token = login.accessToken || login.token;
  if (!token) throw new Error('login returned no token');

  const types = (await req('GET', '/product-taxonomy/types?includeInactive=true', token)).items || [];
  const type = types.find((row) => row.name === ZED_PROFILE_TYPE_NAME);
  if (!type) throw new Error('product type پروفیل زد not found');

  const schema = (await req(
    'GET',
    `/attribute-definitions/schema/${type.id}?includeInactive=true`,
    token,
  )).schema || [];
  const height = bindingOf(schema, 'height');
  const thickness = bindingOf(schema, 'thickness');
  const length = bindingOf(schema, 'length');
  if (!height?.definition?.id || !thickness?.definition?.id) {
    throw new Error('پروفیل زد is missing height/thickness bindings');
  }
  for (const entry of [height, thickness]) {
    if (!entry.binding?.isRequired || entry.binding.valueScope !== 'PRODUCT') {
      throw new Error(`پروفیل زد ${entry.definition.code} must stay required PRODUCT identity — not rewriting schema`);
    }
  }
  if (length?.binding && length.binding.valueScope !== 'TRANSACTION') {
    throw new Error('length binding must stay TRANSACTION — not rewriting schema');
  }

  const heightMin = height.binding.overrideMin ?? height.definition?.minValue;
  const heightMax = height.binding.overrideMax ?? height.definition?.maxValue;
  if (heightMin != null && heightMin > 160) {
    throw new Error(`پروفیل زد height min ${heightMin} cannot load 160 catalog — not rewriting schema`);
  }
  if (heightMax != null && heightMax < 220) {
    throw new Error(`پروفیل زد height max ${heightMax} cannot load 220 catalog — not rewriting schema`);
  }

  await req('PATCH', `/product-taxonomy/types/${type.id}`, token, {
    displayNameRule: zedProfileDisplayNameRule({
      heightId: height.definition.id,
      thicknessId: thickness.definition.id,
      lengthId: length?.definition?.id,
    }),
  });

  const listed = (await req(
    'GET',
    `/products?productTypeId=${encodeURIComponent(type.id)}&includeInactive=true&limit=200`,
    token,
  )).items || [];
  const existingSkus = new Set(listed.map((item) => item.sku));
  const beforeCount = listed.length;

  const rows = zedProfileIdentityRows();
  const catalogKeys = new Set(rows.map((item) => `${item.height}@${item.thickness}`));
  let created = 0;
  let reused = 0;
  for (const row of rows) {
    const result = await req('POST', '/products', token, {
      productTypeId: type.id,
      attributeValues: {
        [height.definition.id]: row.height,
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

  const after = (await req(
    'GET',
    `/products?productTypeId=${encodeURIComponent(type.id)}&includeInactive=true&limit=200`,
    token,
  )).items || [];
  const extras = [];
  for (const product of after) {
    const key = `${storedNumber(product, height.definition.id)}@${storedNumber(product, thickness.definition.id)}`;
    if (!catalogKeys.has(key)) extras.push(product.generatedName || product.sku);
  }

  console.log('done', {
    type: type.name,
    beforeCount,
    afterCount: after.length,
    total: rows.length,
    created,
    reused,
    extrasLeft: extras,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
