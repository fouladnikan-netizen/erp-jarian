/**
 * Ad-hoc benchmark for Product Master Bulk Import (Task 1 hardening pass).
 * NOT part of the automated test suite — run manually:
 *   node scripts/bulk-import-benchmark.js [rowCounts...]
 *
 * Measures wall-clock time and DB query count for productBulkImportService
 * .runBulkImport(DRY_RUN) against fresh fixture taxonomy/brand/UOM data, so
 * before/after numbers can be compared across the N+1 fix.
 */
import { pool } from '../src/db/pool.js';
import * as productTaxonomyService from '../src/services/productTaxonomyService.js';
import * as attributeDefinitionService from '../src/services/attributeDefinitionService.js';
import * as bulkImportService from '../src/services/productBulkImportService.js';

const ACTOR = 'u_mt9ks4ql9b7t9r'; // seeded admin
const uniq = () => Math.random().toString(36).slice(2, 9);

let queryCount = 0;
const originalQuery = pool.query.bind(pool);
pool.query = (...args) => {
  queryCount += 1;
  return originalQuery(...args);
};

let sharedGroup = null;

async function setupFixture() {
  // Product Groups share ONE global 2-digit code counter (Task 3 — max 99
  // EVER, never reclaimed). Re-use a single Group across benchmark runs
  // instead of allocating a fresh one per call.
  if (!sharedGroup) sharedGroup = await productTaxonomyService.createGroup({ name: `گروه-bench-shared-${uniq()}` }, ACTOR);
  const group = sharedGroup;
  const category = await productTaxonomyService.createCategory({ groupId: group.id, name: `دسته-bench-${uniq()}` }, ACTOR);
  const type = await productTaxonomyService.createType({ categoryId: category.id, name: `نوع-bench-${uniq()}` }, ACTOR);
  const attr = await attributeDefinitionService.createDefinition(
    { code: `bench_attr_${uniq()}`, nameFa: 'ویژگی بنچمارک', dataType: 'DECIMAL' },
    ACTOR,
  );
  await attributeDefinitionService.bindAttributeToType(
    { productTypeId: type.id, attributeDefinitionId: attr.id, isRequired: true, isIdentityRelevant: true, isDisplayRelevant: true },
    ACTOR,
  );
  return { group, category, type, attr };
}

function buildRows(fixture, count) {
  const rows = [];
  for (let i = 0; i < count; i += 1) {
    rows.push({
      groupName: fixture.group.name,
      categoryName: fixture.category.name,
      typeName: fixture.type.name,
      attributes: { [fixture.attr.code]: 1000 + i }, // distinct identity per row -> no duplicate skipping
    });
  }
  return rows;
}

async function runOnce(rowCount, mode) {
  const fixture = await setupFixture();
  const rows = buildRows(fixture, rowCount);

  const queriesBefore = queryCount;
  const t0 = performance.now();
  const batch = await bulkImportService.runBulkImport({ mode, rows }, ACTOR);
  const t1 = performance.now();
  const queriesAfter = queryCount;

  const elapsedMs = t1 - t0;
  const queriesUsed = queriesAfter - queriesBefore;
  console.log(
    `[bench] rows=${rowCount} mode=${mode} elapsed=${elapsedMs.toFixed(1)}ms ` +
    `(${(elapsedMs / rowCount).toFixed(3)}ms/row) queries=${queriesUsed} ` +
    `(${(queriesUsed / rowCount).toFixed(3)}/row) accepted=${batch.acceptedRows} rejected=${batch.rejectedRows}`,
  );
  return { rowCount, elapsedMs, queriesUsed, acceptedRows: batch.acceptedRows, rejectedRows: batch.rejectedRows };
}

async function main() {
  const argCounts = process.argv.slice(2).map(Number).filter((n) => Number.isFinite(n) && n > 0);
  const counts = argCounts.length ? argCounts : [300, 1000];
  const mode = process.env.BENCH_MODE === 'APPLY' ? 'APPLY' : 'DRY_RUN';

  console.log(`[bench] mode=${mode} node=${process.version}`);
  const results = [];
  for (const count of counts) {
    results.push(await runOnce(count, mode));
  }

  console.log('\n[bench] summary (JSON):');
  console.log(JSON.stringify(results, null, 2));

  await pool.end();
}

main().catch((err) => {
  console.error('[bench] FAILED', err);
  process.exit(1);
});
