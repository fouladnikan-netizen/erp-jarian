/**
 * Atomic 2-digit taxonomy code allocation (DDL-24b, hardening pass DDL-24i).
 * Mirrors the INSERT..ON CONFLICT..RETURNING concurrency-safe counter
 * pattern already proven by correspondence_number_counters (DDL-23a) —
 * never SELECT MAX + client compute.
 *
 * EXPLICIT v1 CONSTRAINT: each scope (one Group's children, one Category's
 * children, one Product Type's SKU variants) is capped at 99 — a real,
 * intentional limit of the 2-digit GG/CC/TT/VV SKU segment width, not an
 * accident. This is never silently truncated or wrapped back to 00/01 —
 * the 100th allocation attempt for any scope always throws
 * TAXONOMY_CODE_EXHAUSTED (409), and that is a signal to widen the SKU
 * segment in a future DDL, not a bug to "fix" by reusing/wrapping codes.
 * Verified safe under concurrency at 1-2-remaining-codes ceilings by
 * backend/src/__tests__/product-master-taxonomy-ceiling.test.js.
 */
import { appError } from '../../lib/errors.js';

const MAX_TWO_DIGIT = 99;

export function pad2(n) {
  return String(n).padStart(2, '0');
}

/**
 * Allocate the next 2-digit code for a given scope ('GROUP', 'CATEGORY:<groupId>',
 * 'TYPE:<categoryId>'). Throws a clear, reportable error instead of silently
 * wrapping past 99 (product contract: "report scalability issue rather than
 * blindly enforcing the format").
 */
export async function allocateTaxonomyCode(client, scope) {
  const res = await client.query(
    `INSERT INTO product_taxonomy_code_counters (scope, next_seq)
     VALUES ($1, 2)
     ON CONFLICT (scope) DO UPDATE SET next_seq = product_taxonomy_code_counters.next_seq + 1, updated_at = NOW()
     RETURNING next_seq - 1 AS allocated`,
    [scope],
  );
  const allocated = res.rows[0].allocated;
  if (allocated > MAX_TWO_DIGIT) {
    throw appError(
      'TAXONOMY_CODE_EXHAUSTED',
      `ظرفیت کد دورقمی این سطح طبقه‌بندی (حداکثر ۹۹) تمام شده است. این یک محدودیت واقعی مقیاس‌پذیری است و باید طراحی مجدد شود (طرح SKU جدید یا افزایش طول کد).`,
      409,
      { scope, allocated },
    );
  }
  return pad2(allocated);
}
