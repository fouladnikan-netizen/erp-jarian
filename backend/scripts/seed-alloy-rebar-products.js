#!/usr/bin/env node
/**
 * Idempotent catalog load: میلگرد آلیاژی Products keyed by grade only.
 * Does not rewrite the Type schema except to restore size as non-identity
 * if a previous load marked it required. Size/length are never stored on
 * the Product.
 *
 *   node backend/scripts/seed-alloy-rebar-products.js
 */
import {
  ALLOY_REBAR_GRADES,
  ALLOY_REBAR_GROUP_NAME,
  ALLOY_REBAR_TYPE_NAME,
  alloyRebarIdentityRows,
} from '../src/domain/productMaster/alloyRebarCatalog.js';

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
    row.name === ALLOY_REBAR_TYPE_NAME
    && (row.groupName === ALLOY_REBAR_GROUP_NAME || !row.groupName)
  )) || types.find((row) => row.name === ALLOY_REBAR_TYPE_NAME);
  if (!type) throw new Error('product type میلگرد آلیاژی not found');

  let schema = (await req('GET', `/attribute-definitions/schema/${type.id}?includeInactive=true`, token)).schema || [];
  const size = bindingOf(schema, 'size');
  const grade = bindingOf(schema, 'grade');
  const length = bindingOf(schema, 'length');
  if (!grade?.definition?.id) {
    throw new Error('میلگرد آلیاژی is missing required grade binding');
  }

  const listed = (await req(
    'GET',
    `/products?productTypeId=${encodeURIComponent(type.id)}&includeInactive=true&limit=500`,
    token,
  )).items || [];
  const sizeId = size?.definition?.id;
  let removed = 0;
  for (const product of listed) {
    if (!hasStoredValue(product, sizeId)) continue;
    await req('DELETE', `/products/${product.id}`, token);
    removed += 1;
    console.log('remove-sized', product.generatedName, product.sku);
  }

  if (size?.binding?.id) {
    await req('PATCH', `/attribute-definitions/bindings/${size.binding.id}`, token, {
      isActive: true,
      valueScope: 'PRODUCT',
      isRequired: false,
      sortOrder: 0,
    });
  }
  if (length?.binding?.id) {
    await req('PATCH', `/attribute-definitions/bindings/${length.binding.id}`, token, {
      isActive: true,
      valueScope: 'TRANSACTION',
      isRequired: false,
      overrideDefaultValue: null,
      sortOrder: 30,
    });
  }
  if (grade.binding?.id) {
    await req('PATCH', `/attribute-definitions/bindings/${grade.binding.id}`, token, {
      isActive: true,
      valueScope: 'PRODUCT',
      isRequired: true,
      overrideAllowedValues: [...ALLOY_REBAR_GRADES],
      sortOrder: 10,
    });
  }

  schema = (await req('GET', `/attribute-definitions/schema/${type.id}`, token)).schema || [];
  const gradeBinding = bindingOf(schema, 'grade')?.binding;
  const sizeBinding = bindingOf(schema, 'size')?.binding;
  const gradeId = bindingOf(schema, 'grade')?.definition?.id;
  if (!gradeBinding?.isRequired || gradeBinding.valueScope !== 'PRODUCT') {
    throw new Error('grade must stay required PRODUCT identity');
  }
  if (sizeBinding?.isRequired) {
    throw new Error('size must not be required identity on میلگرد آلیاژی');
  }

  const remaining = (await req(
    'GET',
    `/products?productTypeId=${encodeURIComponent(type.id)}&includeInactive=true&limit=500`,
    token,
  )).items || [];
  const existingSkus = new Set(remaining.map((item) => item.sku));

  const rows = alloyRebarIdentityRows();
  let created = 0;
  let reused = 0;
  for (const row of rows) {
    const result = await req('POST', '/products', token, {
      productTypeId: type.id,
      attributeValues: {
        [gradeId]: row.grade,
      },
      confirmDuplicate: true,
    });
    const product = result.product;
    if (hasStoredValue(product, size?.definition?.id)) {
      throw new Error(`size leaked onto Product ${product.generatedName}`);
    }
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
  console.log('done', { type: type.name, total: rows.length, removed, created, reused });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
