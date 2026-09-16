#!/usr/bin/env node
/**
 * Restore carbon-steel Type display-name rules, mill-brand allow-lists,
 * count/sales defaults, and copy those units onto Products that have none.
 *
 * Safe to re-run. Does not overwrite an existing display-name rule.
 * Does not invent Product.brandId (brand on SKU was never seeded).
 *
 *   node backend/scripts/restore-steel-catalog-defaults.js
 */
import { pool, query } from '../src/db/pool.js';
import { config } from '../src/config.js';
import { hasDisplayNameRule } from '../src/domain/productMaster/displayNameRule.js';
import {
  STEEL_TYPE_OFFER_UNITS,
  resolveTypeName,
} from '../src/domain/productMaster/steelOfferUnits.js';
import { millSheetTypeNames } from '../src/domain/productMaster/sheetMillLength.js';
import { frameProfileDisplayNameRule } from '../src/domain/productMaster/frameProfileCatalog.js';
import { zedProfileDisplayNameRule } from '../src/domain/productMaster/zedProfileCatalog.js';
import { seedSteelOfferUnits } from '../src/db/seedSteelOfferUnits.js';
import { seedSteelBrands } from '../src/db/seedSteelBrands.js';
import { seedSheetMillLength } from '../src/db/seedSheetMillLength.js';
import * as taxonomyService from '../src/services/productTaxonomyService.js';
import * as attrService from '../src/services/attributeDefinitionService.js';

const STEEL_GROUP_NAME = 'مقاطع فولادی';

function bindingOf(schema, code) {
  return (schema || []).find((entry) => (
    entry.definition?.code === code && entry.binding?.isActive !== false
  )) || null;
}

function attrToken(entry, { includeLabel = false, includeUnit = true } = {}) {
  if (!entry?.definition?.id) return null;
  return {
    sourceType: 'attribute',
    attributeId: entry.definition.id,
    includeLabel,
    includeUnit,
  };
}

function countLiteral(countUnitFa) {
  if (countUnitFa === 'برگ') return { sourceType: 'literal', literalId: 'sheet' };
  if (countUnitFa === 'شاخه') return { sourceType: 'literal', literalId: 'branch' };
  return null;
}

function txnLengthToken(schema) {
  const sheetLength = bindingOf(schema, 'sheet_length');
  if (sheetLength) return attrToken(sheetLength, { includeLabel: false, includeUnit: true });
  const length = bindingOf(schema, 'length');
  if (length?.binding?.valueScope === 'TRANSACTION') {
    return attrToken(length, { includeLabel: false, includeUnit: true });
  }
  return null;
}

function compactTokens(tokens) {
  return tokens.filter(Boolean);
}

function buildSteelDisplayNameRule(typeName, schema, countUnitFa) {
  const by = (code) => bindingOf(schema, code);
  const model = by('frame_model');
  if (model?.binding?.isRequired) {
    return frameProfileDisplayNameRule({
      modelId: model.definition.id,
      thicknessId: by('thickness')?.definition?.id,
      lengthId: by('length')?.definition?.id,
    });
  }

  if (typeName === 'پروفیل زد') {
    return zedProfileDisplayNameRule({
      heightId: by('height')?.definition?.id,
      thicknessId: by('thickness')?.definition?.id,
      lengthId: by('length')?.definition?.id,
    });
  }

  const widthProfile = by('width_profile');
  const heightProfile = by('length_profile');
  const thickness = by('thickness');
  const size = by('size_pipe') || by('size');
  const sch = by('sch');
  const grade = by('grade');
  const kind = by('kind');
  const ral = by('ral');
  const width = by('width');
  const stripWidth = by('strip_width');
  const leg1 = by('leg1');
  const leg2 = by('leg2');
  const height = by('height');
  const height2 = by('height_2');
  const tokens = [{ sourceType: 'type', includeLabel: false }];

  if (widthProfile && heightProfile && thickness) {
    tokens.push(
      attrToken(widthProfile, { includeLabel: false, includeUnit: false }),
      { sourceType: 'literal', literalId: 'times' },
      attrToken(heightProfile, { includeLabel: false, includeUnit: false }),
      attrToken(thickness, { includeLabel: true, includeUnit: true }),
      countLiteral(countUnitFa),
      txnLengthToken(schema),
    );
  } else if ((leg1 || height) && (leg2 || height2) && thickness) {
    tokens.push(
      attrToken(leg1 || height, { includeLabel: false, includeUnit: false }),
      { sourceType: 'literal', literalId: 'times' },
      attrToken(leg2 || height2, { includeLabel: false, includeUnit: false }),
      attrToken(thickness, { includeLabel: true, includeUnit: true }),
      countLiteral(countUnitFa),
      txnLengthToken(schema),
    );
  } else if (stripWidth && thickness) {
    tokens.push(
      attrToken(thickness, { includeLabel: true, includeUnit: true }),
      attrToken(stripWidth, { includeLabel: true, includeUnit: true }),
      countLiteral(countUnitFa),
      txnLengthToken(schema),
    );
  } else if (width && thickness && countUnitFa === 'برگ') {
    tokens.push(
      attrToken(thickness, { includeLabel: true, includeUnit: true }),
      attrToken(width, { includeLabel: true, includeUnit: false }),
      attrToken(ral, { includeLabel: false, includeUnit: false }),
      attrToken(by('sheet_length'), { includeLabel: true, includeUnit: true })
        || txnLengthToken(schema),
    );
  } else if (size && sch) {
    tokens.push(
      attrToken(size, { includeLabel: false, includeUnit: true }),
      attrToken(sch, { includeLabel: true, includeUnit: false }),
    );
  } else if (size && thickness?.binding?.isRequired) {
    tokens.push(
      attrToken(size, { includeLabel: false, includeUnit: true }),
      attrToken(thickness, { includeLabel: true, includeUnit: true }),
    );
  } else if (size) {
    if (kind?.binding?.isRequired) {
      tokens.push(attrToken(kind, { includeLabel: false, includeUnit: false }));
    }
    tokens.push(attrToken(size, { includeLabel: false, includeUnit: true }));
    if (grade) tokens.push(attrToken(grade, { includeLabel: false, includeUnit: false }));
    if (kind && !kind.binding?.isRequired) {
      tokens.push(attrToken(kind, { includeLabel: false, includeUnit: false }));
    }
    tokens.push(countLiteral(countUnitFa), txnLengthToken(schema));
  } else if (height && thickness) {
    tokens.push(
      attrToken(height, { includeLabel: true, includeUnit: true }),
      attrToken(thickness, { includeLabel: true, includeUnit: true }),
      countLiteral(countUnitFa),
      txnLengthToken(schema),
    );
  } else {
    const required = (schema || [])
      .filter((entry) => (
        entry.binding?.isActive !== false
        && entry.binding?.isRequired
        && entry.binding?.valueScope === 'PRODUCT'
      ))
      .sort((a, b) => (a.binding.sortOrder ?? 0) - (b.binding.sortOrder ?? 0));
    for (const entry of required) {
      const code = entry.definition?.code;
      const enumish = code === 'kind' || code === 'ral' || code === 'grade';
      tokens.push(attrToken(entry, {
        includeLabel: code === 'thickness',
        includeUnit: !enumish,
      }));
    }
    tokens.push(countLiteral(countUnitFa), txnLengthToken(schema));
  }

  return { separator: ' ', tokens: compactTokens(tokens) };
}

