#!/usr/bin/env node
/**
 * Strip leftover optional PRODUCT kind values that were auto-filled from a
 * Type display default (DDL-55). Idempotent. Does not rewrite SKU identity.
 *
 *   node backend/scripts/heal-cleared-kind-defaults.js
 */
import { pool, query } from '../src/db/pool.js';
import { config } from '../src/config.js';
import * as taxonomyService from '../src/services/productTaxonomyService.js';
import * as attrService from '../src/services/attributeDefinitionService.js';
import { stripStoredOptionalDefault } from '../src/services/productService.js';

const TYPE_NAMES = ['ورق آجدار فولادی', 'تسمه فولادی'];
const PREVIOUS_DEFAULT = 'فابریک';

async function main() {
  if (config.nodeEnv === 'production') {
    console.error('[heal-cleared-kind-defaults] BLOCKED: refuse when NODE_ENV=production');
    process.exit(1);
  }
  const admin = await query(`SELECT id FROM users WHERE username = 'admin' LIMIT 1`);
  const actorUserId = admin.rows[0]?.id;
  if (!actorUserId) {
    console.error('[heal-cleared-kind-defaults] admin user missing — run npm run seed first');
    process.exit(1);
  }
  const types = await taxonomyService.listTypes({ includeInactive: true });
  const results = [];
  for (const name of TYPE_NAMES) {
    const type = types.find((row) => row.name === name);
    if (!type) continue;
    const schema = await attrService.getEffectiveSchema(type.id, { includeInactive: true });
    const kind = schema.find((entry) => entry.definition?.code === 'kind');
    if (!kind?.definition?.id) continue;
    if (kind.binding?.overrideDefaultValue) {
      results.push({ type: name, skipped: 'binding default still set' });
      continue;
    }
    const healed = await stripStoredOptionalDefault({
      productTypeId: type.id,
      attributeDefinitionId: kind.definition.id,
      previousValue: PREVIOUS_DEFAULT,
      actorUserId,
    });
    results.push({ type: name, ...healed });
  }
  console.log('[heal-cleared-kind-defaults]', JSON.stringify(results, null, 2));
}

main()
  .catch((err) => {
    console.error('[heal-cleared-kind-defaults] FAILED', err);
    process.exit(1);
  })
  .finally(() => pool.end());
