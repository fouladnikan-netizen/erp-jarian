#!/usr/bin/env node
/**
 * Migrate contact_persons → contacts + company_contact_relationships (DDL-26.4).
 * Safe: no name-only merges across companies; one Contact row per distinct mobile or per person row.
 *
 * Usage:
 *   node backend/scripts/migrate-contact-persons.js           # dry-run (default)
 *   node backend/scripts/migrate-contact-persons.js --apply
 */
import { pool } from '../src/db/pool.js';
import { newEntityId } from '../src/lib/ids.js';
import {
  normalizePersonName,
  normalizeMobile,
} from '../src/domain/identity/normalize.js';

const apply = process.argv.includes('--apply');

async function main() {
  const persons = await pool.query(`
    SELECT cp.* FROM contact_persons cp
    WHERE cp.migrated_contact_id IS NULL
    ORDER BY cp.company_id, cp.created_at
  `);

  let createdContacts = 0;
  let linked = 0;
  let skipped = 0;

  const client = await pool.connect();
  try {
    if (apply) await client.query('BEGIN');

    for (const row of persons.rows) {
      const mobileNorm = row.mobile ? normalizeMobile(row.mobile) : null;
      let contactId = null;

      if (mobileNorm?.ok) {
        const existing = await client.query(
          `SELECT id FROM contacts WHERE mobile_normalized = $1 AND deleted_at IS NULL LIMIT 1`,
          [mobileNorm.normalized],
        );
        contactId = existing.rows[0]?.id || null;
      }

      if (!contactId) {
        contactId = newEntityId('ct');
        const fields = {
          fullName: row.full_name,
          mobile: mobileNorm?.ok ? mobileNorm.mobile : row.mobile,
          mobileNormalized: mobileNorm?.ok ? mobileNorm.normalized : null,
          fullNameNormalized: normalizePersonName(row.full_name),
        };
        if (apply) {
          await client.query(
            `INSERT INTO contacts (id, full_name, mobile, mobile_normalized, full_name_normalized, payload)
             VALUES ($1,$2,$3,$4,$5,'{}'::jsonb)`,
            [contactId, fields.fullName, fields.mobile, fields.mobileNormalized, fields.fullNameNormalized],
          );
        }
        createdContacts += 1;
      } else {
        skipped += 1;
      }

      const relId = newEntityId('ccr');
      const isPrimary = Boolean(row.payload?.isPrimary);
      if (apply) {
        const dup = await client.query(
          `SELECT id FROM company_contact_relationships
           WHERE company_id = $1 AND contact_id = $2 AND ended_at IS NULL LIMIT 1`,
          [row.company_id, contactId],
        );
        if (!dup.rows[0]) {
          if (isPrimary) {
            await client.query(
              `UPDATE company_contact_relationships SET is_primary = FALSE
               WHERE company_id = $1 AND ended_at IS NULL`,
              [row.company_id],
            );
          }
          await client.query(
            `INSERT INTO company_contact_relationships (
              id, company_id, contact_id, role_title, is_primary, payload
            ) VALUES ($1,$2,$3,$4,$5,$6::jsonb)`,
            [relId, row.company_id, contactId, row.role_title, isPrimary, JSON.stringify(row.payload || {})],
          );
          linked += 1;
        }
        await client.query(
          `UPDATE contact_persons SET migrated_contact_id = $2, migrated_relationship_id = $3 WHERE id = $1`,
          [row.id, contactId, relId],
        );
      } else {
        linked += 1;
      }
    }

    if (apply) await client.query('COMMIT');
  } catch (err) {
    if (apply) await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  console.log(`[migrate-contact-persons] mode=${apply ? 'APPLY' : 'DRY_RUN'} rows=${persons.rowCount} newContacts=${createdContacts} links=${linked} reusedContacts=${skipped}`);
  await pool.end();
}

main().catch((err) => {
  console.error('[migrate-contact-persons] failed', err);
  process.exit(1);
});
