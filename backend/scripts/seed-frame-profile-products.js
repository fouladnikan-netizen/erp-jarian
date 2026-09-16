#!/usr/bin/env node
/**
 * Idempotent catalog load: پروفیل چهارچوب model×thickness×mill-length Products.
 * Completes operator schema so two mill lengths can live on one Type:
 *   - bind frame_model as required PRODUCT identity
 *   - store mill bar length on Product (PRODUCT), not as a single Type default
 *   - deactivate leftover dimensions ENUM stub
 * Thickness identity/required is not rewritten.
 *
 *   node backend/scripts/seed-frame-profile-products.js
 */
import {
  FRAME_PROFILE_MODEL_CODE,
  FRAME_PROFILE_MODEL_OPTIONS,
  FRAME_PROFILE_TYPE_NAME,
  frameProfileDisplayNameRule,
  frameProfileIdentityRows,
} from '../src/domain/productMaster/frameProfileCatalog.js';
import { KIND_CODE, mergeEnumOptions } from '../src/domain/productMaster/attributeDedupMap.js';

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

async function ensureModelDefinition(token) {
  const defs = (await req('GET', '/attribute-definitions?includeInactive=true', token)).items || [];
  const existing = defs.find((item) => item.code === FRAME_PROFILE_MODEL_CODE);
  if (existing) {
    const next = mergeEnumOptions(existing.allowedValues, FRAME_PROFILE_MODEL_OPTIONS);
    if (next.length === (existing.allowedValues || []).length) return existing;
    return (await req('PATCH', `/attribute-definitions/${existing.id}`, token, {
      allowedValues: next,
    })).attributeDefinition;
  }
  if (FRAME_PROFILE_MODEL_CODE === KIND_CODE) {
    throw new Error('shared kind definition missing — refusing to create a frame-model-only catalog');
  }
  return (await req('POST', '/attribute-definitions', token, {
    code: FRAME_PROFILE_MODEL_CODE,
    nameFa: 'مدل',
    dataType: 'ENUM',
    allowedValues: FRAME_PROFILE_MODEL_OPTIONS,
  })).attributeDefinition;
}

async function main() {
  const login = await req('POST', '/auth/login', null, {
    username: process.env.JARIAN_SEED_USER || 'admin',
    password: process.env.JARIAN_SEED_PASSWORD || 'Admin123!',
  });
  const token = login.accessToken || login.token;
  if (!token) throw new Error('login returned no token');

  const types = (await req('GET', '/product-taxonomy/types?includeInactive=true', token)).items || [];
  const type = types.find((row) => row.name === FRAME_PROFILE_TYPE_NAME);
  if (!type) throw new Error('product type پروفیل چهارچوب not found');

  const modelDef = await ensureModelDefinition(token);
  let schema = (await req(
    'GET',
    `/attribute-definitions/schema/${type.id}?includeInactive=true`,
    token,
  )).schema || [];

  const thickness = bindingOf(schema, 'thickness');
  if (!thickness?.definition?.id) {
    throw new Error('پروفیل چهارچوب is missing thickness binding');
  }
  if (!thickness.binding?.isRequired || thickness.binding.valueScope !== 'PRODUCT') {
    throw new Error('پروفیل چهارچوب thickness must stay required PRODUCT identity — not rewriting it');
  }

  let model = bindingOf(schema, FRAME_PROFILE_MODEL_CODE);
  if (!model?.binding?.id) {
    await req('POST', '/attribute-definitions/bindings', token, {
      productTypeId: type.id,
      attributeDefinitionId: modelDef.id,
      isRequired: true,
      valueScope: 'PRODUCT',
      sortOrder: 5,
    });
  } else if (!model.binding.isActive) {
    await req('PATCH', `/attribute-definitions/bindings/${model.binding.id}`, token, {
      isActive: true,
      isRequired: true,
      valueScope: 'PRODUCT',
      sortOrder: 5,
    });
  }

  const dimensions = bindingOf(schema, 'dimensions');
  if (dimensions?.binding?.id && dimensions.binding.isActive) {
    await req('PATCH', `/attribute-definitions/bindings/${dimensions.binding.id}`, token, {
      isActive: false,
    });
  }

  const length = bindingOf(schema, 'length');
  if (!length?.binding?.id) {
    throw new Error('پروفیل چهارچوب is missing length binding');
  }
  if (length.binding.valueScope !== 'PRODUCT' || length.binding.overrideDefaultValue != null) {
    await req('PATCH', `/attribute-definitions/bindings/${length.binding.id}`, token, {
      valueScope: 'PRODUCT',
      isRequired: true,
      overrideDefaultValue: null,
    });
  }

  schema = (await req(
    'GET',
    `/attribute-definitions/schema/${type.id}?includeInactive=true`,
    token,
  )).schema || [];
  model = bindingOf(schema, FRAME_PROFILE_MODEL_CODE);
  const lengthLive = bindingOf(schema, 'length');
  const thicknessLive = bindingOf(schema, 'thickness');
  if (!model?.definition?.id || !model.binding?.isRequired || model.binding.valueScope !== 'PRODUCT') {
    throw new Error('kind (frame model) must be required PRODUCT identity');
  }
  if (lengthLive.binding.valueScope !== 'PRODUCT' || !lengthLive.binding.isRequired) {
    throw new Error('length must be required PRODUCT mill bar length on this Type');
  }

  await req('PATCH', `/product-taxonomy/types/${type.id}`, token, {
    displayNameRule: frameProfileDisplayNameRule({
      modelId: model.definition.id,
      thicknessId: thicknessLive.definition.id,
      lengthId: lengthLive.definition.id,
    }),
  });

  const listed = (await req(
    'GET',
    `/products?productTypeId=${encodeURIComponent(type.id)}&includeInactive=true&limit=200`,
    token,
  )).items || [];
  const existingSkus = new Set(listed.map((item) => item.sku));

  const rows = frameProfileIdentityRows();
  let created = 0;
  let reused = 0;
  for (const row of rows) {
    const result = await req('POST', '/products', token, {
      productTypeId: type.id,
      attributeValues: {
        [model.definition.id]: row.model,
        [thicknessLive.definition.id]: row.thickness,
        [lengthLive.definition.id]: row.millLength,
      },
      confirmDuplicate: true,
    });
    const product = result.product;
    if (!hasStoredValue(product, lengthLive.definition.id)) {
      throw new Error(`mill length missing on Product ${product.generatedName}`);
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
