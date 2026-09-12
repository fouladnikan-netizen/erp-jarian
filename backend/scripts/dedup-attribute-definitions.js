#!/usr/bin/env node
/**
 * DDL-66: collapse duplicated Attribute Definitions onto shared vocabulary.
 * Idempotent. Does not delete Products or rewrite SKUs.
 *
 *   node backend/scripts/dedup-attribute-definitions.js --dry-run
 *   node backend/scripts/dedup-attribute-definitions.js
 *   DRY_RUN=1 node backend/scripts/dedup-attribute-definitions.js
 */
import {
  ATTRIBUTE_DEDUP_MAP,
  CLASS_ATTRIBUTE,
  CLASS_CODE,
  DEACTIVATE_AFTER_MIGRATE,
  KIND_CODE,
  KIND_EXTRA_OPTIONS,
  LENGTH_MM_ATTRIBUTE,
  LENGTH_MM_CODE,
  MILL_SUPPLY_FORM_VALUES,
  SIZE_BRANCH_CODE,
  SIZE_BRANCH_NAME_FA,
  SUPPLY_FORM_CODE,
  SUPPLY_FORM_EXTRA_OPTIONS,
  mergeEnumOptions,
} from '../src/domain/productMaster/attributeDedupMap.js';
import { millSheetTypeNames } from '../src/domain/productMaster/sheetMillLength.js';
import { FRAME_PROFILE_MODEL_OPTIONS, FRAME_PROFILE_TYPE_NAME } from '../src/domain/productMaster/frameProfileCatalog.js';
import { FLANGE_TYPE_LATIN_BY_NAME, FLANGE_TYPE_NAME_ALIASES } from '../src/domain/productMaster/flangeCatalog.js';
import {
  FASTENER_LENGTH_MAX_MM,
  FASTENER_LENGTH_MIN_MM,
  FASTENER_TYPE_NAMES,
  fastenerBindingPlan,
} from '../src/domain/productMaster/fastenerCatalog.js';
import { forgedFittingBindingPlan, FORGED_FITTING_TYPE_NAMES } from '../src/domain/productMaster/forgedFittingCatalog.js';
import { threadedFittingBindingPlan, THREADED_FITTING_TYPE_NAMES } from '../src/domain/productMaster/threadedFittingCatalog.js';
import { flangeBindingPlan, FLANGE_TYPE_NAMES } from '../src/domain/productMaster/flangeCatalog.js';
import {
  seamlessWeldedFittingBindingPlan,
  SEAMLESS_WELDED_FITTING_TYPE_NAMES,
} from '../src/domain/productMaster/seamlessWeldedFittingCatalog.js';
import {
  FOOTBOARD_DEACTIVATE_CODES,
  FOOTBOARD_TYPE_NAME,
  PLYWOOD_DEACTIVATE_CODES,
  PLYWOOD_TYPE_NAMES,
  isFootboardType,
  isPlywoodType,
  russianWoodBindingPlan,
  footboardDisplayNameRule,
  plywoodDisplayNameRule,
} from '../src/domain/productMaster/russianWoodCatalog.js';
import { ensureBinding } from './lib/seedFittingFamily.js';
import { query, pool } from '../src/db/pool.js';
import { newEntityId } from '../src/lib/ids.js';

const BASE = process.env.API_BASE || 'http://localhost:3100/api/v1';
const DRY_RUN = process.argv.includes('--dry-run')
  || process.env.DRY_RUN === '1'
  || process.env.DRY_RUN === 'true';

const IDENTITY_COPY = Object.freeze([
  Object.freeze({ from: 'plywood_thickness_mm', to: 'thickness', expected: 44 }),
  Object.freeze({ from: 'board_length_m', to: 'length', expected: 10 }),
  Object.freeze({ from: 'frame_model', to: KIND_CODE, expected: 17 }),
]);

