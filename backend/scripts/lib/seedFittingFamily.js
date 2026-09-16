/**
 * Shared idempotent seed helpers for steel-fitting families.
 * Reuses `fitting_material` / inch size defs when the welded seed already
 * created them. Does not create Types or rewrite sku_code.
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

export function bindingOf(schema, code) {
  return (schema || []).find((entry) => entry.definition?.code === code) || null;
}

export function hasStoredValue(product, definitionId) {
  if (!definitionId) return false;
  const attrs = Array.isArray(product?.attributeValues) ? product.attributeValues : [];
  return attrs.some((item) => item.attributeDefinitionId === definitionId);
}

export function storedMaterial(product, definitionId) {
  const attrs = Array.isArray(product?.attributeValues) ? product.attributeValues : [];
  const row = attrs.find((item) => item.attributeDefinitionId === definitionId);
  return row?.valueText ?? row?.normalizedValue ?? row?.value ?? null;
}

function hasOnlyTypeToken(rule) {
  const tokens = rule?.tokens || [];
  return tokens.length === 0 || (tokens.length === 1 && tokens[0]?.sourceType === 'type');
}

function sameOptionValues(existing, wanted) {
  const have = new Set((existing || []).map((item) => item.value));
  return wanted.every((item) => have.has(item.value));
}

export async function ensureBinding(token, typeId, definitionId, patch) {
  try {
    await req('POST', '/attribute-definitions/bindings', token, {
      productTypeId: typeId,
      attributeDefinitionId: definitionId,
      ...patch,
    });
  } catch (err) {
    if (!String(err.message || '').includes('409')) throw err;
  }
  const schema = (await req(
    'GET',
    `/attribute-definitions/schema/${typeId}?includeInactive=true`,
    token,
  )).schema || [];
  const entry = (schema || []).find((row) => row.definition?.id === definitionId);
  if (!entry?.binding?.id) throw new Error(`binding missing for ${definitionId} on ${typeId}`);
  await req('PATCH', `/attribute-definitions/bindings/${entry.binding.id}`, token, {
    isActive: true,
    ...patch,
  });
}

async function fetchDefs(token) {
  return (await req('GET', '/attribute-definitions?includeInactive=true', token)).items || [];
}

/**
 * Create-or-reuse Attribute Definitions. 409 from a parallel welded seed
 * is treated as reuse.
 */
export async function ensureDefinitions(token, specs, { inchId, sizeCodes = [] } = {}) {
  const listed = await fetchDefs(token);
  const byCode = new Map(listed.map((row) => [row.code, row]));
  const createdCodes = [];
  const reusedCodes = [];
  for (const spec of specs) {
    const existing = byCode.get(spec.code);
    const isSize = sizeCodes.includes(spec.code);
    if (existing) {
      reusedCodes.push(spec.code);
      const patch = { isActive: true, nameFa: spec.nameFa };
      if (spec.dataType === 'ENUM' && spec.allowedValues && !sameOptionValues(existing.allowedValues, spec.allowedValues)) {
        patch.allowedValues = spec.allowedValues;
      }
      if (isSize) {
        if (inchId && existing.uomId !== inchId) patch.uomId = inchId;
        if (spec.minValue != null && existing.minValue !== spec.minValue) patch.minValue = spec.minValue;
        if (spec.maxValue != null && existing.maxValue !== spec.maxValue) patch.maxValue = spec.maxValue;
      }
      const keys = Object.keys(patch).filter((key) => key !== 'isActive' && key !== 'nameFa');
      if (keys.length || patch.nameFa !== existing.nameFa || existing.isActive === false) {
        const updated = (await req('PATCH', `/attribute-definitions/${existing.id}`, token, patch))
          .attributeDefinition;
        byCode.set(spec.code, updated);
      }
      continue;
    }
    const body = { ...spec };
    if (isSize && inchId) body.uomId = inchId;
    try {
      const created = (await req('POST', '/attribute-definitions', token, body)).attributeDefinition;
      byCode.set(spec.code, created);
      createdCodes.push(spec.code);
      console.log('created-attr', spec.code);
    } catch (err) {
      if (!String(err.message || '').includes('409')) throw err;
      const again = (await fetchDefs(token)).find((row) => row.code === spec.code);
      if (!again) throw err;
      byCode.set(spec.code, again);
      reusedCodes.push(spec.code);
      console.log('reused-attr-race', spec.code);
    }
  }
  return { byCode, createdCodes, reusedCodes };
}

