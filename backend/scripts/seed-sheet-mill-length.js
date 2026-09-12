#!/usr/bin/env node
/**
 * Idempotent: create طول ورق (sheet_length, UOM میل), bind TRANSACTION on
 * mill-sheet Types, deactivate meter length, point display-name tokens.
 * Does not rewrite Product identity / SKU (DDL-56).
 *
 *   node backend/scripts/seed-sheet-mill-length.js
 */
import {
  SHEET_LENGTH_ATTRIBUTE,
  SHEET_LENGTH_BINDING,
  SHEET_LENGTH_CODE,
  SHEET_LENGTH_METER_CODE,
  SHEET_LENGTH_UOM_CODE,
  millSheetTypeNames,
} from '../src/domain/productMaster/sheetMillLength.js';
import {
  ensureDisplayNameAttributeToken,
  replaceDisplayNameAttributeToken,
} from '../src/domain/productMaster/displayNameRule.js';

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

async function ensureDefinition(token, millId) {
  const defs = (await req('GET', '/attribute-definitions?includeInactive=true', token)).items || [];
  const existing = defs.find((row) => row.code === SHEET_LENGTH_CODE);
  if (existing) {
    return (await req('PATCH', `/attribute-definitions/${existing.id}`, token, {
      nameFa: SHEET_LENGTH_ATTRIBUTE.nameFa,
      uomId: millId,
      isActive: true,
    })).attributeDefinition;
  }
  return (await req('POST', '/attribute-definitions', token, {
    ...SHEET_LENGTH_ATTRIBUTE,
    uomId: millId,
  })).attributeDefinition;
}

async function main() {
  const login = await req('POST', '/auth/login', null, {
    username: process.env.JARIAN_SEED_USER || 'admin',
    password: process.env.JARIAN_SEED_PASSWORD || 'Admin123!',
  });
  const token = login.accessToken || login.token;
  if (!token) throw new Error('login returned no token');

  const uoms = (await req('GET', '/uom?includeInactive=true', token)).items || [];
  const mill = uoms.find((row) => row.code === SHEET_LENGTH_UOM_CODE || row.nameFa === 'میل');
  if (!mill) throw new Error(`UOM ${SHEET_LENGTH_UOM_CODE} / میل not found`);

  const definition = await ensureDefinition(token, mill.id);
  const types = (await req('GET', '/product-taxonomy/types?includeInactive=true', token)).items || [];
  const typeByName = new Map(types.map((row) => [row.name, row]));
  const bound = [];
  const missingTypes = [];
  const skipped = [];

  for (const typeName of millSheetTypeNames()) {
    const type = typeByName.get(typeName);
    if (!type) {
      missingTypes.push(typeName);
      continue;
    }

    let schema = (await req(
      'GET',
      `/attribute-definitions/schema/${type.id}?includeInactive=true`,
      token,
    )).schema || [];
    const width = bindingOf(schema, 'width');
    const thickness = bindingOf(schema, 'thickness');
    const length = bindingOf(schema, SHEET_LENGTH_METER_CODE);
    const existing = bindingOf(schema, SHEET_LENGTH_CODE);
    const identityBroken = [width, thickness].some((entry) => (
      entry?.binding && (entry.binding.valueScope !== 'PRODUCT' || !entry.binding.isRequired)
    ));
    if (identityBroken) {
      skipped.push(typeName);
      continue;
    }
    const sortOrder = existing?.binding?.sortOrder
      ?? length?.binding?.sortOrder
      ?? 30;

    if (existing?.binding) {
      await req('PATCH', `/attribute-definitions/bindings/${existing.binding.id}`, token, {
        isActive: true,
        ...SHEET_LENGTH_BINDING,
        sortOrder,
      });
    } else {
      await req('POST', '/attribute-definitions/bindings', token, {
        productTypeId: type.id,
        attributeDefinitionId: definition.id,
        ...SHEET_LENGTH_BINDING,
        sortOrder,
      });
    }

    schema = (await req(
      'GET',
      `/attribute-definitions/schema/${type.id}?includeInactive=true`,
      token,
    )).schema || [];
    const sheetLength = bindingOf(schema, SHEET_LENGTH_CODE);
    const liveType = (await req('GET', `/product-taxonomy/types/${type.id}`, token)).productType || type;
    let rule = liveType.displayNameRule || null;
    if (length?.definition?.id && sheetLength?.definition?.id) {
      rule = replaceDisplayNameAttributeToken(rule, length.definition.id, sheetLength.definition.id) || rule;
    }
    if (sheetLength?.definition?.id) {
      rule = ensureDisplayNameAttributeToken(rule, sheetLength.definition.id, {
        afterAttributeId: width?.definition?.id,
      }) || rule;
    }
    if (rule && JSON.stringify(rule) !== JSON.stringify(liveType.displayNameRule || null)) {
      await req('PATCH', `/product-taxonomy/types/${type.id}`, token, { displayNameRule: rule });
    }

    const lengthAfter = bindingOf(schema, SHEET_LENGTH_METER_CODE);
    if (lengthAfter?.binding?.id && lengthAfter.binding.isActive !== false) {
      await req('PATCH', `/attribute-definitions/bindings/${lengthAfter.binding.id}`, token, {
        isActive: false,
      });
    }
    bound.push(typeName);
  }

  console.log('done', {
    definitionId: definition.id,
    bound: bound.length,
    types: bound,
    missingTypes,
    skipped,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
