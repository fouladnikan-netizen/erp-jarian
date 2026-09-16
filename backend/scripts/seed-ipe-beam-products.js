#!/usr/bin/env node
/**
 * Idempotent catalog load: تیرآهن IPE size Products via the API.
 * Does not rewrite Type bindings. Length stays TRANSACTION.
 *
 *   node backend/scripts/seed-ipe-beam-products.js
 */
import {
  IPE_BEAM_GROUP_NAME,
  IPE_BEAM_TYPE_NAME,
  ipeBeamIdentityRows,
} from '../src/domain/productMaster/ipeBeamCatalog.js';

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
  const type = types.find((row) => (
    row.name === IPE_BEAM_TYPE_NAME
    && (row.groupName === IPE_BEAM_GROUP_NAME || !row.groupName)
  )) || types.find((row) => row.name === IPE_BEAM_TYPE_NAME);
  if (!type) throw new Error('product type تیرآهن IPE not found');

  const schema = (await req('GET', `/attribute-definitions/schema/${type.id}`, token)).schema || [];
  const size = bindingOf(schema, 'size');
  const length = bindingOf(schema, 'length');
  if (!size?.definition?.id) {
    throw new Error('تیرآهن IPE is missing size binding');
  }
  if (!size.binding?.isRequired || size.binding.valueScope !== 'PRODUCT') {
    throw new Error('تیرآهن IPE size must stay required PRODUCT identity — not rewriting schema');
  }
  if (length?.binding && length.binding.valueScope !== 'TRANSACTION') {
    throw new Error('length binding must stay TRANSACTION — not rewriting schema');
  }

  const listed = (await req(
    'GET',
    `/products?productTypeId=${encodeURIComponent(type.id)}&includeInactive=true&limit=200`,
    token,
  )).items || [];
  const existingSkus = new Set(listed.map((item) => item.sku));

  const rows = ipeBeamIdentityRows();
  let created = 0;
  let reused = 0;
  for (const row of rows) {
    const result = await req('POST', '/products', token, {
      productTypeId: type.id,
      attributeValues: {
        [size.definition.id]: row.size,
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
