#!/usr/bin/env node
/**
 * Idempotent catalog load: پروفیل صنعتی width×height×thickness Products via the API.
 * Does not rewrite Type bindings. Length stays TRANSACTION.
 *
 *   node backend/scripts/seed-industrial-profile-products.js
 */
import {
  INDUSTRIAL_PROFILE_TYPE_NAME,
  industrialProfileIdentityRows,
  industrialProfileListDiff,
} from '../src/domain/productMaster/industrialProfileCatalog.js';

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

function formatRow(item) {
  return `${item.width}×${item.height} @ ${item.thickness}`;
}

async function main() {
  const login = await req('POST', '/auth/login', null, {
    username: process.env.JARIAN_SEED_USER || 'admin',
    password: process.env.JARIAN_SEED_PASSWORD || 'Admin123!',
  });
  const token = login.accessToken || login.token;
  if (!token) throw new Error('login returned no token');

  const types = (await req('GET', '/product-taxonomy/types?includeInactive=true', token)).items || [];
  const type = types.find((row) => row.name === INDUSTRIAL_PROFILE_TYPE_NAME);
  if (!type) throw new Error('product type پروفیل صنعتی not found');

  const schema = (await req(
    'GET',
    `/attribute-definitions/schema/${type.id}?includeInactive=true`,
    token,
  )).schema || [];
  const width = bindingOf(schema, 'width_profile');
  const height = bindingOf(schema, 'length_profile');
  const thickness = bindingOf(schema, 'thickness');
  const length = bindingOf(schema, 'length');
  if (!width?.definition?.id || !height?.definition?.id || !thickness?.definition?.id) {
    throw new Error('پروفیل صنعتی is missing width_profile/length_profile/thickness bindings');
  }
  for (const entry of [width, height, thickness]) {
    if (!entry.binding?.isRequired || entry.binding.valueScope !== 'PRODUCT') {
      throw new Error(`پروفیل صنعتی ${entry.definition.code} must stay required PRODUCT identity — not rewriting schema`);
    }
  }
  if (length?.binding && length.binding.valueScope !== 'TRANSACTION') {
    throw new Error('length binding must stay TRANSACTION — not rewriting schema');
  }
  const thickMin = thickness.binding.overrideMin;
  const thickMax = thickness.binding.overrideMax;
  if (thickMin != null && thickMin > 5) {
    throw new Error(`پروفیل صنعتی thickness min ${thickMin} cannot load 5mm catalog — not rewriting schema`);
  }
  if (thickMax != null && thickMax < 15) {
    throw new Error(`پروفیل صنعتی thickness max ${thickMax} cannot load 15mm catalog — not rewriting schema`);
  }

  await req('PATCH', `/product-taxonomy/types/${type.id}`, token, {
    displayNameRule: {
      separator: ' ',
      tokens: [
        { order: 0, sourceType: 'type', includeLabel: false },
        { order: 1, sourceType: 'attribute', attributeId: width.definition.id, includeUnit: false, includeLabel: false },
        { order: 2, literalId: 'times', sourceType: 'literal' },
        { order: 3, sourceType: 'attribute', attributeId: height.definition.id, includeUnit: false, includeLabel: false },
        { order: 4, sourceType: 'attribute', attributeId: thickness.definition.id, includeUnit: true, includeLabel: true },
        { order: 5, literalId: 'branch', sourceType: 'literal' },
        ...(length?.definition?.id
          ? [{ order: 6, sourceType: 'attribute', attributeId: length.definition.id, includeUnit: true, includeLabel: false }]
          : []),
      ],
    },
  });

  const listed = (await req(
    'GET',
    `/products?productTypeId=${encodeURIComponent(type.id)}&includeInactive=true&limit=500`,
    token,
  )).items || [];
  const existingSkus = new Set(listed.map((item) => item.sku));

  const rows = industrialProfileIdentityRows();
  const catalogKeys = new Set(rows.map((item) => `${item.width}x${item.height}@${item.thickness}`));
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
    const known = existingSkus.has(product.sku);
    if (known) reused += 1;
    else {
      created += 1;
      existingSkus.add(product.sku);
    }
    console.log(known ? 'reuse' : 'create', product.generatedName, product.sku);
  }

  const extras = [];
  for (const product of listed) {
    const attrs = Object.fromEntries(
      (product.attributeValues || []).map((item) => [item.attributeDefinitionId, item.value]),
    );
    const key = `${Number(attrs[width.definition.id])}x${Number(attrs[height.definition.id])}@${Number(attrs[thickness.definition.id])}`;
    if (!catalogKeys.has(key)) extras.push(product.generatedName || product.sku);
  }

  const diff = industrialProfileListDiff();
  console.log('diff onlyMill', diff.onlyMill.map(formatRow).join(', '));
  console.log('diff onlyExtra', diff.onlyExtra.map(formatRow).join(', '));
  console.log('diff both', diff.both.map(formatRow).join(', '));
  console.log('done', {
    type: type.name,
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
