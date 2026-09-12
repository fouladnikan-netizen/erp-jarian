#!/usr/bin/env node
/**
 * Idempotent catalog load: ناودانی kind×size Products via the API.
 * Kind subset is معمولی / سبک / هم وزن اروپا. Length stays TRANSACTION.
 *
 *   node backend/scripts/seed-channel-products.js
 */
import {
  CHANNEL_KINDS,
  CHANNEL_TYPE_NAME,
  channelIdentityRows,
} from '../src/domain/productMaster/channelCatalog.js';

const BASE = process.env.API_BASE || 'http://localhost:3100/api/v1';
const LATIN_KIND = new Set(['plain', 'light', 'europe']);

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

function storedKind(product, kindDefinitionId) {
  const attrs = Array.isArray(product?.attributeValues) ? product.attributeValues : [];
  const row = attrs.find((item) => item.attributeDefinitionId === kindDefinitionId);
  return row?.valueText || row?.normalizedValue || '';
}

async function main() {
  const login = await req('POST', '/auth/login', null, {
    username: process.env.JARIAN_SEED_USER || 'admin',
    password: process.env.JARIAN_SEED_PASSWORD || 'Admin123!',
  });
  const token = login.accessToken || login.token;
  if (!token) throw new Error('login returned no token');

  const types = (await req('GET', '/product-taxonomy/types?includeInactive=true', token)).items || [];
  const type = types.find((row) => row.name === CHANNEL_TYPE_NAME);
  if (!type) throw new Error('product type ناودانی not found');

  const schema = (await req('GET', `/attribute-definitions/schema/${type.id}`, token)).schema || [];
  const size = bindingOf(schema, 'size');
  const kind = bindingOf(schema, 'kind');
  const length = bindingOf(schema, 'length');
  if (!size?.definition?.id || !kind?.definition?.id) {
    throw new Error('ناودانی is missing size/kind bindings');
  }
  if (!size.binding?.isRequired || size.binding.valueScope !== 'PRODUCT') {
    throw new Error('ناودانی size must stay required PRODUCT identity — not rewriting schema');
  }
  if (!kind.binding?.isRequired || kind.binding.valueScope !== 'PRODUCT') {
    throw new Error('ناودانی kind must stay required PRODUCT identity — not rewriting schema');
  }
  if (length?.binding && length.binding.valueScope !== 'TRANSACTION') {
    throw new Error('length binding must stay TRANSACTION — not rewriting schema');
  }

  const catalog = new Set((kind.definition.allowedValues || []).map((item) => item.value));
  for (const value of CHANNEL_KINDS) {
    if (!catalog.has(value)) {
      throw new Error(`ناودانی kind catalog is missing ${value}`);
    }
  }

  const listed = (await req(
    'GET',
    `/products?productTypeId=${encodeURIComponent(type.id)}&includeInactive=true&limit=500`,
    token,
  )).items || [];
  let removed = 0;
  for (const product of listed) {
    if (!LATIN_KIND.has(storedKind(product, kind.definition.id))) continue;
    await req('DELETE', `/products/${product.id}`, token);
    removed += 1;
    console.log('remove-latin-kind', product.generatedName, product.sku);
  }

  const subset = new Set((kind.binding.effectiveAllowedValues || []).map((item) => item.value));
  if (CHANNEL_KINDS.some((value) => !subset.has(value))) {
    await req('PATCH', `/attribute-definitions/bindings/${kind.binding.id}`, token, {
      overrideAllowedValues: [...CHANNEL_KINDS],
      overrideDefaultValue: 'معمولی',
    });
  }

  const schemaAfter = (await req('GET', `/attribute-definitions/schema/${type.id}`, token)).schema || [];
  const kindAfter = bindingOf(schemaAfter, 'kind');
  const sizeAfter = bindingOf(schemaAfter, 'size');
  const lengthAfter = bindingOf(schemaAfter, 'length');
  const allowed = new Set((kindAfter?.binding?.effectiveAllowedValues || []).map((item) => item.value));
  for (const value of CHANNEL_KINDS) {
    if (!allowed.has(value)) {
      throw new Error(`kind ${value} is not in the Type allowed subset`);
    }
  }

  const remaining = (await req(
    'GET',
    `/products?productTypeId=${encodeURIComponent(type.id)}&includeInactive=true&limit=500`,
    token,
  )).items || [];
  const existingSkus = new Set(remaining.map((item) => item.sku));

  const rows = channelIdentityRows();
  let created = 0;
  let reused = 0;
  for (const row of rows) {
    const result = await req('POST', '/products', token, {
      productTypeId: type.id,
      attributeValues: {
        [kindAfter.definition.id]: row.kind,
        [sizeAfter.definition.id]: row.size,
      },
      confirmDuplicate: true,
    });
    const product = result.product;
    if (hasStoredValue(product, lengthAfter?.definition?.id)) {
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
  console.log('done', { type: type.name, total: rows.length, removed, created, reused });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
