#!/usr/bin/env node
/**
 * Idempotent catalog load for all operator pipe Types.
 * Does not rewrite Type identity/required/scope.
 *
 *   node backend/scripts/seed-all-pipe-products.js
 */
import { API_PIPE_TYPE_NAME, apiPipeIdentityRows } from '../src/domain/productMaster/apiPipeCatalog.js';
import { GAS_TEST_PIPE_TYPE_NAME, gasTestPipeIdentityRows } from '../src/domain/productMaster/gasTestPipeCatalog.js';
import { WATER_TEST_PIPE_TYPE_NAME, waterTestPipeIdentityRows } from '../src/domain/productMaster/waterTestPipeCatalog.js';
import { GALVANIZED_PIPE_TYPE_NAME, galvanizedPipeIdentityRows } from '../src/domain/productMaster/galvanizedPipeCatalog.js';
import { WELL_CASING_TYPE_NAME, wellCasingPipeIdentityRows } from '../src/domain/productMaster/wellCasingPipeCatalog.js';
import { SPIRAL_PIPE_TYPE_NAME, spiralPipeIdentityRows } from '../src/domain/productMaster/spiralPipeCatalog.js';
import { SCAFFOLD_PIPE_TYPE_NAME, scaffoldPipeIdentityRows } from '../src/domain/productMaster/scaffoldPipeCatalog.js';
import { WELDED_PIPE_TYPE_NAME, weldedPipeIdentityRows } from '../src/domain/productMaster/weldedPipeCatalog.js';
import { SEAMLESS_PIPE_TYPE_NAME, seamlessPipeIdentityRows } from '../src/domain/productMaster/seamlessPipeCatalog.js';
import {
  login,
  seedPipeCatalog,
  SIZE_THICKNESS_DISPLAY,
  sizeThicknessFromRow,
} from './lib/seedPipeCatalog.js';

const SIZE_THICKNESS_TYPES = [
  { typeName: GAS_TEST_PIPE_TYPE_NAME, rows: gasTestPipeIdentityRows() },
  { typeName: API_PIPE_TYPE_NAME, rows: apiPipeIdentityRows() },
  { typeName: WATER_TEST_PIPE_TYPE_NAME, rows: waterTestPipeIdentityRows() },
  { typeName: GALVANIZED_PIPE_TYPE_NAME, rows: galvanizedPipeIdentityRows() },
  { typeName: WELL_CASING_TYPE_NAME, rows: wellCasingPipeIdentityRows() },
  { typeName: SPIRAL_PIPE_TYPE_NAME, rows: spiralPipeIdentityRows() },
  { typeName: WELDED_PIPE_TYPE_NAME, rows: weldedPipeIdentityRows() },
];

async function main() {
  const token = await login();
  const summaries = [];

  for (const spec of SIZE_THICKNESS_TYPES) {
    summaries.push(await seedPipeCatalog(token, {
      ...spec,
      identityFromRow: sizeThicknessFromRow,
      display: SIZE_THICKNESS_DISPLAY,
    }));
  }

  summaries.push(await seedPipeCatalog(token, {
    typeName: SCAFFOLD_PIPE_TYPE_NAME,
    rows: scaffoldPipeIdentityRows(),
    identityFromRow: (row) => ({ thickness: row.thickness }),
    display: [{ code: 'thickness', includeLabel: true, includeUnit: true }],
    lengthMustBeTransaction: false,
    forbidStoredCodes: ['slot_type', 'grade'],
  }));

  summaries.push(await seedPipeCatalog(token, {
    typeName: SEAMLESS_PIPE_TYPE_NAME,
    rows: seamlessPipeIdentityRows(),
    identityFromRow: (row) => ({ size_pipe: row.size, sch: row.sch }),
    display: [
      { code: 'size_pipe', includeLabel: false, includeUnit: true },
      { code: 'sch', includeLabel: true, includeUnit: false },
    ],
  }));

  console.log('all-pipes', summaries.map((item) => ({
    type: item.type,
    afterCount: item.afterCount,
    created: item.created,
    reused: item.reused,
    samples: item.samples,
  })));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
