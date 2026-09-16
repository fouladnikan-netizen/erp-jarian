#!/usr/bin/env node
/**
 * Idempotent catalog load: پروفیل گالوانیزه width×height×thickness Products via the API.
 * Does not rewrite Type identity/required/scope. Length stays TRANSACTION.
 * Inactive dimensions ENUM is not stored. Binds missing width_profile /
 * length_profile only so mill sizes can live on Product like empty پروفیل.
 *
 *   node backend/scripts/seed-galvanized-profile-products.js
 */
import {
  GALVANIZED_PROFILE_TYPE_NAME,
  galvanizedProfileIdentityRows,
} from '../src/domain/productMaster/galvanizedProfileCatalog.js';

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

async function fetchSchema(token, typeId) {
  return (await req(
    'GET',
    `/attribute-definitions/schema/${typeId}?includeInactive=true`,
    token,
  )).schema || [];
}

async function ensureProfileDimensions(token, type, schema) {
  const defs = (await req('GET', '/attribute-definitions', token)).items || [];
  const widthDef = defs.find((item) => item.code === 'width_profile');
  const heightDef = defs.find((item) => item.code === 'length_profile');
  if (!widthDef?.id || !heightDef?.id) {
    throw new Error('width_profile/length_profile definitions are missing');
  }

  let width = bindingOf(schema, 'width_profile');
  let height = bindingOf(schema, 'length_profile');
  if (!width?.binding?.id) {
    await req('POST', '/attribute-definitions/bindings', token, {
      productTypeId: type.id,
      attributeDefinitionId: widthDef.id,
      isRequired: true,
      valueScope: 'PRODUCT',
      sortOrder: 0,
    });
  }
  if (!height?.binding?.id) {
    await req('POST', '/attribute-definitions/bindings', token, {
      productTypeId: type.id,
      attributeDefinitionId: heightDef.id,
      isRequired: true,
      valueScope: 'PRODUCT',
      sortOrder: 1,
    });
  }

  const dimensions = bindingOf(schema, 'dimensions');
  if (dimensions?.binding?.id && dimensions.binding.isActive) {
    await req('PATCH', `/attribute-definitions/bindings/${dimensions.binding.id}`, token, {
      isActive: false,
    });
  }
}

async function main() {
  const login = await req('POST', '/auth/login', null, {
    username: process.env.JARIAN_SEED_USER || 'admin',
    password: process.env.JARIAN_SEED_PASSWORD || 'Admin123!',
  });
  const token = login.accessToken || login.token;
  if (!token) throw new Error('login returned no token');

  const types = (await req('GET', '/product-taxonomy/types?includeInactive=true', token)).items || [];
  const type = types.find((row) => row.name === GALVANIZED_PROFILE_TYPE_NAME);
  if (!type) throw new Error('product type پروفیل گالوانیزه not found');

  let schema = await fetchSchema(token, type.id);
  await ensureProfileDimensions(token, type, schema);
  schema = await fetchSchema(token, type.id);

  const width = bindingOf(schema, 'width_profile');
  const height = bindingOf(schema, 'length_profile');
  const thickness = bindingOf(schema, 'thickness');
  const dimensions = bindingOf(schema, 'dimensions');
  const length = bindingOf(schema, 'length');
  if (!width?.definition?.id || !height?.definition?.id || !thickness?.definition?.id) {
    throw new Error('پروفیل گالوانیزه is missing width_profile/length_profile/thickness bindings');
  }
  for (const entry of [width, height, thickness]) {
    if (!entry.binding?.isRequired || entry.binding.valueScope !== 'PRODUCT') {
      throw new Error(`پروفیل گالوانیزه ${entry.definition.code} must stay required PRODUCT identity — not rewriting schema`);
    }
  }
  if (dimensions?.binding?.isActive) {
    throw new Error('پروفیل گالوانیزه dimensions is active — not rewriting schema; inspect before loading');
  }
  if (length?.binding && length.binding.valueScope !== 'TRANSACTION') {
    throw new Error('length binding must stay TRANSACTION — not rewriting schema');
  }
  const thickMin = thickness.binding.overrideMin ?? thickness.definition?.minValue;
  const thickMax = thickness.binding.overrideMax ?? thickness.definition?.maxValue;
  if (thickMin != null && thickMin > 2) {
    throw new Error(`پروفیل گالوانیزه thickness min ${thickMin} cannot load 2mm catalog — not rewriting schema`);
  }
  if (thickMax != null && thickMax < 2.5) {
    await req('PATCH', `/attribute-definitions/bindings/${thickness.binding.id}`, token, {
      overrideMax: 2.5,
    });
    schema = await fetchSchema(token, type.id);
  }

  const widthLive = bindingOf(schema, 'width_profile');
  const heightLive = bindingOf(schema, 'length_profile');
  const thicknessLive = bindingOf(schema, 'thickness');
  const lengthLive = bindingOf(schema, 'length');
  const dimensionsLive = bindingOf(schema, 'dimensions');

  await req('PATCH', `/product-taxonomy/types/${type.id}`, token, {
    displayNameRule: {
      separator: ' ',
      tokens: [
        { order: 0, sourceType: 'type', includeLabel: false },
        { order: 1, sourceType: 'attribute', attributeId: widthLive.definition.id, includeUnit: false, includeLabel: false },
        { order: 2, literalId: 'times', sourceType: 'literal' },
        { order: 3, sourceType: 'attribute', attributeId: heightLive.definition.id, includeUnit: false, includeLabel: false },
        { order: 4, sourceType: 'attribute', attributeId: thicknessLive.definition.id, includeUnit: true, includeLabel: true },
        { order: 5, literalId: 'branch', sourceType: 'literal' },
        ...(lengthLive?.definition?.id
          ? [{ order: 6, sourceType: 'attribute', attributeId: lengthLive.definition.id, includeUnit: true, includeLabel: false }]
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
  const beforeCount = listed.length;

  const rows = galvanizedProfileIdentityRows();
  const catalogKeys = new Set(rows.map((item) => `${item.width}x${item.height}@${item.thickness}`));
  let created = 0;
  let reused = 0;
  const samples = [];
  for (const row of rows) {
    const result = await req('POST', '/products', token, {
      productTypeId: type.id,
      attributeValues: {
        [widthLive.definition.id]: row.width,
        [heightLive.definition.id]: row.height,
        [thicknessLive.definition.id]: row.thickness,
      },
      confirmDuplicate: true,
    });
    const product = result.product;
    if (hasStoredValue(product, lengthLive?.definition?.id)) {
      throw new Error(`length leaked onto Product ${product.generatedName}`);
    }
    if (hasStoredValue(product, dimensionsLive?.definition?.id)) {
      throw new Error(`dimensions leaked onto Product ${product.generatedName}`);
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
    `/products?productTypeId=${encodeURIComponent(type.id)}&includeInactive=true&limit=500`,
    token,
  )).items || [];
  const extras = [];
  for (const product of after) {
    const key = `${storedNumber(product, widthLive.definition.id)}x${storedNumber(product, heightLive.definition.id)}@${storedNumber(product, thicknessLive.definition.id)}`;
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
    samples,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