function countUnitForType(typeName) {
  const row = STEEL_TYPE_OFFER_UNITS.find((item) => resolveTypeName(item.typeName) === typeName);
  return row?.countUnitFa || 'شاخه';
}

async function carbonSteelTypes() {
  const tree = await taxonomyService.getTaxonomyTree({ includeInactive: true });
  const group = tree.find((item) => item.name === STEEL_GROUP_NAME);
  if (!group) throw new Error(`product group ${STEEL_GROUP_NAME} not found`);
  return group.categories.flatMap((category) => category.types || []);
}

async function restoreDisplayNameRules(actorUserId) {
  const types = await carbonSteelTypes();
  const millSheets = new Set(millSheetTypeNames());
  const applied = [];
  const skipped = [];
  for (const type of types) {
    if (hasDisplayNameRule(type.displayNameRule) && !millSheets.has(type.name)) {
      skipped.push(type.name);
      continue;
    }
    const schema = await attrService.getEffectiveSchema(type.id, { includeInactive: true });
    const rule = buildSteelDisplayNameRule(type.name, schema, countUnitForType(type.name));
    if (!rule?.tokens?.length) continue;
    await taxonomyService.updateType(type.id, { displayNameRule: rule }, actorUserId);
    applied.push(type.name);
    console.log('[restore] display-name-rule', type.name);
  }
  return { applied, skipped };
}

async function backfillProductOfferUnits() {
  const res = await query(`
    UPDATE products p
       SET base_uom_id = COALESCE(p.base_uom_id, t.default_count_unit_id),
           sales_uom_id = COALESCE(p.sales_uom_id, t.default_sales_unit_id),
           updated_at = NOW()
      FROM product_types t
     WHERE p.product_type_id = t.id
       AND (
         (p.base_uom_id IS NULL AND t.default_count_unit_id IS NOT NULL)
         OR (p.sales_uom_id IS NULL AND t.default_sales_unit_id IS NOT NULL)
       )
    RETURNING p.id
  `);
  return res.rowCount;
}

async function main() {
  if (config.nodeEnv === 'production') {
    console.error('[restore-steel-catalog-defaults] BLOCKED: refuse when NODE_ENV=production');
    process.exit(1);
  }
  const admin = await query(`SELECT id FROM users WHERE username = 'admin' LIMIT 1`);
  const actorUserId = admin.rows[0]?.id;
  if (!actorUserId) {
    console.error('[restore-steel-catalog-defaults] admin user missing');
    process.exit(1);
  }

  const units = await seedSteelOfferUnits(actorUserId);
  console.log('[restore] offer units', units.updated, 'missing', units.missingTypes);

  const brands = await seedSteelBrands(actorUserId);
  console.log('[restore] brands created', brands.created, 'bound types', brands.boundTypes.length, 'missing', brands.missingTypes);

  const names = await restoreDisplayNameRules(actorUserId);
  console.log('[restore] display-name rules applied', names.applied.length, 'kept', names.skipped.length);

  const mill = await seedSheetMillLength(actorUserId);
  console.log('[restore] mill-sheet length bound', mill.bound, 'skipped', mill.skipped);

  const products = await backfillProductOfferUnits();
  console.log('[restore] products copied type units', products);
}

main()
  .catch((err) => {
    console.error('[restore-steel-catalog-defaults] FAILED', err);
    process.exit(1);
  })
  .finally(() => pool.end());
