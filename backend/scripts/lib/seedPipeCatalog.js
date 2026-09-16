#!/usr/bin/env node
/**
 * Idempotent pipe Product catalog load via the API.
 * Does not rewrite Type identity/required/scope.
 */
const BASE = process.env.API_BASE || 'http://localhost:3100/api/v1';

export async function req(method, path, token, body) {
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

export async function login() {
  const result = await req('POST', '/auth/login', null, {
    username: process.env.JARIAN_SEED_USER || 'admin',
    password: process.env.JARIAN_SEED_PASSWORD || 'Admin123!',
  });
  const token = result.accessToken || result.token;
  if (!token) throw new Error('login returned no token');
  return token;
}

function bindingOf(schema, code) {
  const matches = (schema || []).filter((entry) => entry.definition?.code === code);
  return matches.find((entry) => entry.binding?.isActive !== false) || matches[0] || null;
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

function catalogKeyFromValues(values) {
  return Object.keys(values).sort().map((code) => `${code}=${Number(values[code])}`).join('|');
}

function sameWeight(a, b) {
  if (a === undefined || a === null || b === undefined || b === null) return true;
  return Math.abs(Number(a) - Number(b)) < 0.0001;
}

/**
 * @param {object} spec
 * @param {string} spec.typeName
 * @param {object[]} spec.rows
 * @param {(row: object) => Record<string, number>} spec.identityFromRow
 * @param {Array<{ code: string, includeLabel?: boolean, includeUnit?: boolean }>} spec.display
 * @param {boolean} [spec.lengthMustBeTransaction=true]
 * @param {string[]} [spec.forbidStoredCodes]
 */
export async function seedPipeCatalog(token, spec) {
  const {
    typeName,
    rows,
    identityFromRow,
    display,
    lengthMustBeTransaction = true,
    forbidStoredCodes = ['length', 'slot_type', 'grade'],
  } = spec;

  const types = (await req('GET', '/product-taxonomy/types?includeInactive=true', token)).items || [];
  const type = types.find((row) => row.name === typeName);
  if (!type) throw new Error(`product type ${typeName} not found`);

  const schema = (await req(
    'GET',
    `/attribute-definitions/schema/${type.id}?includeInactive=true`,
    token,
  )).schema || [];

  const identityCodes = [...new Set(rows.flatMap((row) => Object.keys(identityFromRow(row))))];
  const bindings = {};
  for (const code of identityCodes) {
    const entry = bindingOf(schema, code);
    if (!entry?.definition?.id) {
      throw new Error(`${typeName} is missing ${code} binding`);
    }
    if (entry.binding?.isActive === false) {
      throw new Error(`${typeName} ${code} is inactive — not rewriting schema`);
    }
    if (!entry.binding?.isRequired || entry.binding.valueScope !== 'PRODUCT') {
      throw new Error(`${typeName} ${code} must stay required PRODUCT identity — not rewriting schema`);
    }
    bindings[code] = entry;
  }

  const length = bindingOf(schema, 'length');
  if (lengthMustBeTransaction && length?.binding && length.binding.valueScope !== 'TRANSACTION') {
    throw new Error(`${typeName} length binding must stay TRANSACTION — not rewriting schema`);
  }

  const displayNameRule = {
    separator: ' ',
    tokens: display.map((token) => {
      const entry = bindings[token.code] || bindingOf(schema, token.code);
      if (!entry?.definition?.id) {
        throw new Error(`${typeName} display token ${token.code} is missing`);
      }
      return {
        sourceType: 'attribute',
        attributeId: entry.definition.id,
        includeLabel: Boolean(token.includeLabel),
        includeUnit: token.includeUnit !== false,
      };
    }),
  };
  displayNameRule.tokens.unshift({ sourceType: 'type', includeLabel: false });
  await req('PATCH', `/product-taxonomy/types/${type.id}`, token, { displayNameRule });

  const catalogKeys = new Set(rows.map((row) => catalogKeyFromValues(identityFromRow(row))));
  const listPath = `/products?productTypeId=${encodeURIComponent(type.id)}&includeInactive=true&limit=500`;

  let listed = (await req('GET', listPath, token)).items || [];
  let removed = 0;
  for (const product of listed) {
    const live = {};
    for (const code of identityCodes) {
      live[code] = storedNumber(product, bindings[code].definition.id);
    }
    if (catalogKeys.has(catalogKeyFromValues(live))) continue;
    await req('DELETE', `/products/${product.id}`, token);
    removed += 1;
    console.log('remove-extra', typeName, product.generatedName, product.sku);
  }
  if (removed) {
    listed = (await req('GET', listPath, token)).items || [];
  }

  const existingSkus = new Set(listed.map((item) => item.sku));
  const beforeCount = listed.length;
  let created = 0;
  let reused = 0;
  let weightsSet = 0;
  const samples = [];
  const forbidIds = forbidStoredCodes
    .map((code) => bindingOf(schema, code)?.definition?.id)
    .filter(Boolean);

  for (const row of rows) {
    const identity = identityFromRow(row);
    const attributeValues = {};
    for (const [code, value] of Object.entries(identity)) {
      attributeValues[bindings[code].definition.id] = value;
    }
    const payload = {
      productTypeId: type.id,
      attributeValues,
      confirmDuplicate: true,
    };
    if (row.unitWeight !== undefined && row.unitWeight !== null) {
      payload.unitWeight = row.unitWeight;
    }
    const result = await req('POST', '/products', token, payload);
    let product = result.product;
    for (const definitionId of forbidIds) {
      if (hasStoredValue(product, definitionId)) {
        throw new Error(`forbidden attribute leaked onto Product ${product.generatedName}`);
      }
    }
    const known = existingSkus.has(product.sku);
    if (known) reused += 1;
    else {
      created += 1;
      existingSkus.add(product.sku);
    }
    if (row.unitWeight !== undefined && !sameWeight(product.unitWeight, row.unitWeight)) {
      product = (await req('PATCH', `/products/${product.id}`, token, {
        unitWeight: row.unitWeight,
      })).product;
      weightsSet += 1;
    }
    if (samples.length < 2 || rows.indexOf(row) === rows.length - 1) {
      const weightPart = row.unitWeight === undefined ? '' : ` ${product.unitWeight}kg`;
      samples.push(`${product.generatedName}${weightPart}`);
    }
    console.log(known ? 'reuse' : 'create', typeName, product.generatedName, product.sku, product.unitWeight ?? '');
  }

  const after = (await req('GET', listPath, token)).items || [];
  const extras = [];
  for (const product of after) {
    const live = {};
    for (const code of identityCodes) {
      live[code] = storedNumber(product, bindings[code].definition.id);
    }
    if (!catalogKeys.has(catalogKeyFromValues(live))) extras.push(product.generatedName || product.sku);
  }

  const summary = {
    type: type.name,
    beforeCount,
    afterCount: after.length,
    total: rows.length,
    created,
    reused,
    removed,
    weightsSet,
    extrasLeft: extras,
    samples,
  };
  console.log('done', summary);
  return summary;
}

export const SIZE_THICKNESS_DISPLAY = Object.freeze([
  Object.freeze({ code: 'size_pipe', includeLabel: false, includeUnit: true }),
  Object.freeze({ code: 'thickness', includeLabel: true, includeUnit: true }),
]);

export function sizeThicknessFromRow(row) {
  return { size_pipe: row.size, thickness: row.thickness };
}

export default {
  req,
  login,
  seedPipeCatalog,
  SIZE_THICKNESS_DISPLAY,
  sizeThicknessFromRow,
};