const TRACKED_CODES = Object.freeze([
  ...DEACTIVATE_AFTER_MIGRATE,
  CLASS_CODE,
  LENGTH_MM_CODE,
  KIND_CODE,
  SUPPLY_FORM_CODE,
  'length',
  'thickness',
  'width',
  'height',
  'sheet_length',
  'size_pipe',
  SIZE_BRANCH_CODE,
]);

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

function millimetreUom(uoms, fastenerLengthDef) {
  if (fastenerLengthDef?.uomId) {
    const fromFastener = uoms.find((row) => row.id === fastenerLengthDef.uomId);
    if (fromFastener && (fromFastener.code === 'MM' || fromFastener.id === 'uom_mm')) {
      return fromFastener;
    }
  }
  return uoms.find((row) => row.code === 'MM' && row.category === 'LENGTH')
    || uoms.find((row) => row.code === 'MM')
    || uoms.find((row) => row.id === 'uom_mm')
    || null;
}

async function inventory(token) {
  const defs = (await req('GET', '/attribute-definitions?includeInactive=true', token)).items || [];
  const counts = {};
  for (const def of defs) {
    const bind = await query(
      'SELECT COUNT(*)::int AS n FROM product_type_attributes WHERE attribute_definition_id = $1 AND is_active = true',
      [def.id],
    );
    const stored = await query(
      'SELECT COUNT(*)::int AS n FROM product_attribute_values WHERE attribute_definition_id = $1',
      [def.id],
    );
    counts[def.code] = {
      id: def.id,
      nameFa: def.nameFa,
      active: def.isActive !== false,
      bindings: bind.rows[0].n,
      stored: stored.rows[0].n,
    };
  }
  return { defs, counts };
}

async function mergeCatalog(token, def, extras) {
  if (!def || def.dataType !== 'ENUM') return def;
  const next = mergeEnumOptions(def.allowedValues, extras);
  if (next.length === (def.allowedValues || []).length) return def;
  if (DRY_RUN) {
    console.log('dry-run merge-catalog', def.code, 'extras', next.length - (def.allowedValues || []).length);
    return { ...def, allowedValues: next };
  }
  return (await req('PATCH', `/attribute-definitions/${def.id}`, token, {
    allowedValues: next,
  })).attributeDefinition;
}

