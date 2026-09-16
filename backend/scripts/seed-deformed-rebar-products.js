#!/usr/bin/env node
/**
 * Idempotent catalog load: میلگرد آجدار size×grade Products via the Product API.
 * Exact identity match reuses the existing Product (DDL-50). Length stays
 * TRANSACTION with Type default 12m — not stored on the Product.
 *
 *   node backend/scripts/seed-deformed-rebar-products.js
 */
import {
  DEFORMED_REBAR_DEFAULT_LENGTH_M,
  DEFORMED_REBAR_GROUP_NAME,
  DEFORMED_REBAR_TYPE_NAME,
  deformedRebarIdentityRows,
} from '../src/domain/productMaster/deformedRebarCatalog.js';

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

async function main() {
  const login = await req('POST', '/auth/login', null, {
    username: process.env.JARIAN_SEED_USER || 'admin',
    password: process.env.JARIAN_SEED_PASSWORD || 'Admin123!',
  });
  const token = login.accessToken || login.token;
  if (!token) throw new Error('login returned no token');

  const types = (await req('GET', '/product-taxonomy/types?includeInactive=true', token)).items || [];
  const type = types.find((row) => (
    row.name === DEFORMED_REBAR_TYPE_NAME
    && (row.groupName === DEFORMED_REBAR_GROUP_NAME || !row.groupName)
  )) || types.find((row) => row.name === DEFORMED_REBAR_TYPE_NAME);
  if (!type) throw new Error('product type میلگرد آجدار not found');

  let schema = (await req('GET', `/attribute-definitions/schema/${type.id}?includeInactive=true`, token)).schema || [];
  const size = bindingOf(schema, 'size');
  const grade = bindingOf(schema, 'grade');
  const length = bindingOf(schema, 'length');
  if (!size?.definition?.id || !grade?.definition?.id) {
    throw new Error('میلگرد آجدار is missing required size/grade bindings');
  }

  if (length?.binding?.id) {
    await req('PATCH', `/attribute-definitions/bindings/${length.binding.id}`, token, {
      isActive: true,
      valueScope: 'TRANSACTION',
      isRequired: true,
      overrideDefaultValue: DEFORMED_REBAR_DEFAULT_LENGTH_M,
    });
  }
  if (grade.binding?.id) {
    await req('PATCH', `/attribute-definitions/bindings/${grade.binding.id}`, token, {
      isActive: true,
      valueScope: 'PRODUCT',
      isRequired: true,
      overrideAllowedValues: ['A2', 'A3', 'A4'],
    });
  }
  if (size.binding?.id) {
    await req('PATCH', `/attribute-definitions/bindings/${size.binding.id}`, token, {
      isActive: true,
      valueScope: 'PRODUCT',
      isRequired: true,
    });
  }

  schema = (await req('GET', `/attribute-definitions/schema/${type.id}`, token)).schema || [];
  const sizeId = bindingOf(schema, 'size')?.definition?.id;
  const gradeId = bindingOf(schema, 'grade')?.definition?.id;
  const lengthBinding = bindingOf(schema, 'length')?.binding;
  if (lengthBinding && lengthBinding.valueScope !== 'TRANSACTION') {
    throw new Error('length binding must stay TRANSACTION before creating Products');
  }

  const listed = (await req(
    'GET',
    `/products?productTypeId=${encodeURIComponent(type.id)}&includeInactive=true&limit=200`,
    token,
  )).items || [];
  const existingSkus = new Set(listed.map((item) => item.sku));

  const rows = deformedRebarIdentityRows();
  let created = 0;
  let reused = 0;
  for (const row of rows) {
    const result = await req('POST', '/products', token, {
      productTypeId: type.id,
      attributeValues: {
        [sizeId]: row.size,
        [gradeId]: row.grade,
      },
      confirmDuplicate: true,
    });
    const product = result.product;
    const attrs = Array.isArray(product?.attributeValues) ? product.attributeValues : [];
    const lengthId = bindingOf(schema, 'length')?.definition?.id;
    if (lengthId && attrs.some((item) => item.attributeDefinitionId === lengthId)) {
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