export async function seedFittingType(token, {
  type,
  defs,
  bindingPlan,
  identityRows,
  forbiddenStoredCodes,
  deactivateCodes = [],
  displayNameRule,
  units,
  materialCode,
}) {
  for (const row of bindingPlan) {
    const def = defs.get(row.code) || null;
    if (!def?.id) throw new Error(`${type.name} missing definition ${row.code}`);
    const patch = {
      isRequired: row.isRequired,
      valueScope: row.valueScope,
      sortOrder: row.sortOrder,
    };
    if (row.overrideMin != null) patch.overrideMin = row.overrideMin;
    if (row.overrideMax != null) patch.overrideMax = row.overrideMax;
    if (row.overrideDefaultValue != null) patch.overrideDefaultValue = row.overrideDefaultValue;
    if (row.overrideAllowedValues) patch.overrideAllowedValues = [...row.overrideAllowedValues];
    await ensureBinding(token, type.id, def.id, patch);
  }

  let schema = (await req(
    'GET',
    `/attribute-definitions/schema/${type.id}?includeInactive=true`,
    token,
  )).schema || [];
  for (const code of deactivateCodes) {
    const entry = bindingOf(schema, code);
    if (entry?.binding?.id && entry.binding.isActive !== false) {
      await req('PATCH', `/attribute-definitions/bindings/${entry.binding.id}`, token, {
        isActive: false,
        isRequired: false,
      });
    }
  }

  const offerPatch = {};
  if (units.countId && !type.defaultCountUnitId) offerPatch.defaultCountUnitId = units.countId;
  if (units.salesId && !type.defaultSalesUnitId) offerPatch.defaultSalesUnitId = units.salesId;

  schema = (await req(
    'GET',
    `/attribute-definitions/schema/${type.id}?includeInactive=true`,
    token,
  )).schema || [];
  const material = bindingOf(schema, materialCode);
  if (!material?.definition?.id) {
    throw new Error(`${type.name} is missing ${materialCode} binding`);
  }
  if (!material.binding?.isRequired || material.binding.valueScope !== 'PRODUCT') {
    throw new Error(`${type.name} ${materialCode} must stay required PRODUCT identity`);
  }
  const liveType = (await req('GET', `/product-taxonomy/types/${type.id}`, token)).productType || type;
  if (hasOnlyTypeToken(liveType.displayNameRule) && material.definition.id) {
    offerPatch.displayNameRule = displayNameRule({ materialId: material.definition.id });
  }
  if (Object.keys(offerPatch).length) {
    await req('PATCH', `/product-taxonomy/types/${type.id}`, token, offerPatch);
  }

  schema = (await req(
    'GET',
    `/attribute-definitions/schema/${type.id}?includeInactive=true`,
    token,
  )).schema || [];
  const materialId = bindingOf(schema, materialCode)?.definition?.id;
  const forbiddenIds = forbiddenStoredCodes
    .map((code) => bindingOf(schema, code)?.definition?.id)
    .filter(Boolean);

  const rows = identityRows(type.name);
  const catalogKeys = new Set(rows.map((item) => item.fitting_material));
  const listed = (await req(
    'GET',
    `/products?productTypeId=${encodeURIComponent(type.id)}&includeInactive=true&limit=500`,
    token,
  )).items || [];
  const existingSkus = new Set(listed.map((item) => item.sku));
  let created = 0;
  let reused = 0;
  const samples = [];
  for (const row of rows) {
    const result = await req('POST', '/products', token, {
      productTypeId: type.id,
      attributeValues: {
        [materialId]: row.fitting_material,
      },
      confirmDuplicate: true,
    });
    const product = result.product;
    for (const definitionId of forbiddenIds) {
      if (hasStoredValue(product, definitionId)) {
        throw new Error(`transaction/forbidden attr leaked onto Product ${product.generatedName}`);
      }
    }
    const stored = Array.isArray(product.attributeValues) ? product.attributeValues : [];
    if (stored.some((item) => item.attributeDefinitionId !== materialId)) {
      throw new Error(`non-material attr stored on Product ${product.generatedName}`);
    }
    const known = existingSkus.has(product.sku);
    if (known) reused += 1;
    else {
      created += 1;
      existingSkus.add(product.sku);
    }
    if (samples.length < 1 || rows.indexOf(row) === rows.length - 1) {
      samples.push({ sku: product.sku, generatedName: product.generatedName });
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
    const key = storedMaterial(product, materialId);
    if (!catalogKeys.has(key)) extras.push(product.generatedName || product.sku);
  }

  return {
    type: type.name,
    total: rows.length,
    created,
    reused,
    skipped: extras.length,
    extrasLeft: extras,
    samples,
  };
}

export async function findTypesInCategory(token, categoryName, typeNames) {
  const cats = (await req('GET', '/product-taxonomy/categories?includeInactive=true', token)).items || [];
  const category = cats.find((row) => row.name === categoryName);
  if (!category) throw new Error(`category ${categoryName} not found`);
  const types = (await req(
    'GET',
    `/product-taxonomy/types?categoryId=${encodeURIComponent(category.id)}&includeInactive=true`,
    token,
  )).items || [];
  return typeNames.map((name) => {
    const type = types.find((row) => row.name === name);
    if (!type) throw new Error(`product type ${name} not found in ${categoryName}`);
    return type;
  });
}

export default {
  req,
  login,
  bindingOf,
  ensureDefinitions,
  seedFittingType,
  findTypesInCategory,
};
