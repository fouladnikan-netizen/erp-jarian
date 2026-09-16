/**
 * Operator Product Master catalog snapshot (DDL-60).
 * PostgreSQL is SoR. This JSON file is the git-versioned copy for empty-DB
 * restore and GitHub transfer — not test fixtures.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PRODUCT_MASTER_SNAPSHOT_PATH = path.join(
  __dirname,
  'snapshots',
  'product-master.catalog.json',
);

export const PRODUCT_MASTER_TABLES = Object.freeze([
  'uom_registry',
  'uom_conversions',
  'attribute_definitions',
  'brands',
  'product_groups',
  'product_categories',
  'product_types',
  'product_type_attributes',
  'product_taxonomy_code_counters',
  'products',
  'product_attribute_values',
  'product_allowed_attribute_values',
  'product_sku_counters',
]);

const PRIMARY_KEYS = Object.freeze({
  uom_registry: ['id'],
  uom_conversions: ['id'],
  attribute_definitions: ['id'],
  brands: ['id'],
  product_groups: ['id'],
  product_categories: ['id'],
  product_types: ['id'],
  product_type_attributes: ['id'],
  product_taxonomy_code_counters: ['scope'],
  products: ['id'],
  product_attribute_values: ['id'],
  product_allowed_attribute_values: ['product_id', 'attribute_definition_id', 'value'],
  product_sku_counters: ['product_type_id'],
});

const USER_FK_COLUMNS = new Set(['created_by', 'updated_by', 'deactivated_by']);

function quoteIdent(name) {
  return `"${String(name).replaceAll('"', '""')}"`;
}

function jsonReplacer(_key, value) {
  if (typeof value === 'bigint') return Number(value);
  return value;
}

function serializeRow(row) {
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    if (value instanceof Date) out[key] = value.toISOString();
    else out[key] = value;
  }
  return out;
}

export async function snapshotProductMasterCatalog(queryFn) {
  const tables = {};
  const counts = {};
  for (const table of PRODUCT_MASTER_TABLES) {
    const res = await queryFn(`SELECT * FROM ${quoteIdent(table)}`);
    tables[table] = res.rows.map(serializeRow);
    counts[table] = tables[table].length;
  }
  const snapshot = {
    version: 1,
    kind: 'product-master-catalog',
    capturedAt: new Date().toISOString(),
    counts,
    tables,
  };
  await mkdir(path.dirname(PRODUCT_MASTER_SNAPSHOT_PATH), { recursive: true });
  await writeFile(
    PRODUCT_MASTER_SNAPSHOT_PATH,
    `${JSON.stringify(snapshot, jsonReplacer, 2)}\n`,
    'utf8',
  );
  return { path: PRODUCT_MASTER_SNAPSHOT_PATH, counts };
}

export async function loadProductMasterSnapshot() {
  const raw = await readFile(PRODUCT_MASTER_SNAPSHOT_PATH, 'utf8');
  return JSON.parse(raw);
}

function remapValue(column, value, actorUserId) {
  if (USER_FK_COLUMNS.has(column) && value) return actorUserId || null;
  return value;
}

async function upsertRows(client, table, rows, actorUserId) {
  if (!rows?.length) return 0;
  const pk = PRIMARY_KEYS[table];
  const cols = Object.keys(rows[0]);
  const pkSet = new Set(pk);
  const updates = cols.filter((col) => !pkSet.has(col));
  let written = 0;
  for (const row of rows) {
    const values = cols.map((col) => remapValue(col, row[col], actorUserId));
    const placeholders = cols.map((_, index) => `$${index + 1}`);
    const conflict = pk.map(quoteIdent).join(', ');
    const setSql = updates.length
      ? updates.map((col) => `${quoteIdent(col)} = EXCLUDED.${quoteIdent(col)}`).join(', ')
      : `${quoteIdent(pk[0])} = EXCLUDED.${quoteIdent(pk[0])}`;
    await client.query(
      `INSERT INTO ${quoteIdent(table)} (${cols.map(quoteIdent).join(', ')})
       VALUES (${placeholders.join(', ')})
       ON CONFLICT (${conflict}) DO UPDATE SET ${setSql}`,
      values,
    );
    written += 1;
  }
  return written;
}

export async function catalogIsEmpty(queryFn) {
  const groups = await queryFn('SELECT COUNT(*)::int AS n FROM product_groups');
  const products = await queryFn('SELECT COUNT(*)::int AS n FROM products');
  return groups.rows[0].n === 0 && products.rows[0].n === 0;
}

/**
 * Restore the git-versioned operator catalog.
 * Default: only when Product Master tables are empty.
 * JARIAN_REPLACE_PRODUCT_MASTER=YES wipes taxonomy/products then upserts.
 */
export async function restoreProductMasterCatalog(queryFn, withTransactionFn, actorUserId, {
  onlyIfEmpty = true,
} = {}) {
  let snapshot;
  try {
    snapshot = await loadProductMasterSnapshot();
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      return { restored: false, reason: 'snapshot-missing' };
    }
    throw err;
  }
  if (snapshot.kind !== 'product-master-catalog') {
    throw new Error('product-master snapshot kind is invalid');
  }
  const empty = await catalogIsEmpty(queryFn);
  const replace = String(process.env.JARIAN_REPLACE_PRODUCT_MASTER || '') === 'YES';
  if (onlyIfEmpty && !empty && !replace) {
    return { restored: false, reason: 'catalog-already-present', counts: snapshot.counts };
  }
  if (!empty && !replace) {
    return { restored: false, reason: 'refused-to-overwrite', counts: snapshot.counts };
  }

  const written = await withTransactionFn(async (client) => {
    if (replace && !empty) {
      await client.query(`
        DELETE FROM product_attribute_values;
        DELETE FROM product_allowed_attribute_values;
        DELETE FROM products;
        DELETE FROM product_sku_counters;
        DELETE FROM product_type_attributes;
        DELETE FROM product_types;
        DELETE FROM product_categories;
        DELETE FROM product_groups;
        DELETE FROM product_taxonomy_code_counters;
      `);
    }
    const counts = {};
    for (const table of PRODUCT_MASTER_TABLES) {
      counts[table] = await upsertRows(client, table, snapshot.tables[table] || [], actorUserId);
    }
    return counts;
  });

  return {
    restored: true,
    replaced: replace && !empty,
    capturedAt: snapshot.capturedAt,
    counts: written,
  };
}

export default {
  PRODUCT_MASTER_SNAPSHOT_PATH,
  PRODUCT_MASTER_TABLES,
  snapshotProductMasterCatalog,
  restoreProductMasterCatalog,
  catalogIsEmpty,
};