async function copyValues(fromId, toId) {
  if (!fromId || !toId || fromId === toId) return 0;
  const rows = await query(
    `SELECT product_id, value_text, value_number, value_boolean, normalized_value
     FROM product_attribute_values WHERE attribute_definition_id = $1`,
    [fromId],
  );
  if (DRY_RUN) return rows.rowCount;
  let copied = 0;
  for (const row of rows.rows) {
    const exists = await query(
      `SELECT 1 FROM product_attribute_values
       WHERE product_id = $1 AND attribute_definition_id = $2`,
      [row.product_id, toId],
    );
    if (!exists.rowCount) {
      await query(
        `INSERT INTO product_attribute_values
           (id, product_id, attribute_definition_id, value_text, value_number, value_boolean, normalized_value)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          newEntityId('pav'),
          row.product_id,
          toId,
          row.value_text,
          row.value_number,
          row.value_boolean,
          row.normalized_value,
        ],
      );
      copied += 1;
    }
  }
  return copied;
}

async function deleteValues(definitionId) {
  if (!definitionId) return 0;
  if (DRY_RUN) {
    const n = await query(
      'SELECT COUNT(*)::int AS n FROM product_attribute_values WHERE attribute_definition_id = $1',
      [definitionId],
    );
    return n.rows[0].n;
  }
  const res = await query(
    'DELETE FROM product_attribute_values WHERE attribute_definition_id = $1',
    [definitionId],
  );
  return res.rowCount;
}

async function deleteAllowed(definitionId) {
  if (!definitionId) return 0;
  if (DRY_RUN) return 0;
  const res = await query(
    'DELETE FROM product_allowed_attribute_values WHERE attribute_definition_id = $1',
    [definitionId],
  );
  return res.rowCount;
}

async function applyPlan(token, type, plan) {
  const defs = (await req('GET', '/attribute-definitions?includeInactive=true', token)).items || [];
  const byCode = new Map(defs.map((row) => [row.code, row]));
  for (const row of plan) {
    const def = byCode.get(row.code);
    if (!def?.id) {
      if (DRY_RUN) {
        console.log('dry-run missing-definition', type.name, row.code);
        continue;
      }
      throw new Error(`${type.name} missing definition ${row.code}`);
    }
    const patch = {
      isRequired: row.isRequired,
      valueScope: row.valueScope,
      sortOrder: row.sortOrder,
    };
    if (row.overrideMin != null) patch.overrideMin = row.overrideMin;
    if (row.overrideMax != null) patch.overrideMax = row.overrideMax;
    if (row.overrideDefaultValue != null) patch.overrideDefaultValue = row.overrideDefaultValue;
    if (row.overrideAllowedValues) patch.overrideAllowedValues = [...row.overrideAllowedValues];
    if (DRY_RUN) {
      console.log('dry-run bind', type.name, row.code, patch.valueScope, patch.isRequired ? 'required' : 'optional');
      continue;
    }
    await ensureBinding(token, type.id, def.id, patch);
  }
}

async function deactivateBindings(token, typeId, codes) {
  const schema = (await req(
    'GET',
    `/attribute-definitions/schema/${typeId}?includeInactive=true`,
    token,
  )).schema || [];
  for (const code of codes) {
    const entry = bindingOf(schema, code);
    if (!entry?.binding?.id) continue;
    const used = await query(
      `SELECT 1 FROM product_attribute_values pav
       JOIN products p ON p.id = pav.product_id
       WHERE p.product_type_id = $1 AND pav.attribute_definition_id = $2
       LIMIT 1`,
      [typeId, entry.definition.id],
    );
    if (used.rowCount) continue;
    if (DRY_RUN) {
      console.log('dry-run unbind', code, typeId);
      continue;
    }
    try {
      await req('DELETE', `/attribute-definitions/bindings/${entry.binding.id}`, token);
      console.log('unbind', code, typeId);
    } catch (err) {
      await req('PATCH', `/attribute-definitions/bindings/${entry.binding.id}`, token, {
        isActive: false,
        isRequired: false,
      });
      console.log('deactivate-binding', code, typeId, String(err.message || '').slice(0, 80));
    }
  }
}

async function rebuildIdentity(productId) {
  if (DRY_RUN) return;
  const product = (await query('SELECT * FROM products WHERE id = $1', [productId])).rows[0];
  if (!product) return;
  const schema = (await query(
    `SELECT pta.is_identity_relevant, ad.code, pav.normalized_value
     FROM product_type_attributes pta
     JOIN attribute_definitions ad ON ad.id = pta.attribute_definition_id
     LEFT JOIN product_attribute_values pav
       ON pav.attribute_definition_id = ad.id AND pav.product_id = $1
     WHERE pta.product_type_id = $2 AND pta.is_active = true
     ORDER BY pta.sort_order`,
    [productId, product.product_type_id],
  )).rows;
  const parts = schema
    .filter((row) => row.is_identity_relevant)
    .map((row) => `${row.code}=${row.normalized_value || ''}`);
  const key = `${product.product_type_id}::${parts.join('|')}`;
  if (key !== product.canonical_identity_key) {
    await query(
      'UPDATE products SET canonical_identity_key = $2, updated_at = NOW() WHERE id = $1',
      [productId, key],
    );
  }
}

async function ensureClass(token, existing) {
  if (!existing) {
    if (DRY_RUN) {
      console.log('dry-run CREATE', CLASS_CODE, CLASS_ATTRIBUTE.nameFa);
      return existing;
    }
    const created = (await req('POST', '/attribute-definitions', token, CLASS_ATTRIBUTE)).attributeDefinition;
    console.log('created', CLASS_CODE);
    return created;
  }
  if (DRY_RUN) {
    console.log('dry-run PATCH', CLASS_CODE, 'activate + union catalog');
    return existing;
  }
  return (await req('PATCH', `/attribute-definitions/${existing.id}`, token, {
    isActive: true,
    nameFa: CLASS_ATTRIBUTE.nameFa,
    allowedValues: CLASS_ATTRIBUTE.allowedValues,
  })).attributeDefinition;
}

async function ensureLengthMm(token, existing, mmId) {
  const body = {
    ...LENGTH_MM_ATTRIBUTE,
    minValue: FASTENER_LENGTH_MIN_MM,
    maxValue: FASTENER_LENGTH_MAX_MM,
  };
  if (mmId) body.uomId = mmId;
  if (!existing) {
    if (DRY_RUN) {
      console.log('dry-run CREATE', LENGTH_MM_CODE, body.nameFa, 'DECIMAL UOM MM', mmId || '(missing)');
      return existing;
    }
    try {
      const created = (await req('POST', '/attribute-definitions', token, body)).attributeDefinition;
      console.log('created', LENGTH_MM_CODE, created.skuCode);
      return created;
    } catch (err) {
      if (!String(err.message || '').includes('409')) throw err;
      const fallback = { ...body };
      delete fallback.skuCode;
      fallback.latinName = 'Length MM';
      const created = (await req('POST', '/attribute-definitions', token, fallback)).attributeDefinition;
      console.log('created', LENGTH_MM_CODE, 'sku-fallback', created.skuCode);
      return created;
    }
  }
  const patch = {
    isActive: true,
    nameFa: LENGTH_MM_ATTRIBUTE.nameFa,
    minValue: FASTENER_LENGTH_MIN_MM,
    maxValue: FASTENER_LENGTH_MAX_MM,
  };
  if (mmId && existing.uomId !== mmId) patch.uomId = mmId;
  if (DRY_RUN) {
    console.log('dry-run PATCH', LENGTH_MM_CODE, patch);
    return existing;
  }
  return (await req('PATCH', `/attribute-definitions/${existing.id}`, token, patch)).attributeDefinition;
}

async function main() {
  if (DRY_RUN) console.log('=== DRY-RUN (no writes) ===');

  for (const row of IDENTITY_COPY) {
    const mapped = ATTRIBUTE_DEDUP_MAP.find((item) => item.from === row.from);
    if (!mapped || mapped.to !== row.to) {
      throw new Error(`IDENTITY_COPY mismatch for ${row.from}`);
    }
  }

  const login = await req('POST', '/auth/login', null, {
    username: process.env.JARIAN_SEED_USER || 'admin',
    password: process.env.JARIAN_SEED_PASSWORD || 'Admin123!',
  });
  const token = login.accessToken || login.token;
  if (!token) throw new Error('login returned no token');

  const productsBefore = (await query('SELECT COUNT(*)::int AS n FROM products')).rows[0].n;
  const before = await inventory(token);
  const activeBefore = before.defs.filter((row) => row.isActive !== false).length;
  console.log('products', productsBefore);
  console.log('active-attribute-definitions-before', activeBefore);
  console.log('before', Object.fromEntries(
    TRACKED_CODES.map((code) => [code, before.counts[code] || null]),
  ));

  const uoms = (await req('GET', '/uom?includeInactive=true', token)).items || [];
  const mm = millimetreUom(uoms, before.defs.find((row) => row.code === 'fastener_length'));
  if (!mm?.id) {
    throw new Error('UOM MM (uom_mm) not found — length_mm requires millimetre UOM, not mill-sheet-only guesswork');
  }
  if (mm.code !== 'MM') {
    throw new Error(`refusing non-MM UOM ${mm.code}/${mm.id} for length_mm`);
  }
  console.log('uom-mm', mm.id, mm.code, mm.nameFa);

  await ensureClass(token, before.defs.find((row) => row.code === CLASS_CODE));
  await ensureLengthMm(token, before.defs.find((row) => row.code === LENGTH_MM_CODE), mm.id);

  const defsNow = (await req('GET', '/attribute-definitions?includeInactive=true', token)).items || [];
  const byCode = new Map(defsNow.map((row) => [row.code, row]));

  const kind = await mergeCatalog(
    token,
    byCode.get(KIND_CODE),
    [...KIND_EXTRA_OPTIONS, ...FRAME_PROFILE_MODEL_OPTIONS],
  );
  if (kind) byCode.set(KIND_CODE, kind);

  const types = (await req('GET', '/product-taxonomy/types?includeInactive=true', token)).items || [];
  const typeByName = new Map(types.map((row) => [row.name, row]));
  const millNames = new Set(millSheetTypeNames());

  for (const type of types) {
    const schema = (await req(
      'GET',
      `/attribute-definitions/schema/${type.id}?includeInactive=true`,
      token,
    )).schema || [];
    const supply = bindingOf(schema, SUPPLY_FORM_CODE);
    const emptyOverride = !supply?.binding?.overrideAllowedValues?.length;
    const millType = millNames.has(type.name);
    if (supply?.binding?.id && emptyOverride && supply.binding.isActive !== false) {
      if (DRY_RUN) {
        console.log('dry-run lock-supply-form', type.name, millType ? 'mill-sheet' : 'shared-empty-override');
      } else {
        await req('PATCH', `/attribute-definitions/bindings/${supply.binding.id}`, token, {
          overrideAllowedValues: [...MILL_SUPPLY_FORM_VALUES],
        });
        console.log('lock-supply-form', type.name);
      }
    }
  }

  const supply = await mergeCatalog(token, byCode.get(SUPPLY_FORM_CODE), SUPPLY_FORM_EXTRA_OPTIONS);
  if (supply) byCode.set(SUPPLY_FORM_CODE, supply);

  const branch = byCode.get(SIZE_BRANCH_CODE);
  if (branch && branch.nameFa !== SIZE_BRANCH_NAME_FA) {
    if (DRY_RUN) {
      console.log('dry-run rename', SIZE_BRANCH_CODE, branch.nameFa, '→', SIZE_BRANCH_NAME_FA);
    } else {
      await req('PATCH', `/attribute-definitions/${branch.id}`, token, { nameFa: SIZE_BRANCH_NAME_FA });
    }
  }

  for (const row of IDENTITY_COPY) {
    const fromDef = byCode.get(row.from);
    const toDef = byCode.get(row.to);
    if (fromDef && toDef) {
      const copied = await copyValues(fromDef.id, toDef.id);
      console.log(DRY_RUN ? 'dry-run copy-values' : 'copy-values', row.from, '→', row.to, copied, 'expected', row.expected);
    } else {
      console.log('skip-copy', row.from, '→', row.to, !fromDef ? 'missing-from' : 'missing-to');
    }
  }

  for (const from of DEACTIVATE_AFTER_MIGRATE) {
    const fromDef = byCode.get(from);
    if (!fromDef) continue;
    await deleteAllowed(fromDef.id);
    const deleted = await deleteValues(fromDef.id);
    console.log(DRY_RUN ? 'dry-run delete-from-values' : 'delete-from-values', from, deleted);
  }

  const plans = [
    ...SEAMLESS_WELDED_FITTING_TYPE_NAMES.map((name) => ({
      name,
      plan: () => seamlessWeldedFittingBindingPlan(name),
      deactivate: ['size_run', 'size_large', 'size_small'],
    })),
    ...FORGED_FITTING_TYPE_NAMES.map((name) => ({
      name,
      plan: () => forgedFittingBindingPlan(name),
      deactivate: ['forged_class', 'elbow_angle', 'olet_style', 'size_run', 'size_large', 'size_small'],
    })),
    ...THREADED_FITTING_TYPE_NAMES.map((name) => ({
      name,
      plan: () => threadedFittingBindingPlan(name),
      deactivate: ['threaded_class', 'elbow_angle', 'size_run', 'size_large', 'size_small'],
    })),
    ...FLANGE_TYPE_NAMES.map((name) => ({
      name,
      plan: () => flangeBindingPlan(name),
      deactivate: ['flange_class', 'flange_facing'],
    })),
    ...FASTENER_TYPE_NAMES.map((name) => ({
      name,
      plan: () => fastenerBindingPlan(name),
      deactivate: ['fastener_length', 'coating', 'tooth_style', 'sheet_length'],
    })),
    {
      name: FOOTBOARD_TYPE_NAME,
      plan: () => russianWoodBindingPlan(FOOTBOARD_TYPE_NAME),
      deactivate: FOOTBOARD_DEACTIVATE_CODES,
    },
    ...PLYWOOD_TYPE_NAMES.map((name) => ({
      name,
      plan: () => russianWoodBindingPlan(name),
      deactivate: PLYWOOD_DEACTIVATE_CODES,
    })),
    {
      name: FRAME_PROFILE_TYPE_NAME,
      plan: () => Object.freeze([
        Object.freeze({
          code: KIND_CODE,
          isRequired: true,
          valueScope: 'PRODUCT',
          sortOrder: 5,
          overrideAllowedValues: FRAME_PROFILE_MODEL_OPTIONS.map((row) => row.value),
        }),
      ]),
      deactivate: ['frame_model'],
    },
    {
      name: 'میلگرد آلیاژی',
      plan: () => Object.freeze([
        Object.freeze({
          code: SUPPLY_FORM_CODE,
          isRequired: false,
          valueScope: 'TRANSACTION',
          sortOrder: 40,
          overrideDefaultValue: 'پولیش شده',
          overrideAllowedValues: ['تراش‌خورده', 'پولیش شده', 'دو پولیش', 'کششی'],
        }),
      ]),
      deactivate: ['surface_alloy'],
    },
  ];

  for (const row of plans) {
    const type = typeByName.get(row.name) || types.find((item) => item.name === row.name
      || item.name === FLANGE_TYPE_NAME_ALIASES[row.name]
      || FLANGE_TYPE_NAME_ALIASES[item.name] === row.name);
    if (!type) {
      console.log('skip-missing-type', row.name);
      continue;
    }
    const plan = row.plan();
    if (FASTENER_TYPE_NAMES.includes(row.name)) {
      const codes = plan.map((item) => item.code);
      if (codes.includes('sheet_length')) {
        throw new Error(`${row.name} fastener plan bound sheet_length`);
      }
      if (codes.includes('fastener_length')) {
        throw new Error(`${row.name} fastener plan still bound fastener_length`);
      }
    }
    await applyPlan(token, type, plan);
    await deactivateBindings(token, type.id, row.deactivate);
  }

  for (const alias of Object.keys(FLANGE_TYPE_NAME_ALIASES)) {
    const type = types.find((row) => row.name === alias);
    if (!type) continue;
    const next = FLANGE_TYPE_NAME_ALIASES[alias];
    if (DRY_RUN) {
      console.log('dry-run rename-type', alias, '→', next);
      continue;
    }
    await req('PATCH', `/product-taxonomy/types/${type.id}`, token, {
      name: next,
      nameLatin: FLANGE_TYPE_LATIN_BY_NAME[next],
    });
    console.log('rename-type', alias, '→', next);
  }
  const typesAfterRename = DRY_RUN
    ? types
    : (await req('GET', '/product-taxonomy/types?includeInactive=true', token)).items || [];
  for (const [name, latin] of Object.entries(FLANGE_TYPE_LATIN_BY_NAME)) {
    const type = typesAfterRename.find((row) => row.name === name)
      || types.find((row) => row.name === name);
    if (!type) continue;
    if (type.nameLatin !== latin) {
      if (DRY_RUN) {
        console.log('dry-run latin', name, type.nameLatin, '→', latin);
        continue;
      }
      await req('PATCH', `/product-taxonomy/types/${type.id}`, token, { nameLatin: latin });
      console.log('latin', name, latin);
    }
  }

  const migratedProducts = await query(
    `SELECT DISTINCT p.id
     FROM products p
     JOIN product_types pt ON pt.id = p.product_type_id
     WHERE pt.name IN (
       'تخته زیرپایی روسی',
       'تخته چندلایه معمولی','تخته چندلایه ضد رطوبت','تخته چندلایه ضد آب','تخته چندلایه لاکی',
       'پروفیل چهارچوب'
     )`,
  );
  if (DRY_RUN) {
    console.log('dry-run rebuild-identity', migratedProducts.rows.length);
  } else {
    for (const row of migratedProducts.rows) {
      await rebuildIdentity(row.id);
    }
  }

  for (const name of [FOOTBOARD_TYPE_NAME, ...PLYWOOD_TYPE_NAMES]) {
    const type = typeByName.get(name);
    if (!type) continue;
    const schema = (await req('GET', `/attribute-definitions/schema/${type.id}`, token)).schema || [];
    if (DRY_RUN) {
      console.log('dry-run displayNameRule', name);
      continue;
    }
    if (isFootboardType(name)) {
      await req('PATCH', `/product-taxonomy/types/${type.id}`, token, {
        displayNameRule: footboardDisplayNameRule({
          thicknessId: bindingOf(schema, 'board_thickness_cm')?.definition?.id,
          widthId: bindingOf(schema, 'board_width_cm')?.definition?.id,
          lengthId: bindingOf(schema, 'length')?.definition?.id,
        }),
      });
    } else if (isPlywoodType(name)) {
      await req('PATCH', `/product-taxonomy/types/${type.id}`, token, {
        displayNameRule: plywoodDisplayNameRule({
          thicknessId: bindingOf(schema, 'thickness')?.definition?.id,
          widthId: bindingOf(schema, 'width')?.definition?.id,
          heightId: bindingOf(schema, 'height')?.definition?.id,
        }),
      });
    }
  }

  const afterDefs = (await req('GET', '/attribute-definitions?includeInactive=true', token)).items || [];
  for (const code of DEACTIVATE_AFTER_MIGRATE) {
    const def = afterDefs.find((row) => row.code === code);
    if (!def) continue;
    const bind = await query(
      'SELECT COUNT(*)::int AS n FROM product_type_attributes WHERE attribute_definition_id = $1 AND is_active = true',
      [def.id],
    );
    const stored = await query(
      'SELECT COUNT(*)::int AS n FROM product_attribute_values WHERE attribute_definition_id = $1',
      [def.id],
    );
    if (DRY_RUN) {
      console.log('dry-run deactivate-def', code, 'bindings', bind.rows[0].n, 'stored', stored.rows[0].n);
      continue;
    }
    if (bind.rows[0].n === 0 && stored.rows[0].n === 0) {
      try {
        await req('DELETE', `/attribute-definitions/${def.id}`, token);
        console.log('hard-delete', code);
      } catch (err) {
        await req('PATCH', `/attribute-definitions/${def.id}`, token, { isActive: false });
        console.log('deactivate-def', code, String(err.message || '').slice(0, 120));
      }
    } else {
      await req('PATCH', `/attribute-definitions/${def.id}`, token, { isActive: false });
      console.log('deactivate-def-in-use', code, bind.rows[0].n, stored.rows[0].n);
    }
  }

  const productsAfter = (await query('SELECT COUNT(*)::int AS n FROM products')).rows[0].n;
  if (productsAfter !== productsBefore) {
    throw new Error(`Product count changed ${productsBefore} → ${productsAfter} — migrate must not delete Products`);
  }

  const after = DRY_RUN ? before : await inventory(token);
  const activeAfter = after.defs.filter((row) => row.isActive !== false).length;
  console.log('products-unchanged', productsAfter);
  console.log('active-attribute-definitions-after', DRY_RUN ? `${activeBefore} (dry-run)` : activeAfter);
  console.log('after', Object.fromEntries(
    TRACKED_CODES.map((code) => [code, after.counts[code] || null]),
  ));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => pool.end());
