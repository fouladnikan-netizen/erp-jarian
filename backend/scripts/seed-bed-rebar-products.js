#!/usr/bin/env node
/**
 * Idempotent catalog load: میلگرد بستر kind×bed_width×wire-size Products via the API.
 * Does not rewrite Type bindings. Length stays TRANSACTION (not stored).
 *
 *   node backend/scripts/seed-bed-rebar-products.js
 */
import {
  BED_REBAR_GROUP_NAME,
  BED_REBAR_KINDS,
  BED_REBAR_TYPE_NAME,
  BED_REBAR_WIDTH_VALUES,
  bedRebarIdentityRows,
} from '../src/domain/productMaster/bedRebarCatalog.js';

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

const KIND_RENAMES = Object.freeze({
  'خرپایی Truss': { value: 'خرپایی', labelFa: 'خرپایی' },
  'نردبانی Ladder': { value: 'نردبانی', labelFa: 'نردبانی' },
});

function kindSkuToken(kind) {
  const ascii = String(kind || '').trim();
  const compact = ascii.replace(/[^A-Za-z0-9]+/g, '');
  return compact || ascii.replace(/\s+/g, '');
}

function kindStoredValue(product, kindDefinitionId) {
  const attrs = Array.isArray(product?.attributeValues) ? product.attributeValues : [];
  const row = attrs.find((item) => item.attributeDefinitionId === kindDefinitionId);
  return row?.valueText || row?.normalizedValue || null;
}

function withoutLatinKindLabels(allowedValues) {
  const next = [];
  const seen = new Set();
  for (const item of allowedValues || []) {
    const renamed = KIND_RENAMES[item.value];
    const option = renamed || { value: item.value, labelFa: item.labelFa };
    if (seen.has(option.value)) continue;
    seen.add(option.value);
    next.push(option);
  }
  for (const value of BED_REBAR_KINDS) {
    if (seen.has(value)) continue;
    seen.add(value);
    next.push({ value, labelFa: value });
  }
  return next;
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
    row.name === BED_REBAR_TYPE_NAME
    && (row.groupName === BED_REBAR_GROUP_NAME || !row.groupName)
  )) || types.find((row) => row.name === BED_REBAR_TYPE_NAME);
  if (!type) throw new Error('product type میلگرد بستر not found');

  const schema = (await req('GET', `/attribute-definitions/schema/${type.id}`, token)).schema || [];
  const kind = bindingOf(schema, 'kind');
  const size = bindingOf(schema, 'size');
  const bedWidth = bindingOf(schema, 'bed_width');
  const length = bindingOf(schema, 'length');
  if (!kind?.definition?.id || !size?.definition?.id || !bedWidth?.definition?.id) {
    throw new Error('میلگرد بستر is missing kind/size/bed_width bindings');
  }
  if (bedWidth.definition.dataType !== 'ENUM') {
    throw new Error('میلگرد بستر bed_width must stay ENUM — not rewriting schema');
  }
  if (!kind.binding?.isRequired || kind.binding.valueScope !== 'PRODUCT') {
    throw new Error('میلگرد بستر kind must stay required PRODUCT identity — not rewriting schema');
  }
  if (!size.binding?.isRequired || size.binding.valueScope !== 'PRODUCT') {
    throw new Error('میلگرد بستر size must stay required PRODUCT identity — not rewriting schema');
  }
  if (!bedWidth.binding?.isRequired || bedWidth.binding.valueScope !== 'PRODUCT') {
    throw new Error('میلگرد بستر bed_width must stay required PRODUCT identity — not rewriting schema');
  }
  if (length?.binding && length.binding.valueScope !== 'TRANSACTION') {
    throw new Error('length binding must stay TRANSACTION before creating Products');
  }

  const listed = (await req(
    'GET',
    `/products?productTypeId=${encodeURIComponent(type.id)}&includeInactive=true&limit=200`,
    token,
  )).items || [];
  let removed = 0;
  for (const product of listed) {
    const storedKind = kindStoredValue(product, kind.definition.id);
    const latin = Boolean(storedKind && KIND_RENAMES[storedKind]);
    const missingKind = !storedKind;
    const token = kindSkuToken(storedKind);
    const skuMissingKind = Boolean(token && !String(product.sku || '').includes(token));
    if (!latin && !missingKind && !skuMissingKind) continue;
    await req('DELETE', `/products/${product.id}`, token);
    removed += 1;
    console.log('remove-latin-kind', product.generatedName, product.sku);
  }

  const cleanedAllowed = withoutLatinKindLabels(kind.definition.allowedValues);
  await req('PATCH', `/attribute-definitions/${kind.definition.id}`, token, {
    allowedValues: cleanedAllowed,
  });
  await req('PATCH', `/attribute-definitions/bindings/${kind.binding.id}`, token, {
    overrideAllowedValues: [...BED_REBAR_KINDS],
  });
  await req('PATCH', `/attribute-definitions/bindings/${bedWidth.binding.id}`, token, {
    overrideAllowedValues: [...BED_REBAR_WIDTH_VALUES],
  });

  const schemaAfter = (await req('GET', `/attribute-definitions/schema/${type.id}`, token)).schema || [];
  const kindAfter = bindingOf(schemaAfter, 'kind');
  const sizeAfter = bindingOf(schemaAfter, 'size');
  const bedWidthAfter = bindingOf(schemaAfter, 'bed_width');
  const effective = new Set((kindAfter?.binding?.effectiveAllowedValues || []).map((item) => item.value));
  for (const value of BED_REBAR_KINDS) {
    if (!effective.has(value)) {
      throw new Error(`kind value ${value} is not in the Type allowed subset`);
    }
  }
  if ([...effective].some((value) => /Truss|Ladder/i.test(value))) {
    throw new Error('Latin Truss/Ladder still present on میلگرد بستر kind subset');
  }

  const remaining = (await req(
    'GET',
    `/products?productTypeId=${encodeURIComponent(type.id)}&includeInactive=true&limit=200`,
    token,
  )).items || [];
  const existingSkus = new Set(remaining.map((item) => item.sku));

  const rows = bedRebarIdentityRows();
  let created = 0;
  let reused = 0;
  for (const row of rows) {
    const result = await req('POST', '/products', token, {
      productTypeId: type.id,
      attributeValues: {
        [kindAfter.definition.id]: row.kind,
        [sizeAfter.definition.id]: row.size,
        [bedWidthAfter.definition.id]: row.bedWidth,
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
  console.log('done', { type: type.name, total: rows.length, removed, created, reused });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
